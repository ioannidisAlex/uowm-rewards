// Run once: node server/db/migrate_wallet.js
// Adds wallet_address column to students table (safe to run on existing DB).
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");

const db = new sqlite3.Database(path.join(__dirname, "uowm_rewards.db"));

db.serialize(() => {
  db.run(
    "ALTER TABLE students ADD COLUMN wallet_address TEXT",
    (err) => {
      if (err && err.message.includes("duplicate column")) {
        console.log("wallet_address column already exists — nothing to do.");
      } else if (err) {
        console.error("Migration failed:", err.message);
      } else {
        console.log("✅ Added wallet_address column to students table.");
        console.log("   Students can now register their MetaMask address via POST /api/wallet");
      }
      db.close();
    }
  );
});
