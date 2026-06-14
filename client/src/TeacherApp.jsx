import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LectureQRs from "./LectureQRs";
import { fetchAttendance, fetchPendingScans, approveScan, rejectScan } from "./api";

const LECTURES = [
  { id: "LEC001", num: 1,  topic: "Εισαγωγή στο Blockchain",                              date: "09 Mar 2026" },
  { id: "LEC002", num: 2,  topic: "Τρόπος λειτουργίας και χαρακτηριστικά Blockchain",     date: "16 Mar 2026" },
  { id: "LEC003", num: 3,  topic: "Τρόπος λειτουργίας και χαρακτηριστικά Blockchain (Β)", date: "23 Mar 2026" },
  { id: "LEC004", num: 4,  topic: "Κρυπτονομίσματα - Bitcoin (Α)",                        date: "30 Mar 2026" },
  { id: "LEC005", num: 5,  topic: "Κρυπτονομίσματα - Bitcoin (Β)",                        date: "06 Apr 2026" },
  { id: "LEC006", num: 6,  topic: "Ethereum (Blockchain 2.0)",                             date: "27 Apr 2026" },
  { id: "LEC007", num: 7,  topic: "Έξυπνα συμβόλαια (Smart Contracts) (Α)",              date: "04 May 2026" },
  { id: "LEC008", num: 8,  topic: "Έξυπνα συμβόλαια (Smart Contracts) (Β)",              date: "11 May 2026" },
  { id: "LEC009", num: 9,  topic: "Εφαρμογές Blockchain στον Ιδιωτικό Τομέα (Α)",        date: "18 May 2026" },
  { id: "LEC010", num: 10, topic: "Εφαρμογές Blockchain στον Ιδιωτικό Τομέα (Β)",        date: "25 May 2026" },
  { id: "LEC011", num: 11, topic: "Επανάληψη",                                            date: "02 Jun 2026" },
  { id: "LEC012", num: 12, topic: "Εξετάσεις",                                            date: "15 Jun 2026" },
];

// ── Attendance list ──────────────────────────────────────────────────────────────
function AttendanceView() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", selectedId],
    queryFn: () => fetchAttendance(selectedId),
    enabled: !!selectedId,
  });

  return (
    <div className="flex flex-1 flex-col px-6 pt-8 pb-4">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white">Παρουσίες</h2>
        <p className="font-display text-sm text-mist">Επιλέξτε διάλεξη για να δείτε παρουσίες.</p>
      </header>

      <ul className="space-y-2">
        {LECTURES.map((lec) => {
          const open = selectedId === lec.id;
          return (
            <li key={lec.id}>
              <button
                onClick={() => setSelectedId(open ? null : lec.id)}
                className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 ring-1 transition text-left
                  ${open ? "bg-lime/10 ring-lime/30" : "bg-ink2 ring-white/5 active:scale-[0.98]"}`}
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-lime">{lec.id}</p>
                  <p className="font-display text-sm text-white">{lec.topic}</p>
                  <p className="font-mono text-xs text-mist">{lec.date}</p>
                </div>
                <span className="ml-3 shrink-0 font-mono text-xs text-mist">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <div className="mt-1 rounded-2xl bg-ink2/60 px-4 py-3 ring-1 ring-white/5">
                  {isLoading ? (
                    <p className="font-display text-sm text-mist">Φόρτωση…</p>
                  ) : !data?.attendees?.length ? (
                    <p className="font-display text-sm text-mist">Δεν υπάρχουν παρουσίες ακόμα.</p>
                  ) : (
                    <>
                      <p className="font-mono text-xs text-lime mb-3">{data.attendees.length} φοιτητές παρόντες</p>
                      <ul className="space-y-2">
                        {data.attendees.map((a) => (
                          <li key={a.student_id} className="flex items-center justify-between">
                            <div>
                              <p className="font-display text-sm text-white">{a.full_name}</p>
                              <p className="font-mono text-xs text-mist">{a.student_id}</p>
                            </div>
                            <span className="font-mono text-xs text-mist shrink-0 ml-2">
                              {a.check_in_time ? a.check_in_time.slice(11, 16) : "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Approval notifications (bottom-right stack, non-blocking) ────────────────────
function ApprovalNotifications({ pending, onApprove, onReject, resolving }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 w-72">
      {pending.map((scan) => (
        <div
          key={scan.request_id}
          className="rounded-2xl bg-ink2 ring-1 ring-white/15 shadow-2xl p-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-lime mb-2">
            Scan Request
          </p>
          <p className="font-display text-sm font-bold text-white leading-tight">{scan.full_name}</p>
          <p className="font-mono text-xs text-mist">{scan.student_id} · {scan.lecture_id}</p>
          <p className="font-mono text-xs text-mist/60 truncate mt-0.5">{scan.topic}</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onReject(scan.request_id)}
              disabled={resolving}
              className="rounded-xl border border-white/10 py-2.5 font-display text-sm font-bold
                text-mist transition active:scale-[0.97] disabled:opacity-40"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(scan.request_id)}
              disabled={resolving}
              className="rounded-xl bg-lime py-2.5 font-display text-sm font-bold text-ink
                transition active:scale-[0.97] disabled:opacity-40"
            >
              Approve ✓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Teacher shell ────────────────────────────────────────────────────────────────
export default function TeacherApp({ user, onSignOut }) {
  const [tab, setTab] = useState("qr");
  const [pendingScans, setPendingScans] = useState([]);
  const [resolving, setResolving] = useState(false);
  const qc = useQueryClient();

  // Poll for pending scans every 2 s
  useEffect(() => {
    async function poll() {
      try {
        const data = await fetchPendingScans();
        setPendingScans(data);
      } catch { /* ignore */ }
    }
    poll(); // immediate first fetch
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleApprove(requestId) {
    setResolving(true);
    try {
      await approveScan(requestId);
      // refresh attendance list if it's open
      qc.invalidateQueries({ queryKey: ["attendance"] });
    } catch { /* error handled by showing next scan */ }
    setResolving(false);
    setPendingScans((prev) => prev.filter((s) => s.request_id !== requestId));
  }

  async function handleReject(requestId) {
    setResolving(true);
    try { await rejectScan(requestId); } catch {}
    setResolving(false);
    setPendingScans((prev) => prev.filter((s) => s.request_id !== requestId));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ink text-white">
      <div className="relative z-20 flex items-center justify-between px-6 pt-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-lime">Καθηγητής</span>
          <p className="font-mono text-xs text-mist">{user.studentId}</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingScans.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral font-mono text-xs font-bold text-white">
              {pendingScans.length}
            </span>
          )}
          <button onClick={onSignOut} className="font-mono text-xs text-mist underline-offset-4 hover:underline">
            Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pb-24 overflow-y-auto">
        {tab === "qr"         && <LectureQRs />}
        {tab === "attendance" && <AttendanceView />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-white/10 bg-ink2/95 backdrop-blur">
        <div className="grid grid-cols-2">
          <TabButton active={tab === "qr"}         onClick={() => setTab("qr")}         label="QR Codes"   icon="⊞" />
          <TabButton active={tab === "attendance"} onClick={() => setTab("attendance")} label="Παρουσίες"  icon="✓" />
        </div>
      </nav>

      {pendingScans.length > 0 && (
        <ApprovalNotifications
          pending={pendingScans}
          onApprove={handleApprove}
          onReject={handleReject}
          resolving={resolving}
        />
      )}
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
