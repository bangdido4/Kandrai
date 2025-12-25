"use client";

import React, { useEffect, useMemo, useState } from "react";

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

function Badge({ children, tone, isDark }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "info" | "neutral"; isDark: boolean }) {
  const t = tone ?? "neutral";
  const cls =
    t === "good"
      ? "bg-emerald-500/12 text-emerald-200 ring-emerald-500/20"
      : t === "warn"
      ? "bg-amber-500/12 text-amber-200 ring-amber-500/20"
      : t === "bad"
      ? "bg-rose-500/12 text-rose-200 ring-rose-500/20"
      : t === "info"
      ? "bg-indigo-500/12 text-indigo-200 ring-indigo-500/20"
      : isDark
      ? "bg-white/6 text-white/70 ring-white/12"
      : "bg-black/[0.04] text-black/70 ring-black/10";

  return <span className={classNames("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 backdrop-blur", cls)}>{children}</span>;
}

function Card({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <div
      className={classNames(
        "rounded-3xl border backdrop-blur",
        isDark
          ? "border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.05),0_30px_80px_rgba(0,0,0,0.55)]"
          : "border-black/10 bg-white/70 shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_80px_rgba(0,0,0,0.12)]"
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, right, isDark }: { title: string; subtitle?: string; right?: React.ReactNode; isDark: boolean }) {
  return (
    <div className={classNames("flex items-start justify-between gap-3 p-6 border-b", isDark ? "border-white/10" : "border-black/10")}>
      <div className="min-w-0">
        <div className={classNames("font-semibold", isDark ? "text-white" : "text-black")}>{title}</div>
        {subtitle ? <div className={classNames("text-sm mt-1", isDark ? "text-white/60" : "text-black/60")}>{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function ScoreBar({ value, isDark }: { value: number; isDark: boolean }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={classNames("h-2 w-full rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-black/10")}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${v}%`,
          background: "linear-gradient(90deg, rgba(255,255,255,0.85), rgba(99,102,241,0.95), rgba(236,72,153,0.55))",
        }}
      />
    </div>
  );
}

function Skeleton({ isDark, className = "" }: { isDark: boolean; className?: string }) {
  return <div className={classNames("animate-pulse rounded-2xl", isDark ? "bg-white/10" : "bg-black/10", className)} />;
}

async function extractTxt(file: File) {
  return (await file.text()).trim();
}

async function extractDocx(file: File) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer });
  return String(res?.value ?? "").trim();
}

async function extractPdfViaBackend(apiBase: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${apiBase}/extract`, { method: "POST", body: fd });
  const text = await res.text();
  const parsed = safeJsonParse(text);

  if (!res.ok) {
    const msg = parsed.data?.detail || parsed.data?.error || `Extract failed (${res.status})`;
    throw new Error(String(msg));
  }
  const out = parsed.data?.text;
  if (!out || typeof out !== "string") throw new Error("Extract endpoint returned no text.");
  return out.trim();
}

async function extractAny(apiBase: string, file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return await extractTxt(file);
  if (name.endsWith(".docx")) return await extractDocx(file);
  if (name.endsWith(".pdf")) return await extractPdfViaBackend(apiBase, file);
  throw new Error("Unsupported file. Use PDF, DOCX or TXT.");
}

function DropZone({
  title,
  value,
  onText,
  apiBase,
  isDark,
}: {
  title: string;
  value: string;
  onText: (t: string) => void;
  apiBase: string;
  isDark: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handle(file: File) {
    setErr("");
    setBusy(true);
    try {
      const text = await extractAny(apiBase, file);
      onText(text);
      if (!text || text.length < 30) setErr("Extracted text is very short. Try another file or paste manually.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className={classNames("text-sm font-medium", isDark ? "text-white/80" : "text-black/80")}>{title}</div>
        <div className={classNames("text-xs", isDark ? "text-white/45" : "text-black/45")}>{busy ? "Extracting…" : "PDF/DOCX/TXT"}</div>
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
          if (f) await handle(f);
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
                if (f) await handle(f);
              }}
            />
          </label>

          <div className={classNames("text-sm", isDark ? "text-white/60" : "text-black/60")}>Drag & drop here</div>
        </div>

        {err ? <div className="mt-3 text-xs text-rose-400">{err}</div> : null}

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

export default function ClientAnalyze() {
  const api = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

  const [role, setRole] = useState<"candidate" | "recruiter">("recruiter");
  const [cvText, setCvText] = useState("");
  const [jdText, setJdText] = useState("");
  const [doubt, setDoubt] = useState("");

  const [health, setHealth] = useState<{ ok?: boolean; marker?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [rawText, setRawText] = useState("");
  const [tab, setTab] = useState<"overview" | "evidence" | "interview">("overview");

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kandrai_theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kandrai_theme", theme);
    } catch {}
  }, [theme]);

  const isDark = theme === "dark";

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
        if (!cancelled) setHealth(r.ok ? parsed.data : { error: `Health failed (${r.status})`, ...parsed.data });
      } catch (e: any) {
        if (!cancelled) setHealth({ error: String(e?.message || e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const score = useMemo(() => {
    const p = result?.match_score?.percentage;
    return typeof p === "number" ? p : null;
  }, [result]);

  const scoreLabel = result?.match_score?.label ?? "";
  const verdict = result?.executive_summary?.one_line_verdict ?? "";
  const brutal = result?.match_score?.brutal_honesty ?? "";

  const canRun = !!api && cvText.trim().length > 0 && jdText.trim().length > 0 && !loading;

  async function runAnalyze() {
    if (!api) return;
    setLoading(true);
    setResult(null);
    setRawText("");

    try {
      const payload = {
        role,
        job_description: jdText,
        candidate_text: cvText,
        recruiter_doubt: role === "recruiter" ? doubt : "",
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
        setTab("overview");
        return;
      }

      setResult(parsed.data);
      setTab("overview");
    } catch (e: any) {
      setResult({ error: String(e?.message || e) });
      setRawText(JSON.stringify({ error: String(e?.message || e) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title: "Kandrai", text: "Recruitment Intelligence", url });
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

  const pageBg = isDark
    ? "radial-gradient(900px 520px at 50% 0%, rgba(99,102,241,0.18), transparent 62%), radial-gradient(900px 600px at 100% 35%, rgba(14,165,233,0.08), transparent 62%), linear-gradient(180deg, #070A12 0%, #070A12 35%, #050711 100%)"
    : "radial-gradient(900px 520px at 50% 0%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(900px 600px at 100% 40%, rgba(14,165,233,0.08), transparent 58%), linear-gradient(180deg, #F7F8FF 0%, #EEF2FF 50%, #F3E8FF 100%)";

  const decision = (() => {
    const s = score ?? 0;
    if (s >= 85) return { t: "Strong hire", tone: "good" as const };
    if (s >= 70) return { t: "Hire", tone: "info" as const };
    if (s >= 55) return { t: "Borderline", tone: "warn" as const };
    return { t: "No-hire", tone: "bad" as const };
  })();

  return (
    <main className={classNames("min-h-screen", isDark ? "text-white" : "text-black")} style={{ background: pageBg }}>
      {/* Top */}
      <div className={classNames("sticky top-0 z-20 border-b backdrop-blur", isDark ? "border-white/10 bg-[#070A12]/70" : "border-black/10 bg-white/70")}>
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={classNames("h-9 w-9 rounded-xl border flex items-center justify-center font-semibold", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
              K
            </div>
            <div>
              <div className="font-semibold leading-tight">Kandrai</div>
              <div className={classNames("text-xs leading-tight", isDark ? "text-white/60" : "text-black/60")}>Recruitment Intelligence</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge isDark={isDark} tone={health?.ok ? "good" : health?.error ? "bad" : "neutral"}>
              {health?.ok ? "API OK" : health?.error ? "API ERROR" : "API…"}
            </Badge>

            <button
              onClick={share}
              className={classNames("px-3 py-2 rounded-xl border text-sm transition", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5")}
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
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-4 pt-14 pb-10 text-center">
        <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
          <Badge isDark={isDark} tone="info">Explainable AI</Badge>
          <Badge isDark={isDark} tone="neutral">Evidence-backed</Badge>
          <Badge isDark={isDark} tone="neutral">Interview plan</Badge>
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Recruitment <span className={classNames(isDark ? "text-indigo-300" : "text-indigo-700")}>intelligence</span>,{" "}
          <span className={classNames(isDark ? "text-white/75" : "text-black/75")}>built for real hiring decisions.</span>
        </h1>

        <p className={classNames("max-w-2xl mx-auto mt-4 text-base md:text-lg", isDark ? "text-white/60" : "text-black/60")}>
          Upload or paste a CV and Job Description.
          <br />
          Get verdict, evidence and interview guidance instantly.
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

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 pb-16 grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card isDark={isDark}>
            <CardHeader isDark={isDark} title="CV" subtitle="Upload PDF/DOCX/TXT or paste." />
            <CardBody>
              <DropZone title="Candidate CV" value={cvText} onText={setCvText} apiBase={api} isDark={isDark} />
            </CardBody>
          </Card>

          <Card isDark={isDark}>
            <CardHeader isDark={isDark} title="Job Description" subtitle="Upload PDF/DOCX/TXT or paste." />
            <CardBody>
              <DropZone title="Job description" value={jdText} onText={setJdText} apiBase={api} isDark={isDark} />

              {role === "recruiter" ? (
                <div className="mt-4">
                  <div className={classNames("text-sm mb-2", isDark ? "text-white/70" : "text-black/70")}>Recruiter doubt (optional)</div>
                  <input
                    value={doubt}
                    onChange={(e) => setDoubt(e.target.value)}
                    placeholder="e.g. Reliability, English level, job hopping…"
                    className={classNames(
                      "w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2",
                      isDark ? "border-white/10 bg-black/30 text-white placeholder:text-white/40 focus:ring-indigo-500/40" : "border-black/10 bg-white text-black placeholder:text-black/40 focus:ring-indigo-600/25"
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
                  onClick={() => {
                    setCvText("");
                    setJdText("");
                    setDoubt("");
                    setResult(null);
                    setRawText("");
                  }}
                  className={classNames("px-4 py-3 rounded-2xl text-sm border transition", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5")}
                >
                  Clear
                </button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card isDark={isDark}>
          <CardHeader
            isDark={isDark}
            title="Results"
            subtitle="Decision-ready output."
            right={
              score !== null ? (
                <div className="flex items-center gap-2">
                  <Badge isDark={isDark} tone={decision.tone}>{decision.t}</Badge>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white bg-indigo-600">{score}%</span>
                  {scoreLabel ? <Badge isDark={isDark} tone="neutral">{scoreLabel}</Badge> : null}
                </div>
              ) : null
            }
          />
          <CardBody>
            {!loading && !result ? (
              <div className={classNames("rounded-2xl border p-8 text-center", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                <div className={classNames("mx-auto h-12 w-12 rounded-2xl border flex items-center justify-center text-lg", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                  ✦
                </div>
                <div className="mt-4 text-lg font-semibold">Your results will appear here.</div>
                <div className={classNames("mt-2 text-sm", isDark ? "text-white/60" : "text-black/60")}>Upload PDF/DOCX/TXT or paste text, then run.</div>
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-4">
                <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                  <div className="flex flex-col md:flex-row gap-5 md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <Skeleton isDark={isDark} className="h-6 w-44" />
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
              </div>
            ) : null}

            {!loading && result ? (
              <>
                <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                  <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Decision summary</div>
                  <div className="mt-1 text-base font-semibold leading-snug break-words">{verdict || "—"}</div>

                  {brutal ? (
                    <div className={classNames("mt-3 text-sm leading-relaxed", isDark ? "text-white/75" : "text-black/75")}>
                      <span className={classNames("", isDark ? "text-white/50" : "text-black/50")}>Brutal honesty:</span> {brutal}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className={classNames("text-xs mb-2", isDark ? "text-white/50" : "text-black/50")}>Overall match</div>
                    <ScoreBar isDark={isDark} value={score ?? 0} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 my-5">
                  {(["overview", "evidence", "interview"] as const).map((t) => (
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
                </div>

                {tab === "overview" ? (
                  <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Hire now vs later</div>
                        <div className="mt-1">{result?.executive_summary?.hire_now_vs_later ?? "—"}</div>
                      </div>
                      <div>
                        <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Replacement cost risk</div>
                        <div className="mt-1">{(result?.executive_summary?.replacement_cost_risk ?? scoreLabel) || "—"}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className={classNames("text-xs", isDark ? "text-white/50" : "text-black/50")}>Executive action</div>
                      <div className="mt-1">{result?.executive_summary?.executive_action ?? "—"}</div>
                    </div>
                  </div>
                ) : null}

                {tab === "evidence" ? (
                  <div className={classNames("rounded-2xl border p-5", isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white/70")}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-semibold mb-2">CV signals</div>
                        <ul className={classNames("space-y-2 text-sm", isDark ? "text-white/80" : "text-black/75")}>
                          {(result?.evidence?.cv_signals ?? []).map((x: string, i: number) => (
                            <li key={i} className="flex gap-2"><span className={classNames(isDark ? "text-white/30" : "text-black/30")}>•</span><span>{x}</span></li>
                          ))}
                          {!((result?.evidence?.cv_signals ?? []).length) ? <li className={classNames(isDark ? "text-white/40" : "text-black/40")}>—</li> : null}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-2">JD signals</div>
                        <ul className={classNames("space-y-2 text-sm", isDark ? "text-white/80" : "text-black/75")}>
                          {(result?.evidence?.jd_signals ?? []).map((x: string, i: number) => (
                            <li key={i} className="flex gap-2"><span className={classNames(isDark ? "text-white/30" : "text-black/30")}>•</span><span>{x}</span></li>
                          ))}
                          {!((result?.evidence?.jd_signals ?? []).length) ? <li className={classNames(isDark ? "text-white/40" : "text-black/40")}>—</li> : null}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-sm font-semibold mb-2">Key mismatches</div>
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
                        <div className="text-sm font-semibold mb-2">Top questions</div>
                        <ul className={classNames("space-y-2 text-sm", isDark ? "text-white/80" : "text-black/75")}>
                          {(result?.interview_plan?.top_7_questions ?? []).map((x: string, i: number) => (
                            <li key={i} className="flex gap-2"><span className={classNames(isDark ? "text-white/30" : "text-black/30")}>•</span><span>{x}</span></li>
                          ))}
                          {!((result?.interview_plan?.top_7_questions ?? []).length) ? <li className={classNames(isDark ? "text-white/40" : "text-black/40")}>—</li> : null}
                        </ul>
                      </div>

                      <div>
                        <div className="text-sm font-semibold mb-2">Red flags to verify</div>
                        <div className="flex flex-wrap gap-2">
                          {(result?.interview_plan?.red_flags_to_verify ?? []).map((x: string, i: number) => (
                            <Badge key={i} isDark={isDark} tone="info">{x}</Badge>
                          ))}
                          {!((result?.interview_plan?.red_flags_to_verify ?? []).length) ? <Badge isDark={isDark} tone="good">None</Badge> : null}
                        </div>

                        <div className="mt-5">
                          <div className="text-sm font-semibold mb-2">Work sample test</div>
                          <div className={classNames("text-sm", isDark ? "text-white/75" : "text-black/75")}>{result?.interview_plan?.work_sample_test ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
