import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login, setStoredUser } from "./api";

export default function Gatekeeper({ onEnter }) {
  const [id, setId] = useState("");

  const m = useMutation({
    mutationFn: (studentId) => login(studentId),
    onSuccess: (data) => {
      const user = { studentId: data.studentId, role: data.role || "student" };
      setStoredUser(user);
      onEnter(user);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!id.trim() || m.isPending) return;
    m.mutate(id.trim());
  };

  return (
    <main className="flex min-h-dvh flex-col justify-between bg-ink px-6 pb-10 pt-16 text-white">
      <div>
        {/* Eyebrow encodes the action, not decoration */}
        <p> </p>
        <h1 className="mt-5 font-display text-5xl font-bold leading-[0.95]">
          Engage More.
          <br />
          <span className="text-lime">Achieve More.</span>
          <br />
          Earn More.
        </h1>
        <p className="mt-4 max-w-xs font-display text-mist">
          Enter your student ID to open your scanner and start collecting.
        </p>
      </div>

      <form onSubmit={submit} className="mt-10">
        <label
          htmlFor="sid"
          className="mb-2 block font-mono text-xs uppercase tracking-widest text-mist"
        >
          Student ID
        </label>
        <input
          id="sid"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="mst12345"
          className="w-full rounded-2xl border border-white/10 bg-ink2 px-5 py-4 font-mono text-xl
            text-white placeholder:text-mist/40 outline-none transition
            focus:border-lime focus:ring-4 focus:ring-lime/20"
        />

        {m.isError && (
          <p className="mt-3 animate-shake font-display text-sm font-medium text-coral">
            {m.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={m.isPending || !id.trim()}
          className="mt-5 w-full rounded-2xl bg-lime py-4 font-display text-lg font-bold text-ink
            transition active:scale-[0.98] disabled:opacity-40"
        >
          {m.isPending ? "Checking…" : "Begin"}
        </button>
        <p className="mt-4 text-center font-mono text-xs text-mist/60">
          Try <span className="text-lime">mst12345</span>
        </p>
      </form>
    </main>
  );
}
