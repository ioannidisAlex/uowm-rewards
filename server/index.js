// UOWM Rewards — API server (sqlite3 edition)
require("dotenv").config();
const http       = require("http");
const url        = require("url");
const path       = require("path");
const sqlite3    = require("sqlite3").verbose();
const crypto     = require("crypto");
const blockchain = require("./blockchain");
blockchain.init();

// In-memory nonce store for MetaMask wallet verification.
// Each entry expires after 10 minutes so stale challenges can't be replayed.
const _nonces = new Map();
function issueNonce(studentId) {
  const nonce = crypto.randomBytes(16).toString("hex");
  _nonces.set(studentId, { nonce, expiresAt: Date.now() + 10 * 60 * 1000 });
  return nonce;
}
function consumeNonce(studentId, nonce) {
  const entry = _nonces.get(studentId);
  if (!entry) return false;
  _nonces.delete(studentId); // one-time use regardless of outcome
  if (Date.now() > entry.expiresAt) return false;
  return entry.nonce === nonce;
}

const DB_PATH = path.join(__dirname, "./db/uowm_rewards.db");
const db      = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error("DB open failed:", err.message); process.exit(1); }
});
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");
db.run(`CREATE TABLE IF NOT EXISTS scan_requests (
  request_id   TEXT NOT NULL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  lecture_id   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  awarded      INTEGER NOT NULL DEFAULT 0,
  points_after INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  resolved_at  TEXT
)`);

const POINTS_PER_SCAN = 50;

