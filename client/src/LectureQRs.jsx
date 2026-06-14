import { useState } from "react";

const LECTURES = [
  { id: "LEC001", num: 1,  topic: "Εισαγωγή στο Blockchain",                              date: "09 Mar 2026" },
  { id: "LEC002", num: 2,  topic: "Τρόπος λειτουργίας και χαρακτηριστικά Blockchain",      date: "16 Mar 2026" },
  { id: "LEC003", num: 3,  topic: "Τρόπος λειτουργίας και χαρακτηριστικά Blockchain (Β)", date: "23 Mar 2026" },
  { id: "LEC004", num: 4,  topic: "Κρυπτονομίσματα - Bitcoin (Α)",                         date: "30 Mar 2026" },
  { id: "LEC005", num: 5,  topic: "Κρυπτονομίσματα - Bitcoin (Β)",                         date: "06 Apr 2026" },
  { id: "LEC006", num: 6,  topic: "Ethereum (Blockchain 2.0)",                              date: "27 Apr 2026" },
  { id: "LEC007", num: 7,  topic: "Έξυπνα συμβόλαια (Smart Contracts) (Α)",               date: "04 May 2026" },
  { id: "LEC008", num: 8,  topic: "Έξυπνα συμβόλαια (Smart Contracts) (Β)",               date: "11 May 2026" },
  { id: "LEC009", num: 9,  topic: "Εφαρμογές Blockchain στον Ιδιωτικό Τομέα (Α)",         date: "18 May 2026" },
  { id: "LEC010", num: 10, topic: "Εφαρμογές Blockchain στον Ιδιωτικό Τομέα (Β)",         date: "25 May 2026" },
  { id: "LEC011", num: 11, topic: "Επανάληψη",                                             date: "02 Jun 2026" },
];

export default function LectureQRs() {
  const [active, setActive] = useState(null);

  return (
    <div className="flex flex-1 flex-col px-6 pt-8">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white">QR Codes</h2>
        <p className="font-display text-sm text-mist">
          Tap any lecture to display its code full-screen for scanning.
        </p>
      </header>

      <ul className="space-y-3 pb-4">
        {LECTURES.map((lec) => (
          <li
            key={lec.id}
            onClick={() => setActive(lec)}
            className="flex cursor-pointer items-center gap-4 rounded-2xl bg-ink2 px-4 py-3
              ring-1 ring-white/5 active:scale-[0.98] transition"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-semibold text-lime">{lec.id}</p>
              <p className="truncate font-display text-sm font-medium text-white">{lec.topic}</p>
              <p className="font-mono text-xs text-mist">{lec.date}</p>
            </div>
            <img
              src={`/lecture_qrcodes/${lec.id}.png`}
              alt={lec.id}
              className="h-14 w-14 shrink-0 rounded-xl"
            />
          </li>
        ))}
      </ul>

      {/* Full-screen overlay for scanning */}
      {active && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink/50">
            {active.id} · Διάλεξη {active.num}
          </p>
          <p className="mt-2 mb-8 font-display text-xl font-bold text-ink text-center leading-snug">
            {active.topic}
          </p>
          <img
            src={`/lecture_qrcodes/${active.id}.png`}
            alt={active.id}
            className="w-72 h-72"
          />
          <p className="mt-4 font-mono text-xs text-ink/40">{active.date}</p>
          <button
            onClick={() => setActive(null)}
            className="mt-10 rounded-2xl bg-ink px-10 py-4 font-display text-lg font-bold
              text-lime active:scale-[0.98] transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
