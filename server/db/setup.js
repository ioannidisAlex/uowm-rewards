// db/setup.js — run once: node db/setup.js
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");

const DB_PATH = path.join(__dirname, "uowm_rewards.db");
if (fs.existsSync(DB_PATH)) { fs.unlinkSync(DB_PATH); console.log("🗑  Removed old DB"); }

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((res, rej) =>
    db.run(sql, params, function (err) { err ? rej(err) : res(this); })
  );
}
function all(sql, params = []) {
  return new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => err ? rej(err) : res(rows))
  );
}

async function setup() {
  await run("PRAGMA journal_mode = WAL");
  await run("PRAGMA foreign_keys = ON");

  await run(`CREATE TABLE IF NOT EXISTS students (
    student_id     TEXT NOT NULL PRIMARY KEY,
    full_name      TEXT,
    email          TEXT UNIQUE,
    total_points   INTEGER NOT NULL DEFAULT 0,
    role           TEXT NOT NULL DEFAULT 'student',
    wallet_address TEXT,
    airtable_id    TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS courses (
    course_id   TEXT NOT NULL PRIMARY KEY,
    course_name TEXT NOT NULL,
    department  TEXT,
    semester    TEXT,
    status      TEXT DEFAULT 'Active',
    airtable_id TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS course_students (
    course_id   TEXT NOT NULL,
    student_id  TEXT NOT NULL,
    enrolled_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (course_id, student_id),
    FOREIGN KEY (course_id)  REFERENCES courses  (course_id)  ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS lectures (
    lecture_id           TEXT NOT NULL PRIMARY KEY,
    course_id            TEXT NOT NULL,
    lecture_number       INTEGER,
    lecture_date         TEXT,
    topic                TEXT,
    attendance_open      INTEGER NOT NULL DEFAULT 0,
    attendance_form_link TEXT,
    qr_code_link         TEXT,
    status               TEXT DEFAULT 'Open',
    streak_cycle         TEXT,
    airtable_id          TEXT,
    FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS attendance (
    attendance_id     TEXT NOT NULL PRIMARY KEY,
    lecture_id        TEXT NOT NULL,
    student_id        TEXT NOT NULL,
    attendance_date   TEXT,
    check_in_time     TEXT,
    status            TEXT DEFAULT 'Present',
    base_points       INTEGER NOT NULL DEFAULT 0,
    counts_for_streak INTEGER NOT NULL DEFAULT 0,
    streak_cycle      TEXT,
    token_created     INTEGER NOT NULL DEFAULT 0,
    airtable_id       TEXT,
    created_at        TEXT DEFAULT (datetime('now')),
    UNIQUE (lecture_id, student_id),
    FOREIGN KEY (lecture_id) REFERENCES lectures  (lecture_id),
    FOREIGN KEY (student_id) REFERENCES students (student_id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS token_transactions (
    transaction_id   TEXT NOT NULL PRIMARY KEY,
    student_id       TEXT NOT NULL,
    attendance_id    TEXT,
    transaction_type TEXT,
    points           INTEGER NOT NULL DEFAULT 0,
    transaction_date TEXT,
    status              TEXT DEFAULT 'Confirmed',
    streak_cycle        TEXT,
    verification_id     TEXT,
    blockchain_hash     TEXT,
    verification_status TEXT,
    airtable_id         TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id)    REFERENCES students  (student_id),
    FOREIGN KEY (attendance_id) REFERENCES attendance (attendance_id) ON DELETE SET NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS scan_requests (
    request_id   TEXT NOT NULL PRIMARY KEY,
    student_id   TEXT NOT NULL,
    lecture_id   TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    awarded      INTEGER NOT NULL DEFAULT 0,
    points_after INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now')),
    resolved_at  TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS visit_log (
    id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    lecture_id TEXT,
    target_url TEXT,
    ip_address TEXT,
    user_agent TEXT,
    visited_at TEXT DEFAULT (datetime('now'))
  )`);

  console.log("✅ Schema created");

  // STUDENTS
  const students = [
    ["mst01013","ΠΑΠΑΚΩΝΣΤΑΝΤΙΝΟΥ ΧΡΥΣΟΒΑΛΑΝΤΗΣ","mst01013@uowm.gr","rec0rnm5UPMGbZQou"],
    ["mst01031","ΣΑΧΠΑΖΙΔΗΣ ΧΡΗΣΤΟΣ","mst01031@uowm.gr","rec1k7v4hXqPreTlw"],
    ["mst00962","ΕΛΛΗΝΙΔΟΥ ΤΑΤΙΑΝΑ","mst00962@uowm.gr","rec2GYagnRaNYktSW"],
    ["mst00612","ΦΩΚΑΣ ΙΩΑΝΝΗΣ","mst00612@uowm.gr","rec2UTm3zmXuGSdLr"],
    ["iantoniadis","ΑΝΤΩΝΙΑΔΗΣ ΙΩΑΝΝΗΣ","iantoniadis@uowm.gr","rec2o7USdyN8o4Flw"],
    ["mpp00371","ΔΕΤΤΟΡΑΚΗ ΚΑΛΛΙΟΠΗ","mpp00371@uowm.gr","rec3pkuMI7PJ2eFim"],
    ["mst01062","ΑΔΑΛΟΥΖΙΔΟΥ ΘΕΟΦΑΝΗ","mst01062@uowm.gr","rec5aou3S5BvtXlug"],
    ["mst01055","ΒΑΣΙΛΕΙΑΔΟΥ ΣΟΦΙΑ","mst01055@uowm.gr","rec5pvIIzq02WKtKX"],
    ["mst01011","ΠΑΓΙΑΝΝΙΔΗΣ ΚΩΝΣΤΑΝΤΙΝΟΣ","mst01011@uowm.gr","rec6b103mCOAHRZlN"],
    ["mst00913","ΣΟΥΒΛΗΣ ΠΑΝΑΓΙΩΤΗΣ","mst00913@uowm.gr","rec7W9G75cRBRfZK1"],
    ["mst01028","ΣΑΜΑΡΑΣ ΑΠΟΣΤΟΛΟΣ","mst01028@uowm.gr","rec7oQpXXXTIiexX5"],
    ["mst01027","ΡΤΒΕΛΙΑΣΒΙΛΙ ΚΥΡΙΑΚΗ","mst01027@uowm.gr","rec8A3lYuC7ZavQND"],
    ["mst00995","ΛΩΛΗ ΕΥΓΕΝΙΑ","mst00995@uowm.gr","rec8Hjis2wDQZBMeW"],
    ["mst01087","ΧΟΛΕΒΑΣ ΚΑΛΛΙΝΙΚΟΣ","mst01087@uowm.gr","rec9CxnPGMa0XuF7X"],
    ["mst01025","ΠΟΥΡΛΙΤΣΗΣ ΓΕΩΡΓΙΟΣ","mst01025@uowm.gr","recACZoh77zoqdCbi"],
    ["mst00985","ΚΟΥΛΟΥΡΗΣ ΓΕΩΡΓΙΟΣ","mst00985@uowm.gr","recBbxBujwZvqnYkQ"],
    ["mst01070","ΚΑΡΑΓΙΑΝΝΗ ΓΛΥΚΕΡΙΑ","mst01070@uowm.gr","recBktUQH8jUO5FXr"],
    ["mst01056","ΚΑΝΔΗΣ ΠΑΝΑΓΙΩΤΗΣ","mst01056@uowm.gr","recCm72xHaxg5z5i6"],
    ["mst01072","ΚΕΠΙΔΟΥ ΕΥΣΑΪΑ","mst01072@uowm.gr","recEQc6SXFwzWYtNI"],
    ["mst01082","ΣΙΛΙΑΦΗ ΑΝΑΣΤΑΣΙΑ","mst01082@uowm.gr","recEf7tRuZMUXwZLB"],
    ["mst01041","ΤΖΕΡΕΜΕ ΖΩΗ","mst01041@uowm.gr","recFCHJly3qxKV6Fk"],
    ["mst00997","ΜΑΡΙΝΗ ΑΝΤΟΝΙΟ","mst00997@uowm.gr","recFGUYQYpAKJSxUP"],
    ["mst00919","ΤΡΑΧΟΣ ΑΘΑΝΑΣΙΟΣ","mst00919@uowm.gr","recFcjr6VLMWZjxDn"],
    ["mst01068","ΚΑΛΕΛΗ ΖΩΗ","mst01068@uowm.gr","recH0WeOgRiErI5m5"],
    ["mst00954","ΓΚΟΓΚΟΣ ΑΝΤΩΝΙΟΣ","mst00954@uowm.gr","recHEWigT65xwvrzf"],
    ["mst01075","ΚΥΡΙΑΖΙΔΟΥ ΠΑΝΑΓΙΩΤΑ","mst01075@uowm.gr","recHfV0zx03Kcmo2Z"],
    ["mst01084","ΣΥΜΕΩΝΙΔΗΣ ΑΛΕΞΑΝΔΡΟΣ","mst01084@uowm.gr","recHovtHWaDhelwGz"],
    ["mst01007","ΝΙΚΟΛΑΪΔΗΣ ΒΑΣΙΛΕΙΟΣ","mst01007@uowm.gr","recILI5TswlYmoi0X"],
    ["mst01019","ΠΑΥΛΙΔΗ ΕΛΕΝΗ","mst01019@uowm.gr","recJ1jMXuQwLU2D92"],
    ["mst00988","ΚΟΥΤΣΙΑΝΟΣ ΔΗΜΗΤΡΙΟΣ","mst00988@uowm.gr","recJwnKJCrH3cEMv5"],
    ["mst01049","ΤΣΙΛΦΙΔΗΣ ΗΛΙΑΣ","mst01049@uowm.gr","recKKWci4kwmL1dn2"],
    ["mst01010","ΞΑΝΘΟΠΟΥΛΟΥ ΕΥΣΤΡΑΤΙΑ","mst01010@uowm.gr","recM8KbtWC6j74HGM"],
    ["mst01052","ΧΑΡΙΑΔΟΥ ΘΕΟΔΩΡΑ","mst01052@uowm.gr","recMyLVU0Qr5klDSs"],
    ["mst00890","ΠΑΓΙΑΤΑΚΗΣ ΓΕΩΡΓΙΟΣ","mst00890@uowm.gr","recN5iHsEvD55RdSt"],
    ["mst00978","ΚΑΤΣΙΠΙΔΗΣ ΚΩΝΣΤΑΝΤΙΝΟΣ","mst00978@uowm.gr","recN6Q0PLPkGerwBf"],
    ["mst00990","ΚΥΔΩΝΑ ΜΑΡΙΝΑ","mst00990@uowm.gr","recODA0avAzjdBeie"],
    ["mst01045","ΤΣΑΛΟΥΜΑΣ ΝΙΚΟΛΑΟΣ","mst01045@uowm.gr","recTA6KJxb5QgY2Uy"],
    ["mst00968","ΘΩΜΛΟΥΔΗ ΜΑΓΔΑΛΗΝΗ","mst00968@uowm.gr","recUNpx1HZ9EB9fhv"],
    ["mst01023","ΠΟΛΥΖΟΠΟΥΛΟΥ ΕΛΕΝΗ","mst01023@uowm.gr","recVDHljhkgCjTH5Z"],
    ["mst00951","ΓΙΑΒΡΟΓΛΟΥ ΓΕΩΡΓΙΟΣ","mst00951@uowm.gr","recVkeoemZgA4pBlG"],
    ["mst00970","ΚΑΜΠΟΥΡΗΣ ΓΕΩΡΓΙΟΣ","mst00970@uowm.gr","recX0RJaZeqE8DowV"],
    ["mst01686","ΖΥΓΟΥΡΗΣ ΒΑΪΟΣ","mst01686@uowm.gr","recZPF930ic04sqEW"],
    ["mst00986","ΚΟΥΝΑΣ ΚΩΝΣΤΑΝΤΙΝΟΣ","mst00986@uowm.gr","recd622tuohIGoMXh"],
    ["mst00598","ΤΣΙΑΚΟΣ ΠΑΝΑΓΙΩΤΗΣ","mst00598@uowm.gr","recfZK1IxrwUMxBTh"],
    ["mst01065","ΓΚΑΡΑ ΠΗΝΕΛΟΠΗ","mst01065@uowm.gr","reci4NAXqLAOAh6rv"],
    ["mst01081","ΝΙΚΚΟΥ ΦΡΕΙΔΕΡΙΚΗ","mst01081@uowm.gr","recih2Z4S4Ap3YSXx"],
    ["mst01046","ΤΣΑΠΑΛΗ ΑΓΓΕΛΙΚΗ","mst01046@uowm.gr","recikZvY6kdMyeC8Y"],
    ["mst01058","ΛΙΘΟΞΟΪΔΗΣ ΠΑΡΑΣΚΕΥΑΣ","mst01058@uowm.gr","recjTZTQISXB2Gok6"],
    ["mst00945","ΒΑΣΣΗ ΧΡΙΣΤΙΝΑ","mst00945@uowm.gr","recjr13sGno9AL9lJ"],
    ["mst01051","ΤΣΟΥΤΣΟΥΛΑΚΗ ΖΩΗ","mst01051@uowm.gr","reckCJJDqoAujnajT"],
    ["mst01001","ΜΗΤΡΟΝΑTΣΙΟΣ ΑΛΕΞΑΝΔΡΟΣ","mst01001@uowm.gr","reclTdT1DseGCt3Cl"],
    ["mst00989","ΚΡΙΚΗ ΕΥΘΥΜΙΑ","mst00989@uowm.gr","recoVErnsjv0nZ3WC"],
    ["mst01016","ΠΑΠΑΡΟΥΝΗ ΓΕΩΡΓΙΑ","mst01016@uowm.gr","recs6hbjM04qL8Lh4"],
    ["mst01083","ΣΙΣΜΑΝΙΔΗΣ ΓΕΩΡΓΙΟΣ","mst01083@uowm.gr","recttWwm82tbpR8pm"],
    ["mst01022","ΠΗΧΑΣ ΧΡΗΣΤΟΣ","mst01022@uowm.gr","recup0aw4NP9da8s2"],
    ["mst01008","ΝΙΚΟΥ ΝΙΚΟΛΑΟΣ","mst01008@uowm.gr","recvybLJWqTra5fvM"],
    ["mst01020","ΠΕΪΚΙΔΗΣ ΠΑΝΑΓΙΩΤΗΣ","mst01020@uowm.gr","recx42sSfSdGGdnVp"],
    ["mst01054","ΛΑΤΣΙΟΣ ΠΑΣΧΑΛΗΣ","mst01054@uowm.gr","reczjXKMrOaB0JabR"],
  ];
  for (const [id, name, email, aid] of students)
    await run("INSERT OR REPLACE INTO students (student_id,full_name,email,airtable_id) VALUES (?,?,?,?)", [id,name,email,aid]);
  console.log(`✅ Students: ${students.length} rows`);

  // TEACHERS & ADMIN
  const staff = [
    ["tchr001", "ΑΝΤΩΝΙΑΔΗΣ ΙΩΑΝΝΗΣ",       "tchr001@uowm.gr", "teacher"],
    ["tchr002", "ΚΑΘΗΓΗΤΗΣ",     "tchr002@uowm.gr", "teacher"],
    ["admin",   "ΔΙΑΧΕΙΡΙΣΤΗΣ ΣΥΣΤΗΜΑΤΟΣ",     "admin@uowm.gr",   "admin"],
  ];
  for (const [id, name, email, role] of staff)
    await run("INSERT OR REPLACE INTO students (student_id,full_name,email,role) VALUES (?,?,?,?)", [id, name, email, role]);
  console.log(`✅ Staff: ${staff.length} rows (teachers + admin)`);;

  // COURSE
  await run("INSERT OR REPLACE INTO courses (course_id,course_name,department,semester,status,airtable_id) VALUES (?,?,?,?,?,?)",
    ["MST148","Blockchain και Κρυπτονομίσματα","MST","Spring 2026","Active","recdl98yR5SsXh41M"]);
  console.log("✅ Courses: 1 row");

  // LECTURES
  const lectures = [
    ["LEC001","MST148",1,"2026-03-09","Εισαγωγή στο Blockchain",1,"Open","Cycle 1","recE0V9JIpEYxryKu"],
    ["LEC002","MST148",2,"2026-03-16","Τρόπος λειτουργίας και χαρακτηριστικά Blockchain",1,"Open","Cycle 1","rec57UBHWF1D21d7E"],
    ["LEC003","MST148",3,"2026-03-23","Τρόπος λειτουργίας και χαρακτηριστικά Blockchain (Β)",1,"Open","Cycle 1","recRzNG4SfQf6pHyz"],
    ["LEC004","MST148",4,"2026-03-30","Κρυπτονομίσματα - Bitcoin (A)",1,"Open","Cycle 1","recZwtYbm61EpelSy"],
    ["LEC005","MST148",5,"2026-04-06","Κρυπτονομίσματα - Bitcoin (B)",1,"Open","Cycle 2","recjqCdFC5NRASYLO"],
    ["LEC006","MST148",6,"2026-04-27","Ethereum (Blockchain 2.0)",1,"Open","Cycle 2","recb7yBUwMQWDBwmD"],
    ["LEC007","MST148",7,"2026-05-04","Εξυπνα συμβόλαια (Smart Contracts) (Α)",1,"Open","Cycle 2","recKsfAInVm8lU7Bq"],
    ["LEC008","MST148",8,"2026-05-11","Εξυπνα συμβόλαια (Smart Contracts) (Β)",1,"Open","Cycle 2","recQwVRHKxkst8khn"],
    ["LEC009","MST148",9,"2026-05-18","Εφαρμογές Blockchain στον Ιδιωτικό Τομέα (Α)",1,"Open","Cycle 4","recAzoeFrcMKWUoHT"],
    ["LEC010","MST148",10,"2026-05-25","Εφαρμογές Blockchain στον Ιδιωτικό Τομέα (Β)",1,"Open","Cycle 4","recR8ykkErJmsKBBV"],
    ["LEC011","MST148",11,"2026-06-02","Επανάληψη",1,"Open","Cycle 4","rect5RrEN1h8RVafi"],
    ["LEC012","MST148",12,"2026-06-15","Εξετάσεις",1,"Open","Cycle 4","recH38QDVxGetNC6o"],
  ];
  for (const [lid,cid,num,date,topic,open,status,cycle,aid] of lectures)
    await run("INSERT OR REPLACE INTO lectures (lecture_id,course_id,lecture_number,lecture_date,topic,attendance_open,status,streak_cycle,airtable_id) VALUES (?,?,?,?,?,?,?,?,?)",
      [lid,cid,num,date,topic,open,status,cycle,aid]);
  console.log(`✅ Lectures: ${lectures.length} rows`);

  // ENROLLMENTS
  for (const [id] of students)
    await run("INSERT OR IGNORE INTO course_students (course_id,student_id) VALUES (?,?)", ["MST148", id]);
  console.log(`✅ Enrollments: ${students.length} rows`);

  const summary = await all("SELECT (SELECT COUNT(*) FROM students) AS students, (SELECT COUNT(*) FROM lectures) AS lectures, (SELECT COUNT(*) FROM course_students) AS enrollments");
  console.log("\n📊 Database ready:");
  console.table(summary[0]);
  db.close();
}

setup().catch(err => { console.error("❌", err.message); db.close(); process.exit(1); });