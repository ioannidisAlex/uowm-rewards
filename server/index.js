// ============================================================================
// Student QR Rewards — Node.js backend
// Plain Express. No DB. In-memory student "table" + claimed-code ledger.
// ----------------------------------------------------------------------------
// Endpoints
//   POST /api/login          { studentId }            -> { token, studentId, points }
//   GET  /api/me?studentId   (header x-student-id)    -> { studentId, points, history }
//   POST /api/claim-reward   { studentId, code }      -> { points, awarded, message }
//   GET  /api/qr/:code                                -> PNG image of the QR code
// ============================================================================

const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(express.json());

// --- "Database": a flat array of valid students -----------------------------
const students = {
  mst01081: { studentId: "mst01081", name: "Demo Student", points: 0, history: [] },
  mst02042: { studentId: "mst02042", name: "Test Student", points: 120, history: [] },
};

// Tracks which (studentId|code) pairs have already been claimed.
const claimed = new Set();

// Points granted per valid scan.
const POINTS_PER_SCAN = 50;

// Un-hashed pseudo-JWT. Deliberately NOT cryptographic — this is a demo handshake.
function makeToken(studentId) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: studentId, iat: Date.now() })
  ).toString("base64url");
  return `${header}.${payload}.`;
}

// ---------------------------------------------------------------------------
// POST /api/login — the handshake. Validates the ID exists, returns a token.
// ---------------------------------------------------------------------------
app.post("/api/login", (req, res) => {
  const studentId = String(req.body?.studentId || "").trim().toLowerCase();
  if (!studentId) {
    return res.status(400).json({ message: "Enter a student ID." });
  }
  const student = students[studentId];
  if (!student) {
    return res.status(404).json({ message: "That student ID isn't on the roster." });
  }
  return res.json({
    token: makeToken(studentId),
    studentId: student.studentId,
    points: student.points,
  });
});

// ---------------------------------------------------------------------------
// GET /api/me — current balance + scan history for the dashboard.
// ---------------------------------------------------------------------------
app.get("/api/me", (req, res) => {
  const studentId = String(
    req.query.studentId || req.header("x-student-id") || ""
  ).trim().toLowerCase();
  const student = students[studentId];
  if (!student) {
    return res.status(404).json({ message: "Unknown student." });
  }
  return res.json({
    studentId: student.studentId,
    points: student.points,
    history: student.history,
  });
});

// ---------------------------------------------------------------------------
// POST /api/claim-reward — the scan payload lands here.
// ---------------------------------------------------------------------------
app.post("/api/claim-reward", (req, res) => {
  const studentId = String(req.body?.studentId || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();

  const student = students[studentId];
  if (!student) {
    return res.status(401).json({ message: "Session expired. Sign in again." });
  }
  if (!code) {
    return res.status(400).json({ message: "Empty QR code. Try again." });
  }

  const ledgerKey = `${studentId}|${code}`;
  if (claimed.has(ledgerKey)) {
    return res.status(409).json({ message: "This code was already used." });
  }

  claimed.add(ledgerKey);
  student.points += POINTS_PER_SCAN;
  student.history.unshift({
    code,
    points: POINTS_PER_SCAN,
    at: new Date().toISOString(),
  });

  return res.json({
    awarded: POINTS_PER_SCAN,
    points: student.points,
    message: `+${POINTS_PER_SCAN} points added`,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`QR Rewards API listening on http://localhost:${PORT}`);
});
