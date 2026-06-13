import { useEffect, useRef, useState } from "react";

// A scoreboard-style counter that rolls from its previous value to the new one.
// This is the app's signature element — points landing should feel physical.
export default function Scoreboard({ value, size = "lg" }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const duration = 700;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const padded = String(display).padStart(4, "0");
  const digitClass =
    size === "lg"
      ? "text-6xl sm:text-7xl w-[0.62em] h-[1.25em]"
      : "text-2xl w-[0.62em] h-[1.4em]";

  return (
    <div className="flex gap-1.5" aria-label={`${display} points`} role="status">
      {padded.split("").map((d, i) => (
        <span
          key={i}
          className={`relative grid place-items-center rounded-lg bg-ink font-mono font-bold text-lime
            shadow-[inset_0_2px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(0,0,0,0.5)] ${digitClass}`}
        >
          {/* center seam, like a split-flap board */}
          <span className="pointer-events-none absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-black/40" />
          <span key={d} className="animate-rollIn">
            {d}
          </span>
        </span>
      ))}
    </div>
  );
}
