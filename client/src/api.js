// Thin wrapper around fetch. All calls go to relative /api (Vite proxies in dev).

const STORAGE_KEY = "qr_rewards_student_id";

export function getStoredStudentId() {
  return localStorage.getItem(STORAGE_KEY);
}
export function setStoredStudentId(id) {
  localStorage.setItem(STORAGE_KEY, id);
}
export function clearStoredStudentId() {
  localStorage.removeItem(STORAGE_KEY);
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

// The handshake.
export function login(studentId) {
  return fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  }).then(asJson);
}

// Dashboard data.
export function fetchMe(studentId) {
  return fetch(`/api/me?studentId=${encodeURIComponent(studentId)}`).then(asJson);
}

// Scan claim. studentId is always attached to the payload.
export function claimReward(studentId, code) {
  return fetch("/api/claim-reward", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, code }),
  }).then(asJson);
}
