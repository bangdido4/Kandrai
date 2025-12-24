"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type AnalyzeResponse = any;

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function safeJsonParse(text: string) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: { raw: text } };
  }
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Badge({
  children,
  tone = "neutral",
  className = "",
  isDark,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  className?: string;
  isDark: boolean;
}) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-500/12 text-emerald-200 ring-emerald-500/20"
      : tone === "warn"
      ? "bg-amber-500/12 text-amber-200 ring-amber-500/20"
      : tone === "bad"
      ? "bg-rose-500/12 text-rose-200 ring-rose-500/20"
      : tone === "info"
      ? "bg-indigo-500/12 text-indigo-200 ring-indigo-500/20"
      : isDark
      ? "bg-white/6 text-white/70 ring-white/12"
      : "bg-black/[0.04] text-black/70 ring-black/10";

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 backdrop-blur",
        toneCls,
        className
      )}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
  isDark,
}: {
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}) {
  return (
    <div
      className={classNames(
        "rounded-3xl border backdrop-blur",
        isDark
          ? "border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.05),0_30px_80px_rgba(0,0,0,0.55)]"
          : "border-black/10 bg-white/60 shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_80px_rgba(0,0,0,0.12)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  right,
  isDark,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={classNames(
        "flex items-start justify-between gap-3 p-6 border-b",
        isDark ? "border-white/10" : "border-black/10"
      )}
    >
      <div className="min-w-0">
        <div className={classNames("font-semibold", isDark ? "text-white" : "text-black")}>{title}</div>
        {subtitle ? (
          <div className={classNames("text-sm mt-1", isDark ? "text-white/60" : "text-black/60")}>{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function ScoreMeter({ value, isDark }: { value: number; isDark: boolean }) {
  const v = clamp(Number.isFinite(value) ? value : 0, 0, 100);
  return (
    <div className={classNames("h-2 w-full rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-black/10")}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${v}%`,
          background: "linear-gradient(90deg, rgba(99,102,241,0.98), rgba(236,72,153,0.55), rgba(255,255,255,0.18))",
        }}
      />
    </div>
  );
}

function List({ items, isDark }: { items: string[]; isDark: boolean }) {
  if (!items?.length) return <div className={classNames("text-sm", isDark ? "text-white/40" : "text-black/40")}>—</div>;
  return (
    <ul className={classNames("space-y-2 text-sm", isDark ? "text-white/80" : "text-black/75")}>
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span className={classNames("", isDark ? "text-white/30" : "text-black/30")}>•</span>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

function LiveLine({ active, isDark }: { active: boolean; isDark: boolean }) {
  const [points, setPoints] = useState<number[]>(() => Array.from({ length: 42 }, () => 0.5));
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setPoints((prev) => {
        const last = prev[prev.length - 1] ?? 0.5;
        const next = clamp(last + (Math.random() - 0.5) * 0.18, 0.08, 0.92);
        const shifted = prev.slice(1);
        shifted.push(next);
        return shifted;
      });
    }, 120);
    return () => clearInterval(timerRef.current);
  }, [active]);

  const w = 520;
  const h = 44;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = (1 - p) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const stroke = isDark ? "rgba(99,102,241,0.95)" : "rgba(99,102,241,0.85)";
  const glow = isDark ? "rgba(99,102,241,0.30)" : "rgba(99,102,241,0.18)";

  return (
    <div className={classNames("w-full overflow-hidden rounded-2xl border p-3", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
        <path d={path} fill="none" stroke={glow} strokeWidth="6" opacity="0.7" />
      </svg>
      <div className={classNames("flex items-center justify-between text-[11px] mt-1", isDark ? "text-white/45" : "text-black/45")}>
        <span>Live signal</span>
        <span>{active ? "Active" : "Idle"}</span>
      </div>
    </div>
  );
}

function Skeleton({ className = "", isDark }: { className?: string; isDark: boolean }) {
  return <div className={classNames("animate-pulse rounded-2xl", isDark ? "bg-white/10" : "bg-black/10", className)} />;
}

/** ---- File text extraction (PDF/DOCX/TXT) ---- */
async function extractTextFromTxt(file: File) {
  return await file.text();
}
async function extractTextFromDocx(file: File) {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer });
  return (res?.value ?? "").trim();
}
async function extractTextFromPdf(file: File) {
  if (!(globalThis as any).DOMMatrix) {
    const dm = await import("dommatrix");
    (globalThis as any).DOMMatrix = (dm as any).DOMMatrix;
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
  // @ts-ignore
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js";
  }
  const data = new Uint8Array(await file.arrayBuffer());
  // @ts-ignore
  const pdf = await pdfjs.getDocument({ data }).promise;

  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items as any[]).map((it) => (it?.str ? String(it.str) : ""));
    full += strings.join(" ") + "\n";
  }
  return full.trim();
}
async function extractTextFromFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return await extractTextFromTxt(file);
  if (name.endsWith(".docx")) return await extractTextFromDocx(file);
  if (name.endsWith(".pdf")) return await extractTextFromPdf(file);
  throw new Error("Unsupported file. Use PDF, DOCX or TXT.");
}

function DropZone({
  label,
  value,
  onText,
  hint,
  isDark,
}: {
  label: string;
  value: string;
  onText: (text: string) => void;
  hint?: string;
  isDark: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function handleFile(file: File) {
    setErr("");
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 20) setErr("File loaded but text looks empty/too short.");
      onText(text);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className={classNames("text-sm", isDark ? "text-white/80" : "text-black/80")}>{label}</div>
        <div className={classNames("text-xs", isDark ? "text-white/45" : "text-black/45")}>{busy ? "Extracting…" : hint ?? "PDF / DOCX / TXT"}</div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const f = e.dataTransfer.files?.[0];
          if (f) await handleFile(f);
        }}
        className={classNames(
          "rounded-2xl border p-4 transition",
          isDark ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]" : "border-black/10 bg-white/70 hover:bg-white"
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={classNames(
              "inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition",
              isDark ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07] text-white" : "border-black/10 bg-white hover:bg-black/5 text-black"
            )}
          >
            <span>📎 Upload</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await handleFile(f);
              }}
            />
          </label>

          <div className={classNames("text-sm", isDark ? "text-white/60" : "text-black/60")}>Drag & drop your file here</div>
          {busy ? <div className={classNames("ml-auto text-xs", isDark ? "text-white/50" : "text-black/50")}>Working…</div> : null}
        </div>

        {err ? <div className="mt-3 text-xs text-rose-500">{err}</div> : null}

        <div className="mt-4">
          <textarea
            value={value}
            onChange={(e) => onText(e.target.value)}
            rows={10}
            placeholder="…or paste text here"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            className={classNames(
              "w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2",
              isDark
                ? "border-white/10 bg-black/30 text-white placeholder:text-white/40 focus:ring-indigo-500/40"
                : "border-black/10 bg-white text-black placeholder:text-black/40 focus:ring-indigo-600/25"
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const api = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

  const [role, setRole] = useState<"candidate" | "recruiter">("recruiter");
  const [candidateText, setCandidateText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [recruiterDoubt, setRecruiterDoubt] = useState("");

  const [health, setHealth] = useState<{ ok?: boolean; marker?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [tab, setTab] = useState<"overview" | "evidence" | "interview" | "json">("overview");

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [debug, setDebug] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const q = new URLSearchParams(window.location.search);
      setDebug(q.get("debug") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kandrai_theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
      else setTheme("dark");
    } catch {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("kandrai_theme", theme);
    } catch {}
  }, [theme]);

  const isDark = theme === "dark";

  const score = useMemo(() => {
    const p = result?.match_score?.percentage;
    return typeof p === "number" ? p : null;
  }, [result]);

  const scoreLabel = result?.match_score?.label ?? "";
  const verdict = result?.executive_summary?.one_line_verdict ?? "";
  const brutal = result?.match_score?.brutal_honesty ?? "";
  const confidence = result?.match_score?.confidence_index ?? null;
  const confidenceExplain = result?.match_score?.confidence_explanation ?? "";
  const marketContext = result?.match_score?.market_context ?? "";

  const canRun = !!api && candidateText.trim().length > 0 && jobDescription.trim().length > 0 && !loading;
  const tabs = debug ? (["overview", "evidence", "interview", "json"] as const) : (["overview", "evidence", "interview"] as const);

  useEffect(() => {
    if (!api) {
      setHealth({ error: "NEXT_PUBLIC_API_URL missing" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${api}/health`, { cache: "no-store" });
        const t = await r.text();
        const parsed = safeJsonParse(t);
        if (!cancelled) {
          if (!r.ok) setHealth({ error: `Health check failed (${r.status})`, ...parsed.data });
          else setHealth(parsed.data);
        }
      } catch (e: any) {
        if (!cancelled) setHealth({ error: String(e?.message || e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function runAnalyze() {
    if (!api) return;
    setLoading(true);
    setResult(null);
    setRawText("");

    try {
      const payload = {
        role,
        job_description: jobDescription,
        candidate_text: candidateText,
        recruiter_doubt: role === "recruiter" ? recruiterDoubt : "",
      };

      const res = await fetch(`${api}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      setRawText(text);

      const parsed = safeJsonParse(text);
      if (!res.ok) {
        setResult({ error: res.status, ...parsed.data });
        setTab("json");
        return;
      }

      setResult(parsed.data);
      setTab("overview");
    } catch (err: any) {
      setResult({ error: String(err?.message || err) });
      setRawText(JSON.stringify({ error: String(err?.message || err) }, null, 2));
      setTab("json");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = "Kandrai — Recruitment Intelligence";
    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title, text: "Kandrai analysis", url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied.");
    } catch {
      alert(url);
    }
  }

  const copyLabels =
    role === "candidate"
      ? {
          heroSubA: "Upload or paste a CV and Job Description.",
          heroSubB: "Get verdict, evidence and interview guidance instantly.",
          resultsSubtitle: "Prep-ready output.",
          timingLabel: "Timing",
          riskLabel: "Risk level",
          actionLabel: "Next best action",
          questionsLabel: "Questions you will likely get",
          redFlagsLabel: "What may worry recruiters",
          workSampleLabel: "What they may ask you to do",
          emptyTitle: "Your results will appear here.",
          emptySub: "Upload files or paste text, then run analysis.",
        }
      : {
          heroSubA: "Upload or paste a CV and Job Description.",
          heroSubB: "Get verdict, evidence and interview guidance instantly.",
          resultsSubtitle: "Decision-ready output.",
          timingLabel: "Hire now vs later",
          riskLabel: "Replacement cost risk",
          actionLabel: "Executive action",
          questionsLabel: "Top questions",
          redFlagsLabel: "Red flags to verify",
          workSampleLabel: "Work sample test",
          emptyTitle: "Run analysis to generate the decision packet.",
          emptySub: "Upload the CV + JD, add doubt (optional), then run.",
        };

  const decisionTag = useMemo(() => {
    const s = score ?? 0;
    if (s >= 85) return { t: "Strong hire", tone: "good" as const };
    if (s >= 70) return { t: "Hire", tone: "info" as const };
    if (s >= 55) return { t: "Borderline", tone: "warn" as const };
    return { t: "No-hire", tone: "bad" as const };
  }, [score]);

  // ✅ Dark background cleaned (NO dirty pink on the left)
  const pageBg = isDark
    ? "radial-gradient(900px 520px at 50% 0%, rgba(99,102,241,0.18), transparent 62%), radial-gradient(900px 600px at 100% 35%, rgba(14,165,233,0.08), transparent 62%), linear-gradient(180deg, #070A12 0%, #070A12 35%, #050711 100%)"
    : "radial-gradient(900px 520px at 50% 0%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(900px 600px at 100% 40%, rgba(14,165,233,0.08), transparent 58%), linear-gradient(180deg, #F7F8FF 0%, #EEF2FF 50%, #F3E8FF 100%)";

  return (
    <main className={classNames("min-h-screen", isDark ? "text-white" : "text-black")} style={{ background: pageBg }}>
      {/* TOP BAR */}
      <div className={classNames("sticky top-0 z-20 border-b backdrop-blur", isDark ? "border-white/10 bg-[#070A12]/70" : "border-black/10 bg-white/70")}>
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={classNames("h-9 w-9 rounded-xl border flex items-center justify-center font-semibold", isDark ? "border-white/10 bg-white/5 text-white" : "border-black/10 bg-white text-black")}>
              K
            </div>
            <div>
              <div className={classNames("font-semibold leading-tight", isDark ? "text-white" : "text-black")}>Kandrai</div>
              <div className={classNames("text-xs leading-tight", isDark ? "text-white/60" : "text-black/60")}>Recruitment Intelligence</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={share}
              className={classNames("px-3 py-2 rounded-xl border text-sm transition", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5")}
              title="Share"
            >
              Share
            </button>

            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={classNames("px-3 py-2 rounded-xl border text-sm transition", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5")}
              title="Toggle theme"
            >
              {isDark ? "🌞" : "🌙"}
            </button>

            {debug ? (
              <div className="hidden md:flex items-center gap-2">
                <Badge isDark={isDark} tone={health?.ok ? "good" : health?.error ? "bad" : "neutral"}>
                  {health?.ok ? `API OK ${health?.marker ? `(${health.marker})` : ""}` : health?.error ? "API ERROR" : "API…"}
                </Badge>
                <Badge isDark={isDark} tone="neutral">
                  <span className={classNames("mr-2", isDark ? "text-white/60" : "text-black/60")}>API</span>
                  <span className={classNames("font-mono text-[11px]", isDark ? "text-white/80" : "text-black/80")}>{api || "MISSING"}</span>
                </Badge>
              </div>
            ) : (
              <Badge isDark={isDark} tone="info">{role === "recruiter" ? "Recruiter mode" : "Candidate mode"}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className={classNames("mx-auto max-w-4xl px-4 pt-14 pb-10 text-center transition-all duration-700", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
        <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
          <Badge isDark={isDark} tone="info">Explainable AI</Badge>
          <Badge isDark={isDark} tone="neutral">Evidence-backed</Badge>
          <Badge isDark={isDark} tone="neutral">Decision trace</Badge>
          <Badge isDark={isDark} tone="neutral">Interview plan</Badge>
        </div>

        <h1 className={classNames("text-3xl md:text-5xl font-semibold tracking-tight", isDark ? "text-white" : "text-black")}>
          Recruitment{" "}
          <span className={classNames("font-semibold", isDark ? "text-indigo-300" : "text-indigo-600")}>intelligence</span>,{" "}
          <span className={classNames(isDark ? "text-white/75" : "text-black/75")}>built for real hiring decisions.</span>
        </h1>

        <p className={classNames("max-w-2xl mx-auto mt-4 text-base md:text-lg", isDark ? "text-white/60" : "text-black/60")}>
          {copyLabels.heroSubA}
          <br />
          {copyLabels.heroSubB}
        </p>

        <div className="mt-7 flex items-center justify-center gap-2">
          <button
            onClick={() => setRole("recruiter")}
            className={classNames(
              "px-4 py-2 rounded-full border text-sm transition",
              role === "recruiter"
                ? isDark
                  ? "border-white/20 bg-white/10"
                  : "border-black/20 bg-black/5"
                : isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-black/10 bg-white hover:bg-black/5"
            )}
          >
            Recruiter
          </button>
          <button
            onClick={() => setRole("candidate")}
            className={classNames(
              "px-4 py-2 rounded-full border text-sm transition",
              role === "candidate"
                ? isDark
                  ? "border-white/20 bg-white/10"
                  : "border-black/20 bg-black/5"
                : isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-black/10 bg-white hover:bg-black/5"
            )}
          >
            Candidate
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className={classNames("mx-auto max-w-6xl px-4 pb-16 grid grid-cols-1 gap-6 transition-all duration-700", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
        {/* Row 1: CV + JD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card isDark={isDark}>
            <CardHeader isDark={isDark} title={role === "recruiter" ? "CV (candidate)" : "Your CV"} subtitle="Upload (PDF/DOCX/TXT) or paste." />
            <CardBody>
              <DropZone isDark={isDark} label="CV file" value={candidateText} onText={setCandidateText} hint="PDF / DOCX / TXT" />
            </CardBody>
          </Card>

          <Card isDark={isDark}>
            <CardHeader isDark={isDark} title="Job Description" subtitle="Upload (PDF/DOCX/TXT) or paste." />
            <CardBody>
              <DropZone isDark={isDark} label="Job description file" value={jobDescription} onText={setJobDescription} hint="PDF / DOCX / TXT" />

              {role === "recruiter" ? (
                <div className="mt-4">
                  <div className={classNames("text-sm mb-2", isDark ? "text-white/70" : "text-black/70")}>Recruiter doubt (optional)</div>
                  <input
                    value={recruiterDoubt}
                    onChange={(e) => setRecruiterDoubt(e.target.value)}
                    placeholder="e.g. Reliability, English level, job hopping…"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-gramm="false"
                    className={classNames(
                      "w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2",
                      isDark
                        ? "border-white/10 bg-black/30 text-white placeholder:text-white/40 focus:ring-indigo-500/40"
                        : "border-black/10 bg-white text-black placeholder:text-black/40 focus:ring-indigo-600/25"
                    )}
                  />
                </div>
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                <button
                  disabled={!canRun}
                  onClick={runAnalyze}
                  className={classNames(
                    "px-5 py-3 rounded-2xl text-sm font-medium border transition",
                    !canRun
                      ? isDark
                        ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                        : "border-black/10 bg-black/5 text-black/40 cursor-not-allowed"
                      : "border-indigo-500/40 bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_12px_40px_rgba(99,102,241,0.30)]"
                  )}
                >
                  {loading ? "Analyzing…" : "Run analysis"}
                </button>

                <button
                  disabled={!result}
                  onClick={() => alert("PDF export is a Pro feature. Next step.")}
                  className={classNames(
                    "px-4 py-3 rounded-2xl text-sm border transition",
                    !result
                      ? isDark
                        ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                        : "border-black/10 bg-black/5 text-black/40 cursor-not-allowed"
                      : isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-white opacity-70 hover:opacity-95"
                      : "border-black/10 bg-white hover:bg-black/5 text-black opacity-70 hover:opacity-95"
                  )}
                >
                  Export PDF (Pro)
                </button>

                {debug ? (
                  <button
                    onClick={() => copy(rawText || JSON.stringify(result ?? {}, null, 2))}
                    className={classNames(
                      "ml-auto px-4 py-3 rounded-2xl text-sm border transition",
                      isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5"
                    )}
                  >
                    Copy JSON
                  </button>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Results */}
        <Card isDark={isDark} className={isDark ? "shadow-[0_20px_80px_rgba(0,0,0,0.65)]" : ""}>
          <CardHeader
            isDark={isDark}
            title="Results"
            subtitle={copyLabels.resultsSubtitle}
            right={
              score !== null ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white bg-indigo-600">
                    {score}%
                  </span>
                  {scoreLabel ? <Badge isDark={isDark} tone="neutral">{scoreLabel}</Badge> : null}
                </div>
              ) : null
            }
          />
          <CardBody>
            {/* ✅ Empty state PRO (no weird VC header / no No-hire) */}
            {!loading && !result ? (
              <div className={classNames("rounded-2xl border p-8 text-center", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                <div className={classNames("mx-auto h-12 w-12 rounded-2xl border flex items-center justify-center text-lg", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                  ✦
                </div>
                <div className={classNames("mt-4 text-lg font-semibold", isDark ? "text-white" : "text-black")}>{copyLabels.emptyTitle}</div>
                <div className={classNames("mt-2 text-sm", isDark ? "text-white/60" : "text-black/60")}>{copyLabels.emptySub}</div>

                <div className="mt-6 grid gap-3 max-w-xl mx-auto">
                  <div className={classNames("rounded-2xl border p-4 text-left", isDark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-white")}>
                    <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Quick checklist</div>
                    <div className={classNames("mt-2 text-sm", isDark ? "text-white/75" : "text-black/70")}>
                      1) Upload CV + JD (or paste) · 2) Optional doubt · 3) Run analysis
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Loading skeleton */}
            {loading ? (
              <div className="grid gap-4">
                <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                  <div className="flex flex-col md:flex-row gap-5 md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <Skeleton isDark={isDark} className="h-6 w-40" />
                      <Skeleton isDark={isDark} className="h-5 w-[90%] mt-3" />
                      <Skeleton isDark={isDark} className="h-5 w-[70%] mt-2" />
                    </div>
                    <div className="flex-none w-full md:w-80">
                      <Skeleton isDark={isDark} className="h-4 w-28 mb-3" />
                      <Skeleton isDark={isDark} className="h-2 w-full" />
                      <Skeleton isDark={isDark} className="h-3 w-44 mt-4" />
                    </div>
                  </div>
                </div>
                <Skeleton isDark={isDark} className="h-16" />
                <div className={classNames("grid md:grid-cols-2 gap-4")}>
                  <Skeleton isDark={isDark} className="h-28" />
                  <Skeleton isDark={isDark} className="h-28" />
                </div>
              </div>
            ) : null}

            {/* ✅ VC header ONLY when result exists */}
            {!loading && result ? (
              <>
                <div className="mb-5">
                  <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                    {/* Key fix: stable widths + min-w-0 to avoid word stacking */}
                    <div className="flex flex-col md:flex-row gap-5 md:items-start md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge isDark={isDark} tone={decisionTag.tone}>{decisionTag.t}</Badge>
                          {confidence !== null ? (
                            <Badge isDark={isDark} tone="info">Confidence {Math.round((Number(confidence) || 0) * 100)}%</Badge>
                          ) : null}
                          {health?.ok && !debug ? <Badge isDark={isDark} tone="neutral">API verified</Badge> : null}
                        </div>

                        <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Decision summary</div>
                        <div className={classNames("mt-1 text-base font-semibold leading-snug break-words", isDark ? "text-white" : "text-black")}>
                          {verdict || "—"}
                        </div>

                        {brutal ? (
                          <div className={classNames("mt-3 text-sm leading-relaxed", isDark ? "text-white/75" : "text-black/75")}>
                            <span className={classNames("", isDark ? "text-white/50" : "text-black/50")}>Brutal honesty:</span> {brutal}
                          </div>
                        ) : null}

                        {confidenceExplain ? (
                          <div className={classNames("mt-3 text-sm leading-relaxed", isDark ? "text-white/65" : "text-black/65")}>
                            <span className={classNames("", isDark ? "text-white/50" : "text-black/50")}>Why confidence:</span> {confidenceExplain}
                          </div>
                        ) : null}

                        {marketContext ? (
                          <div className={classNames("mt-3 text-sm leading-relaxed", isDark ? "text-white/65" : "text-black/65")}>
                            <span className={classNames("", isDark ? "text-white/50" : "text-black/50")}>Market context:</span> {marketContext}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex-none w-full md:w-80">
                        <div className={classNames("text-xs mb-2", isDark ? "text-white/50" : "text-black/50")}>Overall match</div>
                        <ScoreMeter isDark={isDark} value={score ?? 0} />
                        <div className={classNames("mt-3 text-xs", isDark ? "text-white/45" : "text-black/45")}>
                          VC-style: score + confidence + blockers.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live line only when result exists */}
                <div className="mb-5">
                  <LiveLine isDark={isDark} active={true} />
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {tabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={classNames(
                        "px-4 py-2 rounded-2xl border text-sm capitalize transition",
                        isDark
                          ? tab === t
                            ? "border-white/20 bg-white/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                          : tab === t
                          ? "border-black/20 bg-black/5"
                          : "border-black/10 bg-white hover:bg-black/5"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                  <div className="ml-auto">
                    <Badge isDark={isDark} tone="info">{role === "recruiter" ? "Recruiter view" : "Candidate view"}</Badge>
                  </div>
                </div>

                {tab === "overview" ? (
                  <div className="grid gap-4">
                    <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>{copyLabels.timingLabel}</div>
                          <div className={classNames("mt-1", isDark ? "text-white" : "text-black")}>{result?.executive_summary?.hire_now_vs_later ?? "—"}</div>
                        </div>
                        <div>
                          <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>{copyLabels.riskLabel}</div>
                          <div className={classNames("mt-1", isDark ? "text-white" : "text-black")}>
                            {(result?.executive_summary?.replacement_cost_risk ?? scoreLabel) || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>{copyLabels.actionLabel}</div>
                        <div className={classNames("mt-1", isDark ? "text-white" : "text-black")}>{result?.executive_summary?.executive_action ?? "—"}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === "evidence" ? (
                  <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className={classNames("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>CV signals</div>
                        <List isDark={isDark} items={result?.evidence?.cv_signals ?? []} />
                      </div>
                      <div>
                        <div className={classNames("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>JD signals</div>
                        <List isDark={isDark} items={result?.evidence?.jd_signals ?? []} />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className={classNames("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>Key mismatches</div>
                      <div className="flex flex-wrap gap-2">
                        {(result?.evidence?.key_mismatches ?? []).map((x: string, i: number) => (
                          <Badge key={i} isDark={isDark} tone="bad">{x}</Badge>
                        ))}
                        {!((result?.evidence?.key_mismatches ?? []).length) ? <Badge isDark={isDark} tone="good">No major mismatches</Badge> : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === "interview" ? (
                  <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className={classNames("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>{copyLabels.questionsLabel}</div>
                        <List isDark={isDark} items={result?.interview_plan?.top_7_questions ?? []} />
                      </div>

                      <div>
                        <div className={classNames("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>{copyLabels.redFlagsLabel}</div>
                        <div className="flex flex-wrap gap-2">
                          {(result?.interview_plan?.red_flags_to_verify ?? []).map((x: string, i: number) => (
                            <Badge key={i} isDark={isDark} tone="info">{x}</Badge>
                          ))}
                          {!((result?.interview_plan?.red_flags_to_verify ?? []).length) ? <Badge isDark={isDark} tone="good">None</Badge> : null}
                        </div>

                        <div className="mt-5">
                          <div className={classNames("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>{copyLabels.workSampleLabel}</div>
                          <div className={classNames("text-sm", isDark ? "text-white/75" : "text-black/75")}>
                            {result?.interview_plan?.work_sample_test ?? "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === "json" ? (
                  <div className={classNames("rounded-2xl border p-4", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Raw response</div>
                      <button
                        onClick={() => copy(rawText)}
                        className={classNames("px-3 py-2 rounded-xl border text-sm transition", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5")}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className={classNames("text-xs whitespace-pre-wrap break-words leading-relaxed", isDark ? "text-white/80" : "text-black/80")}>
                      {rawText ? rawText : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardBody>
        </Card>

        <div className={classNames("text-center text-xs mt-2", isDark ? "text-white/40" : "text-black/45")}>
          {debug ? (
            <>
              Debug enabled. Add <span className="font-mono">?debug=1</span> to see API + JSON.
            </>
          ) : (
            <>Kandrai — recruitment intelligence for high-stakes hiring</>
          )}
        </div>
      </div>
    </main>
  );
}
