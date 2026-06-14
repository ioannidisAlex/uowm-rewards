// Ethers.js bridge — mints on-chain tokens after SQLite records a point award.
// Fire-and-forget: never throws; errors are logged so the HTTP response is unaffected.
const { ethers } = require("ethers");

// Minimal ABI — only the functions the server needs to call.
const ABI = [
  "function awardAttendance(address student, uint256 points, string lectureId) external",
  "function recordAttendance(string studentId, string lectureId) external",
  "event AttendanceRecorded(address indexed student, uint256 points, string lectureId, uint256 timestamp)",
  "event AttendanceLogged(string studentId, string lectureId, uint256 timestamp)",
];

let contract = null;
let enabled  = false;

function init() {
  const {
    BLOCKCHAIN_ENABLED,
    SEPOLIA_RPC_URL,
    AMOY_RPC_URL,
    DEPLOYER_PRIVATE_KEY,
    CONTRACT_ADDRESS,
  } = process.env;

  if (BLOCKCHAIN_ENABLED !== "true") {
    console.log("[BLOCKCHAIN] Disabled (set BLOCKCHAIN_ENABLED=true to enable)");
    return;
  }

  const rpcUrl  = AMOY_RPC_URL || SEPOLIA_RPC_URL;
  const network = AMOY_RPC_URL ? "Polygon Amoy" : "Sepolia";
  if (!rpcUrl || !DEPLOYER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.warn("[BLOCKCHAIN] Missing env vars — on-chain minting disabled");
    console.warn("  Required: AMOY_RPC_URL, DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS");
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet   = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    enabled  = true;
    console.log(`[BLOCKCHAIN] Connected on ${network} — contract: ${CONTRACT_ADDRESS}`);
  } catch (err) {
    console.error("[BLOCKCHAIN] Init failed:", err.message);
  }
}

/**
 * Mint points on-chain for a student's lecture attendance.
 * @param {string|null} walletAddress  Student's Ethereum address (0x...). Pass null to skip.
 * @param {number}      points         Raw integer points (e.g. 50).
 * @param {string}      lectureId      e.g. "LEC001"
 * @returns {Promise<string|null>}     Transaction hash, or null if disabled/skipped/errored.
 */
async function awardOnChain(walletAddress, points, lectureId) {
  if (!enabled || !contract) return null;
  if (!walletAddress || !ethers.isAddress(walletAddress)) return null;

  try {
    const tx = await contract.awardAttendance(walletAddress, points, lectureId);
    console.log(`[BLOCKCHAIN] TX submitted ${tx.hash} | ${lectureId} -> ${walletAddress} (+${points}pts)`);
    // Confirm asynchronously — don't block the HTTP response
    tx.wait(1)
      .then(() => console.log(`[BLOCKCHAIN] TX confirmed ${tx.hash}`))
      .catch((err) => console.error(`[BLOCKCHAIN] TX failed ${tx.hash}:`, err.message));
    return tx.hash;
  } catch (err) {
    console.error("[BLOCKCHAIN] awardAttendance error:", err.message);
    return null;
  }
}

/**
 * Verify that `signature` was produced by signing `message` with the private
 * key that controls `walletAddress`. Works with MetaMask's personal_sign.
 * Returns true only if the recovered address matches exactly.
 */
function verifyWalletSignature(walletAddress, signature, message) {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === walletAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Record attendance on-chain for a student who has no wallet address.
 * Emits an AttendanceLogged event — no tokens minted, no address needed.
 */
async function recordAttendanceOnChain(studentId, lectureId) {
  if (!enabled || !contract) return null;
  try {
    const tx = await contract.recordAttendance(studentId, lectureId);
    console.log(`[BLOCKCHAIN] LOG TX submitted ${tx.hash} | ${lectureId} -> ${studentId}`);
    tx.wait(1)
      .then(() => console.log(`[BLOCKCHAIN] LOG TX confirmed ${tx.hash}`))
      .catch((err) => console.error(`[BLOCKCHAIN] LOG TX failed ${tx.hash}:`, err.message));
    return tx.hash;
  } catch (err) {
    console.error("[BLOCKCHAIN] recordAttendance error:", err.message);
    return null;
  }
}

module.exports = { init, awardOnChain, recordAttendanceOnChain, verifyWalletSignature, isEnabled: () => enabled };
