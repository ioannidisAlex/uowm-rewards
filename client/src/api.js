// Thin wrapper around fetch. All calls go to relative /api (Vite proxies in dev).

const STORAGE_KEY = "qr_rewards_user";

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
export function setStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}
export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("qr_rewards_student_id"); // clean up old key
}

async function asJson(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data.message || "Something went wrong.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function login(studentId) {
  return fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  }).then(asJson);
}

export function fetchMe(studentId) {
  return fetch(`/api/me?studentId=${encodeURIComponent(studentId)}`).then(asJson);
}

export function submitScan(studentId, code) {
  return fetch("/api/scan-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, code }),
  }).then(asJson);
}

export function pollScanStatus(requestId) {
  return fetch(`/api/scan-request/${encodeURIComponent(requestId)}/status`).then(asJson);
}

export function fetchPendingScans() {
  return fetch("/api/scan-requests/pending").then(asJson);
}

export function approveScan(requestId) {
  return fetch(`/api/scan-requests/${encodeURIComponent(requestId)}/approve`, { method: "POST" }).then(asJson);
}

export function rejectScan(requestId) {
  return fetch(`/api/scan-requests/${encodeURIComponent(requestId)}/reject`, { method: "POST" }).then(asJson);
}

export function claimReward(studentId, code) {
  return fetch("/api/claim-reward", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, code }),
  }).then(asJson);
}

export function fetchAttendance(lectureId) {
  return fetch(`/api/attendance?lectureId=${encodeURIComponent(lectureId)}`).then(asJson);
}

export function fetchAdminStudents() {
  return fetch("/api/admin/students").then(asJson);
}

export function fetchAdminTransactions() {
  return fetch("/api/admin/transactions").then(asJson);
}

// ── Blockchain / MetaMask (optional) ─────────────────────────────────────────

export function fetchWalletInfo(studentId) {
  return fetch(`/api/wallet/${encodeURIComponent(studentId)}`).then(asJson);
}

export function fetchWalletNonce(studentId) {
  return fetch(`/api/wallet/nonce?studentId=${encodeURIComponent(studentId)}`).then(asJson);
}

export function registerWallet(studentId, walletAddress, signature, nonce) {
  return fetch("/api/wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, walletAddress, signature, nonce }),
  }).then(asJson);
}

export function disconnectWallet(studentId) {
  return fetch("/api/wallet", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  }).then(asJson);
}
