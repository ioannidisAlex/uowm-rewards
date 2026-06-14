import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminStudents, fetchAdminTransactions } from "./api";

function Leaderboard() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: fetchAdminStudents,
  });

  return (
    <div className="flex flex-1 flex-col px-6 pt-8">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white">Βαθμολογία</h2>
        <p className="font-display text-sm text-mist">{data.length} φοιτητές</p>
      </header>

      {isLoading ? (
        <p className="font-display text-sm text-mist">Φόρτωση…</p>
      ) : (
        <ul className="space-y-2 pb-4">
          {data.map((s, i) => (
            <li
              key={s.student_id}
              className="flex items-center gap-4 rounded-2xl bg-ink2 px-4 py-3 ring-1 ring-white/5"
            >
              <span className={`w-7 shrink-0 font-mono text-sm font-bold
                ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-mist"}`}>
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-white truncate">{s.full_name}</p>
                <p className="font-mono text-xs text-mist">{s.student_id}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-bold text-lime">{s.total_points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Transactions() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: fetchAdminTransactions,
  });

  return (
    <div className="flex flex-1 flex-col px-6 pt-8">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white">Συναλλαγές</h2>
        <p className="font-display text-sm text-mist">{data.length} εγγραφές</p>
      </header>

      {isLoading ? (
        <p className="font-display text-sm text-mist">Φόρτωση…</p>
      ) : data.length === 0 ? (
        <p className="font-display text-sm text-mist">Δεν υπάρχουν συναλλαγές ακόμα.</p>
      ) : (
        <ul className="space-y-2 pb-4">
          {data.map((t) => (
            <li
              key={t.transaction_id}
              className="flex items-center justify-between rounded-2xl bg-ink2 px-4 py-3 ring-1 ring-white/5"
            >
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-white truncate">{t.full_name}</p>
                <p className="font-mono text-xs text-mist">{t.student_id}</p>
                {t.lecture_id && (
                  <p className="font-mono text-xs text-lime">{t.lecture_id} · {t.topic}</p>
                )}
                <p className="font-mono text-xs text-mist">{t.transaction_date}</p>
              </div>
              <span className="ml-3 shrink-0 font-mono text-sm font-bold text-lime">+{t.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminApp({ user, onSignOut }) {
  const [tab, setTab] = useState("leaderboard");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ink text-white">
      <div className="relative z-20 flex items-center justify-between px-6 pt-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-lime">Admin</span>
          <p className="font-mono text-xs text-mist">{user.studentId}</p>
        </div>
        <button onClick={onSignOut} className="font-mono text-xs text-mist underline-offset-4 hover:underline">
          Sign out
        </button>
      </div>

      <div className="flex flex-1 flex-col pb-24 overflow-y-auto">
        {tab === "leaderboard"  && <Leaderboard />}
        {tab === "transactions" && <Transactions />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-white/10 bg-ink2/95 backdrop-blur">
        <div className="grid grid-cols-2">
          <TabButton active={tab === "leaderboard"}  onClick={() => setTab("leaderboard")}  label="Βαθμολογία"  icon="▦" />
          <TabButton active={tab === "transactions"} onClick={() => setTab("transactions")} label="Συναλλαγές" icon="≡" />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-4 font-display text-sm font-semibold transition
        ${active ? "text-lime" : "text-mist"}`}
    >
      <span className={`text-xl ${active ? "scale-110" : ""} transition`}>{icon}</span>
      {label}
    </button>
  );
}