// ---------------------------------------------------------------------------
// Promise wrappers
// ---------------------------------------------------------------------------
const q  = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r)));
const qa = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const qr = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function(e) { e ? rej(e) : res(this); }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(tag, msg, extra = "") {
  console.log(`[${new Date().toISOString()}] [${tag}] ${msg}${extra ? " | " + JSON.stringify(extra) : ""}`);
}
function send(res, status, body) {
  const p = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(p),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(p);
}
function redirect(res, loc) {
  res.writeHead(302, { "Location": loc, "Access-Control-Allow-Origin": "*" });
  res.end();
}
async function readBody(req) {
  return new Promise((res) => {
    let raw = "";
    req.on("data", c => raw += c);
    req.on("end", () => { try { res(JSON.parse(raw)); } catch { res({}); } });
  });
}
const norm = id => (id || "").trim().toLowerCase();

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  try {
    // GET /health
    if (req.method === "GET" && pathname === "/health") {
      const r = await q("SELECT COUNT(*) AS n FROM students");
      return send(res, 200, { status: "ok", db: "sqlite3", students: r.n });
    }

    // POST /api/login
    if (req.method === "POST" && pathname === "/api/login") {
      const { studentId } = await readBody(req);
      const id = norm(studentId);
      if (!id) return send(res, 400, { message: "Student ID is required." });
      const s = await q("SELECT student_id, full_name, email, total_points, role FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 401, { message: "Unknown student ID." });
      log("LOGIN", "Logged in", { studentId: id, role: s.role });
      return send(res, 200, { token: id, studentId: id, name: s.full_name, points: s.total_points, role: s.role });
    }

    // GET /api/me
    if (req.method === "GET" && pathname === "/api/me") {
      const id = norm(query.studentId);
      if (!id) return send(res, 401, { message: "Not authenticated." });
      const s = await q("SELECT student_id, full_name, email, total_points, role FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 401, { message: "Not authenticated." });
      const history = await qa(`
        SELECT t.transaction_id, t.transaction_type, t.points, t.transaction_date,
               l.lecture_id, l.topic
        FROM token_transactions t
        LEFT JOIN attendance a ON a.attendance_id = t.attendance_id
        LEFT JOIN lectures   l ON l.lecture_id    = a.lecture_id
        WHERE t.student_id = ? ORDER BY t.created_at DESC LIMIT 50`, [id]);
      log("ME", "Profile fetched", { studentId: id });
      return send(res, 200, { studentId: s.student_id, name: s.full_name, email: s.email, points: s.total_points, role: s.role, history });
    }

    // POST /api/claim-reward
    if (req.method === "POST" && pathname === "/api/claim-reward") {
      const { studentId, code } = await readBody(req);
      const id        = norm(studentId);
      const lectureId = (code || "").trim().toUpperCase();
      const s = await q("SELECT student_id, total_points, wallet_address FROM students WHERE student_id = ?", [id]);
      if (!s)         return send(res, 401, { message: "Not authenticated." });
      if (!lectureId) return send(res, 400, { message: "Empty QR code." });
      const lec = await q("SELECT lecture_id, attendance_open FROM lectures WHERE lecture_id = ?", [lectureId]);
      if (!lec)               return send(res, 404, { message: `Lecture ${lectureId} not found.` });
      if (!lec.attendance_open) return send(res, 403, { message: "Attendance is closed." });
      const dup = await q("SELECT 1 FROM attendance WHERE student_id = ? AND lecture_id = ?", [id, lectureId]);
      if (dup) { log("CLAIM:DUP", "Duplicate", { id, lectureId }); return send(res, 409, { message: "Already checked in." }); }

      const ts    = Date.now();
      const attId = `ATT-${id}-${lectureId}-${ts}`;
      const txId  = `TX-${id}-${lectureId}-${ts}`;
      await qr("INSERT INTO attendance (attendance_id,lecture_id,student_id,attendance_date,check_in_time,status,base_points,counts_for_streak,token_created) VALUES (?,?,?,date('now'),datetime('now'),'Present',?,1,1)",
        [attId, lectureId, id, POINTS_PER_SCAN]);
      await qr("INSERT INTO token_transactions (transaction_id,student_id,attendance_id,transaction_type,points,transaction_date,status) VALUES (?,?,?,'Attendance',?,date('now'),'Confirmed')",
        [txId, id, attId, POINTS_PER_SCAN]);
      await qr("UPDATE students SET total_points = total_points + ? WHERE student_id = ?", [POINTS_PER_SCAN, id]);
      const updated = await q("SELECT total_points FROM students WHERE student_id = ?", [id]);
      log("CLAIM:OK", "Points awarded", { studentId: id, lectureId, awarded: POINTS_PER_SCAN, total: updated.total_points });

      // Mint on-chain — fire-and-forget, response is not delayed
      blockchain.awardOnChain(s.wallet_address, POINTS_PER_SCAN, lectureId).then((txHash) => {
        if (txHash) qr("UPDATE token_transactions SET blockchain_hash=? WHERE transaction_id=?", [txHash, txId]);
      });

      return send(res, 200, { awarded: POINTS_PER_SCAN, points: updated.total_points, message: `+${POINTS_PER_SCAN} points added` });
    }

    // GET /wallet/:studentId
    const walletMatch = pathname.match(/^\/wallet\/(.+)$/);
    if (req.method === "GET" && walletMatch) {
      const id = norm(walletMatch[1]);
      if (!id) return send(res, 400, { message: "Student ID is required." });
      const s = await q("SELECT student_id, full_name, email, total_points, role FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 404, { message: "Student not found." });
      const history = await qa(`
        SELECT t.transaction_id, t.transaction_type, t.points, t.transaction_date,
               l.lecture_id, l.topic
        FROM token_transactions t
        LEFT JOIN attendance a ON a.attendance_id = t.attendance_id
        LEFT JOIN lectures   l ON l.lecture_id    = a.lecture_id
        WHERE t.student_id = ? ORDER BY t.created_at DESC LIMIT 50`, [id]);
      log("WALLET", "Wallet fetched", { studentId: id });
      return send(res, 200, { studentId: s.student_id, name: s.full_name, email: s.email, points: s.total_points, role: s.role, history });
    }

    // GET /api/attendance?lectureId=LEC001
    if (req.method === "GET" && pathname === "/api/attendance") {
      const lectureId = (query.lectureId || "").trim().toUpperCase();
      if (!lectureId) return send(res, 400, { message: "lectureId required." });
      const lec = await q("SELECT lecture_id, topic, lecture_date FROM lectures WHERE lecture_id = ?", [lectureId]);
      if (!lec) return send(res, 404, { message: `Lecture ${lectureId} not found.` });
      const attendees = await qa(`
        SELECT a.student_id, s.full_name, a.check_in_time, a.base_points
        FROM attendance a
        JOIN students s ON s.student_id = a.student_id
        WHERE a.lecture_id = ?
        ORDER BY a.check_in_time ASC`, [lectureId]);
      log("ATTENDANCE", "Fetched", { lectureId, count: attendees.length });
      return send(res, 200, { lecture: lec, attendees });
    }

    // GET /api/admin/students — leaderboard
    if (req.method === "GET" && pathname === "/api/admin/students") {
      const rows = await qa(
        "SELECT student_id, full_name, total_points, role FROM students WHERE role = 'student' ORDER BY total_points DESC, full_name ASC"
      );
      log("ADMIN", "Students fetched");
      return send(res, 200, rows);
    }

    // GET /api/admin/transactions — all recent transactions
    if (req.method === "GET" && pathname === "/api/admin/transactions") {
      const rows = await qa(`
        SELECT t.transaction_id, t.student_id, s.full_name, t.transaction_type,
               t.points, t.transaction_date, l.lecture_id, l.topic
        FROM token_transactions t
        JOIN students s ON s.student_id = t.student_id
        LEFT JOIN attendance a ON a.attendance_id = t.attendance_id
        LEFT JOIN lectures   l ON l.lecture_id    = a.lecture_id
        ORDER BY t.created_at DESC LIMIT 200`);
      log("ADMIN", "Transactions fetched", { count: rows.length });
      return send(res, 200, rows);
    }

    // POST /api/scan-request — student submits a scan, creates pending approval
    if (req.method === "POST" && pathname === "/api/scan-request") {
      const { studentId, code } = await readBody(req);
      const id        = norm(studentId);
      const lectureId = (code || "").trim().toUpperCase();
      const s   = await q("SELECT student_id FROM students WHERE student_id = ?", [id]);
      if (!s)         return send(res, 401, { message: "Not authenticated." });
      if (!lectureId) return send(res, 400, { message: "Empty QR code." });
      const lec = await q("SELECT lecture_id, attendance_open FROM lectures WHERE lecture_id = ?", [lectureId]);
      if (!lec)               return send(res, 404, { message: `Lecture ${lectureId} not found.` });
      if (!lec.attendance_open) return send(res, 403, { message: "Attendance is closed." });
      const dup = await q("SELECT 1 FROM attendance WHERE student_id = ? AND lecture_id = ?", [id, lectureId]);
      if (dup) return send(res, 409, { message: "Already checked in." });
      const existing = await q("SELECT request_id FROM scan_requests WHERE student_id = ? AND lecture_id = ? AND status = 'pending'", [id, lectureId]);
      if (existing) return send(res, 409, { message: "Approval already pending." });
      const reqId = `REQ-${id}-${lectureId}-${Date.now()}`;
      await qr("INSERT INTO scan_requests (request_id,student_id,lecture_id) VALUES (?,?,?)", [reqId, id, lectureId]);
      log("SCAN:PENDING", "Awaiting approval", { studentId: id, lectureId });
      return send(res, 201, { requestId: reqId });
    }

    // GET /api/scan-requests/pending — teacher polls for pending requests
    if (req.method === "GET" && pathname === "/api/scan-requests/pending") {
      const rows = await qa(`
        SELECT r.request_id, r.student_id, s.full_name, r.lecture_id, l.topic, r.created_at
        FROM scan_requests r
        JOIN students s ON s.student_id = r.student_id
        JOIN lectures  l ON l.lecture_id  = r.lecture_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC`);
      return send(res, 200, rows);
    }

    // GET /api/scan-request/:id/status — student polls for their request status
    const scanStatusMatch = pathname.match(/^\/api\/scan-request\/(.+)\/status$/);
    if (req.method === "GET" && scanStatusMatch) {
      const reqId = decodeURIComponent(scanStatusMatch[1]);
      const r = await q("SELECT status, awarded, points_after FROM scan_requests WHERE request_id = ?", [reqId]);
      if (!r) return send(res, 404, { message: "Request not found." });
      return send(res, 200, { status: r.status, awarded: r.awarded || undefined, points: r.points_after || undefined });
    }

    // POST /api/scan-requests/:id/approve — teacher approves, awards points
    const approveMatch = pathname.match(/^\/api\/scan-requests\/(.+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      const reqId = decodeURIComponent(approveMatch[1]);
      const r = await q("SELECT request_id, student_id, lecture_id, status FROM scan_requests WHERE request_id = ?", [reqId]);
      if (!r)                    return send(res, 404, { message: "Request not found." });
      if (r.status !== "pending") return send(res, 409, { message: "Request already resolved." });
      const dup = await q("SELECT 1 FROM attendance WHERE student_id = ? AND lecture_id = ?", [r.student_id, r.lecture_id]);
      if (dup) {
        await qr("UPDATE scan_requests SET status='rejected', resolved_at=datetime('now') WHERE request_id=?", [reqId]);
        return send(res, 409, { message: "Student already checked in." });
      }
      const ts    = Date.now();
      const attId = `ATT-${r.student_id}-${r.lecture_id}-${ts}`;
      const txId  = `TX-${r.student_id}-${r.lecture_id}-${ts}`;
      await qr("INSERT INTO attendance (attendance_id,lecture_id,student_id,attendance_date,check_in_time,status,base_points,counts_for_streak,token_created) VALUES (?,?,?,date('now'),datetime('now'),'Present',?,1,1)",
        [attId, r.lecture_id, r.student_id, POINTS_PER_SCAN]);
      await qr("INSERT INTO token_transactions (transaction_id,student_id,attendance_id,transaction_type,points,transaction_date,status) VALUES (?,?,?,'Attendance',?,date('now'),'Confirmed')",
        [txId, r.student_id, attId, POINTS_PER_SCAN]);
      await qr("UPDATE students SET total_points = total_points + ? WHERE student_id = ?", [POINTS_PER_SCAN, r.student_id]);
      const updated  = await q("SELECT total_points FROM students WHERE student_id = ?", [r.student_id]);
      const student  = await q("SELECT wallet_address FROM students WHERE student_id = ?", [r.student_id]);
      await qr("UPDATE scan_requests SET status='approved', awarded=?, points_after=?, resolved_at=datetime('now') WHERE request_id=?",
        [POINTS_PER_SCAN, updated.total_points, reqId]);
      log("SCAN:APPROVED", "Points awarded via approval", { studentId: r.student_id, lectureId: r.lecture_id, awarded: POINTS_PER_SCAN, total: updated.total_points });

      // Mint on-chain — fire-and-forget
      blockchain.awardOnChain(student.wallet_address, POINTS_PER_SCAN, r.lecture_id).then((txHash) => {
        if (txHash) qr("UPDATE token_transactions SET blockchain_hash=? WHERE transaction_id=?", [txHash, txId]);
      });

      return send(res, 200, { awarded: POINTS_PER_SCAN, points: updated.total_points });
    }

    // POST /api/scan-requests/:id/reject — teacher rejects
    const rejectMatch = pathname.match(/^\/api\/scan-requests\/(.+)\/reject$/);
    if (req.method === "POST" && rejectMatch) {
      const reqId = decodeURIComponent(rejectMatch[1]);
      const r = await q("SELECT status FROM scan_requests WHERE request_id = ?", [reqId]);
      if (!r)                    return send(res, 404, { message: "Request not found." });
      if (r.status !== "pending") return send(res, 409, { message: "Request already resolved." });
      await qr("UPDATE scan_requests SET status='rejected', resolved_at=datetime('now') WHERE request_id=?", [reqId]);
      log("SCAN:REJECTED", "Scan rejected", { reqId });
      return send(res, 200, {});
    }

    // GET /api/wallet/nonce — step 1: client requests a one-time challenge to sign
    if (req.method === "GET" && pathname === "/api/wallet/nonce") {
      const id = norm(query.studentId);
      if (!id) return send(res, 400, { message: "studentId required." });
      const s = await q("SELECT student_id FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 404, { message: "Student not found." });
      const nonce   = issueNonce(id);
      const message = `Connect your wallet to UOWM Rewards.\nStudent: ${id}\nNonce: ${nonce}`;
      return send(res, 200, { nonce, message });
    }

    // POST /api/wallet — step 2: client sends address + MetaMask signature to prove ownership
    if (req.method === "POST" && pathname === "/api/wallet") {
      const { studentId, walletAddress, signature, nonce } = await readBody(req);
      const id = norm(studentId);
      if (!id) return send(res, 401, { message: "Not authenticated." });
      const { ethers } = require("ethers");
      if (!walletAddress || !ethers.isAddress(walletAddress))
        return send(res, 400, { message: "Invalid Ethereum address." });
      if (!signature || !nonce)
        return send(res, 400, { message: "signature and nonce are required." });
      const s = await q("SELECT student_id FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 401, { message: "Not authenticated." });
      if (!consumeNonce(id, nonce))
        return send(res, 400, { message: "Nonce invalid or expired. Request a new one." });
      const message = `Connect your wallet to UOWM Rewards.\nStudent: ${id}\nNonce: ${nonce}`;
      if (!blockchain.verifyWalletSignature(walletAddress, signature, message))
        return send(res, 401, { message: "Signature does not match wallet address." });
      await qr("UPDATE students SET wallet_address = ? WHERE student_id = ?", [walletAddress, id]);
      log("WALLET:VERIFIED", "Wallet ownership proved and registered", { studentId: id, walletAddress });
      return send(res, 200, { walletAddress });
    }

    // DELETE /api/wallet — student disconnects / removes their wallet
    if (req.method === "DELETE" && pathname === "/api/wallet") {
      const { studentId } = await readBody(req);
      const id = norm(studentId);
      if (!id) return send(res, 401, { message: "Not authenticated." });
      const s = await q("SELECT student_id FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 401, { message: "Not authenticated." });
      await qr("UPDATE students SET wallet_address = NULL WHERE student_id = ?", [id]);
      log("WALLET:REMOVED", "Wallet disconnected", { studentId: id });
      return send(res, 200, {});
    }

    // GET /api/wallet/:studentId — fetch a student's registered wallet + on-chain explorer link
    const walletRegMatch = pathname.match(/^\/api\/wallet\/(.+)$/);
    if (req.method === "GET" && walletRegMatch) {
      const id = norm(walletRegMatch[1]);
      const s = await q("SELECT wallet_address FROM students WHERE student_id = ?", [id]);
      if (!s) return send(res, 404, { message: "Student not found." });
      const network     = process.env.BLOCKCHAIN_NETWORK || "sepolia";
      const explorerUrl = s.wallet_address
        ? (network === "amoy"
            ? `https://amoy.polygonscan.com/address/${s.wallet_address}`
            : `https://sepolia.etherscan.io/address/${s.wallet_address}`)
        : null;
      return send(res, 200, { walletAddress: s.wallet_address || null, explorerUrl });
    }

    // GET /api/visit
    if (req.method === "GET" && pathname === "/api/visit") {
      const id        = norm(query.studentId);
      const lectureId = (query.lectureId || "").trim().toUpperCase();
      const target    = (query.target    || "/").trim();
      const ip        = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      const ua        = (req.headers["user-agent"] || "").slice(0, 500);
      await qr("INSERT INTO visit_log (student_id,lecture_id,target_url,ip_address,user_agent) VALUES (?,?,?,?,?)",
        [id || null, lectureId || null, target, ip, ua]);
      log("VISIT", "Link clicked", { studentId: id || "(anon)", lectureId: lectureId || "(none)", target });
      return redirect(res, target);
    }

    send(res, 404, { message: "Not found" });

  } catch (err) {
    log("ERROR", err.message);
    send(res, 500, { message: "Internal server error." });
  }

}).listen(process.env.PORT || 4000, () => {
  log("SERVER", `Up on http://localhost:${process.env.PORT || 4000} — sqlite3 (${DB_PATH})`);

  // Re-attempt any point awards that were recorded in SQLite but never reached the chain
  // (e.g. server crash, RPC timeout). The contract's _minted guard makes retries idempotent.
  async function retryUnmintedTransactions() {
    if (!blockchain.isEnabled()) return;
    try {
      const rows = await qa(`
        SELECT t.transaction_id, s.wallet_address, a.lecture_id
        FROM token_transactions t
        JOIN attendance  a ON a.attendance_id = t.attendance_id
        JOIN students    s ON s.student_id    = t.student_id
        WHERE t.blockchain_hash IS NULL
          AND s.wallet_address  IS NOT NULL
      `);
      for (const row of rows) {
        const hash = await blockchain.awardOnChain(row.wallet_address, POINTS_PER_SCAN, row.lecture_id);
        if (hash) await qr("UPDATE token_transactions SET blockchain_hash=? WHERE transaction_id=?", [hash, row.transaction_id]);
      }
      if (rows.length > 0) log("RETRY", `Re-minted ${rows.length} missed transaction(s)`);
    } catch (err) {
      log("RETRY:ERR", err.message);
    }
  }

  retryUnmintedTransactions();
  setInterval(retryUnmintedTransactions, 5 * 60 * 1000); // re-check every 5 minutes
});