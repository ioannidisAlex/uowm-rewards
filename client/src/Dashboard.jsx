import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";
import Scoreboard from "./Scoreboard";

export default function Dashboard({ studentId, livePoints }) {
  const { data, isLoading } = useQuery({
    queryKey: ["me", studentId],
    queryFn: () => fetchMe(studentId),
  });

  // Prefer the freshest value scans have pushed up, fall back to fetched.
  const points = livePoints ?? data?.points ?? 0;
  const history = data?.history ?? [];

  return (
    <div className="flex flex-1 flex-col px-6 pt-8">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-mist">
          Signed in as
        </p>
        <h2 className="font-display text-2xl font-bold text-white">
          {data?.name ?? studentId}
        </h2>
        {data?.name && (
          <p className="font-mono text-xs text-mist">{studentId}</p>
        )}
      </header>

      {/* Balance card */}
      <section className="rounded-3xl bg-gradient-to-br from-ink2 to-ink p-7 ring-1 ring-white/10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-lime">
          Total points
        </p>
        <div className="mt-5">
          <Scoreboard value={points} />
        </div>
        <p className="mt-5 font-display text-sm text-mist">
          Every scan adds 50. Keep going.
        </p>
      </section>

      {/* History */}
      <section className="mt-8 flex-1">
        <h3 className="mb-3 font-display text-lg font-semibold text-white">
          Recent scans
        </h3>

        {isLoading ? (
          <p className="font-display text-sm text-mist">Loading…</p>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="font-display text-mist">
              No scans yet. Head to the scanner and grab your first 50.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-2xl bg-ink2 px-4 py-3 ring-1 ring-white/5"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-lime">{h.lecture_id}</p>
                  <p className="truncate font-display text-sm text-white">{h.topic}</p>
                  <p className="font-mono text-xs text-mist">{h.transaction_date}</p>
                </div>
                <span className="shrink-0 font-display font-bold text-lime">
                  +{h.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
