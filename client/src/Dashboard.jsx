import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMe, fetchWalletInfo, fetchWalletNonce, registerWallet, disconnectWallet } from "./api";
import Scoreboard from "./Scoreboard";

// ── MetaMask wallet section ───────────────────────────────────────────────────

function WalletSection({ studentId }) {
  const queryClient = useQueryClient();
  const [status, setStatus]   = useState(null); // null | "connecting" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", studentId],
    queryFn: () => fetchWalletInfo(studentId),
  });

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);
  const walletAddress = walletData?.walletAddress;
  const explorerUrl   = walletData?.explorerUrl;

  async function handleConnect() {
    setStatus("connecting");
    setErrorMsg("");
    try {
      // 1. Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // 2. Get a one-time challenge from the server
      const { nonce, message } = await fetchWalletNonce(studentId);

      // 3. Ask MetaMask to sign it — proves ownership without any gas
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      // 4. Send address + signature to server for verification
      await registerWallet(studentId, address, signature, nonce);

      queryClient.invalidateQueries({ queryKey: ["wallet", studentId] });
      setStatus(null);
    } catch (err) {
      setErrorMsg(err.message || "Connection failed.");
      setStatus("error");
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectWallet(studentId);
      queryClient.invalidateQueries({ queryKey: ["wallet", studentId] });
    } catch (err) {
      setErrorMsg(err.message || "Could not disconnect.");
      setStatus("error");
    }
  }

  if (walletLoading) return null;

  // ── Mode B: wallet already connected ────────────────────────────────────────
  if (walletAddress) {
    return (
      <section className="mt-6 rounded-2xl bg-ink2 px-5 py-4 ring-1 ring-white/10">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-lime">
          On-chain proof active
        </p>
        <p className="font-mono text-xs text-mist break-all">{walletAddress}</p>
        <div className="mt-3 flex gap-3">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-lime underline underline-offset-2"
            >
              View on Etherscan ↗
            </a>
          )}
          <button
            onClick={handleDisconnect}
            className="font-mono text-xs text-mist hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
        {status === "error" && (
          <p className="mt-2 font-mono text-xs text-red-400">{errorMsg}</p>
        )}
      </section>
    );
  }

  // ── Mode A: no wallet — show opt-in prompt ───────────────────────────────────
  return (
    <section className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-4">
      <p className="font-mono text-xs uppercase tracking-widest text-mist">
        Blockchain proof (optional)
      </p>
      <p className="mt-1 font-display text-xs text-mist">
        Connect MetaMask to mint your attendance points as on-chain tokens. Points are always
        recorded here — this is purely additive.
      </p>

      {!hasMetaMask ? (
        <p className="mt-3 font-mono text-xs text-mist">
          MetaMask not detected.{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
            className="text-lime underline underline-offset-2"
          >
            Install it ↗
          </a>{" "}
          then come back.
        </p>
      ) : (
        <button
          onClick={handleConnect}
          disabled={status === "connecting"}
          className="mt-3 rounded-xl bg-lime px-4 py-2 font-mono text-xs font-semibold text-ink
                     disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
        >
          {status === "connecting" ? "Waiting for MetaMask…" : "Connect MetaMask"}
        </button>
      )}

      {status === "error" && (
        <p className="mt-2 font-mono text-xs text-red-400">{errorMsg}</p>
      )}
    </section>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ studentId, livePoints }) {
  const { data, isLoading } = useQuery({
    queryKey: ["me", studentId],
    queryFn: () => fetchMe(studentId),
  });

  const points  = livePoints ?? data?.points ?? 0;
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

      {/* Wallet section — opt-in, rendered below the balance card */}
      <WalletSection studentId={studentId} />

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
