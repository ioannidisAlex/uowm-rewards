import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Gatekeeper from "./Gatekeeper";
import Scanner from "./Scanner";
import Dashboard from "./Dashboard";
import { getStoredStudentId, clearStoredStudentId } from "./api";

export default function App() {
  const [studentId, setStudentId] = useState(getStoredStudentId());
  const [tab, setTab] = useState("scan");
  const [livePoints, setLivePoints] = useState(null);
  const qc = useQueryClient();

  if (!studentId) {
    return <Gatekeeper onEnter={setStudentId} />;
  }

  const handlePointsChanged = (points) => {
    setLivePoints(points);
    qc.invalidateQueries({ queryKey: ["me", studentId] });
  };

  const signOut = () => {
    clearStoredStudentId();
    setStudentId(null);
    setLivePoints(null);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ink text-white">
      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-6">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-lime">
          QR Rewards
        </span>
        <button
          onClick={signOut}
          className="font-mono text-xs text-mist underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </div>

      {/* Active view */}
      <div className="flex flex-1 flex-col pb-24">
        {tab === "scan" ? (
          <Scanner studentId={studentId} onPointsChanged={handlePointsChanged} />
        ) : (
          <Dashboard studentId={studentId} livePoints={livePoints} />
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-white/10 bg-ink2/95 backdrop-blur">
        <div className="grid grid-cols-2">
          <TabButton
            active={tab === "scan"}
            onClick={() => setTab("scan")}
            label="Scan"
            icon="◎"
          />
          <TabButton
            active={tab === "dash"}
            onClick={() => setTab("dash")}
            label="Points"
            icon="▦"
          />
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
