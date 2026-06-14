import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Gatekeeper from "./Gatekeeper";
import Scanner from "./Scanner";
import Dashboard from "./Dashboard";
import TeacherApp from "./TeacherApp";
import AdminApp from "./AdminApp";
import { getStoredUser, clearStoredUser } from "./api";

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [tab, setTab] = useState("scan");
  const [livePoints, setLivePoints] = useState(null);
  const qc = useQueryClient();

  if (!user) return <Gatekeeper onEnter={setUser} />;

  const signOut = () => {
    clearStoredUser();
    setUser(null);
    setLivePoints(null);
  };

  if (user.role === "teacher") return <TeacherApp user={user} onSignOut={signOut} />;
  if (user.role === "admin")   return <AdminApp   user={user} onSignOut={signOut} />;

  // student
  const handlePointsChanged = (points) => {
    setLivePoints(points);
    qc.invalidateQueries({ queryKey: ["me", user.studentId] });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ink text-white">
      <div className="relative z-20 flex items-center justify-between px-6 pt-6">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-lime">UOWM REWARDS</span>
        <button
          onClick={signOut}
          className="font-mono text-xs text-mist underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-1 flex-col pb-24">
        {tab === "scan" && <Scanner studentId={user.studentId} onPointsChanged={handlePointsChanged} />}
        {tab === "dash" && <Dashboard studentId={user.studentId} livePoints={livePoints} />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-white/10 bg-ink2/95 backdrop-blur">
        <div className="grid grid-cols-2">
          <TabButton active={tab === "scan"} onClick={() => setTab("scan")} label="Scan"   icon="◎" />
          <TabButton active={tab === "dash"} onClick={() => setTab("dash")} label="Points" icon="▦" />
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
