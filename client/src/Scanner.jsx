import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useMutation } from "@tanstack/react-query";
import { submitScan, pollScanStatus } from "./api";

const REGION_ID = "qr-reader";

export default function Scanner({ studentId, onPointsChanged }) {
  const scannerRef  = useRef(null);
  const startedRef  = useRef(false);
  const lastCodeRef = useRef(null);

  const [frozen,         setFrozen]         = useState(false);
  const [success,        setSuccess]        = useState(null);   // { awarded }
  const [errorMsg,       setErrorMsg]       = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);   // { requestId }

  // ── submit scan to server (creates pending approval) ─────────────────────────
  const submit = useMutation({
    mutationFn: (code) => submitScan(studentId, code),
    onSuccess: (data) => {
      setErrorMsg(null);
      setPendingRequest({ requestId: data.requestId });
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setTimeout(() => { setErrorMsg(null); resumeCamera(); }, 2200);
    },
  });

  // ── poll for teacher's decision every 2 s ────────────────────────────────────
  useEffect(() => {
    if (!pendingRequest) return;

    const interval = setInterval(async () => {
      try {
        const data = await pollScanStatus(pendingRequest.requestId);
        if (data.status === "approved") {
          clearInterval(interval);
          setPendingRequest(null);
          setSuccess({ awarded: data.awarded });
          onPointsChanged?.(data.points);
        } else if (data.status === "rejected") {
          clearInterval(interval);
          setPendingRequest(null);
          setErrorMsg("Scan was rejected by the teacher.");
          setTimeout(() => { setErrorMsg(null); resumeCamera(); }, 2500);
        }
      } catch { /* ignore network blips */ }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequest]);

  // ── camera callbacks ──────────────────────────────────────────────────────────
  function onScan(decodedText) {
    if (submit.isPending || frozen || pendingRequest) return;
    if (decodedText === lastCodeRef.current && success) return;
    lastCodeRef.current = decodedText;
    setFrozen(true);
    pauseCamera();
    submit.mutate(decodedText);
  }

  function pauseCamera()  { try { scannerRef.current?.pause(true); } catch {} }
  function resumeCamera() {
    setFrozen(false);
    try { scannerRef.current?.resume(); } catch {}
  }
  function scanNext() {
    setSuccess(null);
    lastCodeRef.current = null;
    resumeCamera();
  }

  // ── camera lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted    = true;
    let startPromise = null;

    async function startCamera() {
      if (startedRef.current) return;
      startedRef.current = true;
      const instance = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = instance;
      try {
        startPromise = instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
          onScan,
          () => {}
        );
        await startPromise;
      } catch {
        if (isMounted) setErrorMsg("Camera unavailable. Check browser permissions.");
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      startedRef.current = false;
      const inst = scannerRef.current;
      if (inst && startPromise) {
        startPromise
          .then(() => inst.stop().catch(() => {}).finally(() => inst.clear?.()))
          .catch(() => inst.clear?.());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-1 flex-col px-6 pt-8">
      <header className="relative z-20 mb-6">
        <h2 className="font-display text-2xl font-bold text-white">Point your camera</h2>
        <p className="font-display text-sm text-mist">Line up a reward QR inside the frame.</p>
      </header>

      {/* Viewfinder */}
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-[3000px] ring-ink/70">
          <Corner className="left-2 top-2 rotate-0" />
          <Corner className="right-2 top-2 rotate-90" />
          <Corner className="bottom-2 right-2 rotate-180" />
          <Corner className="bottom-2 left-2 -rotate-90" />
          {!frozen && (
            <span className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-lime/70 shadow-[0_0_12px_2px_rgba(198,255,61,0.6)]" />
          )}
        </div>

        <div id={REGION_ID} className="h-full w-full overflow-hidden rounded-3xl bg-black" />

        {/* "Reading…" — only while submitting, before we get a requestId */}
        {frozen && !pendingRequest && !success && !errorMsg && (
          <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-ink/60">
            <p className="font-display font-semibold text-lime">Reading…</p>
          </div>
        )}

        {/* "Awaiting approval" — while teacher hasn't acted yet */}
        {pendingRequest && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl bg-ink/85 px-6 text-center">
            <div className="h-9 w-9 rounded-full border-4 border-lime/25 border-t-lime animate-spin" />
            <p className="font-display font-semibold text-lime">Awaiting approval</p>
            <p className="font-mono text-xs text-mist">Teacher is reviewing your scan…</p>
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div
          role="alert"
          className="absolute inset-x-6 top-6 z-40 animate-shake rounded-2xl bg-coral px-5 py-4
            text-center font-display font-semibold text-white shadow-xl"
        >
          {errorMsg}
        </div>
      )}

      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-lime px-8 text-ink">
          <div className="animate-pop text-center">
            <div className="mb-4 text-7xl">🎉</div>
            <p className="font-mono text-sm uppercase tracking-[0.3em]">Reward claimed</p>
            <p className="mt-2 font-display text-6xl font-bold">+{success.awarded}</p>
            <p className="font-display text-xl font-semibold">points added</p>
          </div>
          <button
            onClick={scanNext}
            className="mt-12 w-full max-w-xs animate-pulseGlow rounded-2xl bg-ink py-4
              font-display text-lg font-bold text-lime active:scale-[0.98]"
          >
            Scan next
          </button>
        </div>
      )}
    </div>
  );
}

function Corner({ className }) {
  return (
    <span className={`absolute h-7 w-7 rounded-tl-xl border-l-4 border-t-4 border-lime ${className}`} />
  );
}
