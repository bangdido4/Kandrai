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

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-800 ring-amber-500/20"
      : tone === "bad"
      ? "bg-rose-500/10 text-rose-800 ring-rose-500/20"
      : tone === "info"
      ? "bg-sky-500/10 text-sky-800 ring-sky-500/20"
      : "bg-black/5 text-black/70 ring-black/10";

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        toneCls
      )}
    >
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03),0_20px_60px_rgba(0,0,0,0.08)]">
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-5 border-b border-black/10">
      <div>
        <div className="text-black text-base font-semibold">{title}</div>
        {subtitle ? <div className="text-black/60 text-sm mt-1">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>;
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${v}%`,
          background: "var(--accent)",
        }}
      />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-black/5 text-black/70 ring-1 ring-black/10">
      {children}
    </span>
  );
}

export default function AnalyzePage() {
  const api = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

  const [role, setRole] = useState<"candidate" | "recruiter">("recruiter");
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [recruiterDoubt, setRecruiterDoubt] = useState("");

  const [health, setHealth] = useState<{ ok?: boolean; marker?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [tab, setTab] = useState<"overview" | "evidence" | "interview" | "json">("overview");

  const [debug, setDebug] = useState(false);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setDebug(q.get("debug") === "1");
    } catch {
      setDebug(false);
    }
  }, []);

  // Accent system (Recruiter = Blue, Candidate/Sandra = Teal/Green)
  const accent = role === "recruiter" ? "#2563EB" : "#10B981";
  const accentSoft = role === "recruiter" ? "rgba(37,99,235,0.10)" : "rgba(16,185,129,0.10)";

  const score = useMemo(() => {
    const p = result?.match_score?.percentage;
    return typeof p === "number" ? p : typeof result?.match_score_simple === "number" ? result.match_score_simple : null;
  }, [result]);

  const scoreLabel = result?.match_score?.label ?? result?.risk_level ?? "";
  const verdict = result?.executive_summary?.one_line_verdict ?? result?.verdict ?? "";
  const brutal = result?.match_score?.brutal_honesty ?? "";

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
    if (!api) {
      setRawText(JSON.stringify({ error: "Missing NEXT_PUBLIC_API_URL" }, null, 2));
      setTab("json");
      return;
    }

    setLoading(true);
    setResult(null);
    setRawText("");

    try {
      const payload = {
        role,
        job_description: jobDescription,
        cv_text: cvText,
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

  const canRun = !!api && cvText.trim().length > 0 && jobDescription.trim().length > 0 && !loading;

  const tabs = debug ? (["overview", "evidence", "interview", "json"] as const) : (["overview", "evidence", "interview"] as const);

  // Candidate-friendly interview presentation
  const interviewQuestions: string[] = result?.interview_plan?.top_7_questions ?? [];
  const redFlags: string[] = result?.interview_plan?.red_flags_to_verify ?? [];
  const workSample: string = result?.interview_plan?.work_sample_test ?? "";

  const candidatePrepTitle = "Interview prep (for you)";
  const recruiterInterviewTitle = "Interview plan (for recruiter)";

  return (
    <main
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #F6F7FB 0%, #EEF1F7 100%)",
        color: "#0B0F19",
        // CSS vars for accent use
        ["--accent" as any]: accent,
        ["--accent-soft" as any]: accentSoft,
      }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl ring-1 ring-black/10 flex items-center justify-center font-semibold text-white"
              style={{ background: "var(--accent)" }}
              aria-label="Kandrai"
            >
              K
            </div>
            <div>
              <div className="font-semibold leading-tight">Kandrai</div>
              <div className="text-xs text-black/60 leading-tight">
                {role === "recruiter" ? "Recruitment Intelligence" : "Candidate Intelligence"}
              </div>
            </div>
          </div>

          {/* Debug-only system info */}
          {debug ? (
            <div className="flex items-center gap-2">
              <Badge tone={health?.ok ? "good" : health?.error ? "bad" : "neutral"}>
                {health?.ok ? `API OK ${health?.marker ? `(${health.marker})` : ""}` : health?.error ? "API ERROR" : "API…"}
              </Badge>
              <Badge tone="neutral">
                <span className="text-black/60 mr-2">API</span>
                <span className="font-mono text-[11px]">{api || "MISSING"}</span>
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Pill>{role === "recruiter" ? "Recruiter mode" : "Candidate mode"}</Pill>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Explainable AI</Badge>
            <Badge tone="neutral">Evidence-backed</Badge>
            <Badge tone="neutral">Decision trace</Badge>
            <Badge tone="neutral">{role === "recruiter" ? "Hiring clarity" : "Interview preparation"}</Badge>
          </div>

          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            {role === "recruiter" ? (
              <>
                Hire with confidence.{" "}
                <span style={{ color: "var(--accent)" }}>Not gut feeling.</span>
              </>
            ) : (
              <>
                Prepare smarter.{" "}
                <span style={{ color: "var(--accent)" }}>Walk into interviews ready.</span>
              </>
            )}
          </h1>

          <p className="text-black/60 max-w-3xl text-base md:text-lg">
            {role === "recruiter"
              ? "Paste a CV and Job Description. Get a clear verdict, evidence, gaps and an interview plan — designed for real hiring decisions."
              : "Paste your CV and the Job Description. Get clear strengths, gaps, and what recruiters will likely ask — so you can improve fast."}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 pb-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader
            title="Inputs"
            subtitle={role === "recruiter" ? "CV + JD. Run analysis for hiring signals." : "CV + JD. Run analysis to prepare and improve."}
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRole("recruiter")}
                  className={classNames(
                    "px-3 py-2 rounded-xl border text-sm transition",
                    role === "recruiter" ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5"
                  )}
                >
                  Recruiter
                </button>
                <button
                  onClick={() => setRole("candidate")}
                  className={classNames(
                    "px-3 py-2 rounded-xl border text-sm transition",
                    role === "candidate" ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5"
                  )}
                >
                  Candidate
                </button>
              </div>
            }
          />
          <CardBody>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setCvText("");
                    setJobDescription("");
                    setRecruiterDoubt("");
                    setResult(null);
                    setRawText("");
                    setTab("overview");
                  }}
                  className="px-3 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-sm transition"
                >
                  Clear
                </button>

                <button
                  disabled={!canRun}
                  onClick={runAnalyze}
                  className={classNames(
                    "px-4 py-2 rounded-xl text-sm font-medium border transition shadow-sm",
                    !canRun ? "border-black/10 bg-black/5 text-black/40 cursor-not-allowed" : "border-black/10 text-white"
                  )}
                  style={!canRun ? undefined : { background: "var(--accent)" }}
                >
                  {loading ? "Running…" : role === "recruiter" ? "Run analysis" : "Get my prep"}
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    disabled={!result}
                    onClick={() => alert("PDF export is a paid feature. (We’ll wire Stripe/paywall next.)")}
                    className={classNames(
                      "px-3 py-2 rounded-xl border text-sm transition",
                      !result ? "border-black/10 bg-black/5 text-black/40 cursor-not-allowed" : "border-black/10 bg-white hover:bg-black/5"
                    )}
                    title="Paid feature"
                  >
                    Export PDF
                  </button>

                  {/* Debug-only JSON copy */}
                  {debug ? (
                    <button
                      onClick={() => copy(rawText || JSON.stringify(result ?? {}, null, 2))}
                      className="px-3 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-sm transition"
                    >
                      Copy JSON
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3">
                <label className="text-sm text-black/70">CV Text</label>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={10}
                  placeholder="Paste the CV here…"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ boxShadow: "0 0 0 0 rgba(0,0,0,0)", borderColor: "rgba(0,0,0,0.10)" }}
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm text-black/70">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  placeholder="Paste the Job Description here…"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                />
              </div>

              {role === "recruiter" ? (
                <div className="grid gap-3">
                  <label className="text-sm text-black/70">Recruiter doubt (optional)</label>
                  <input
                    value={recruiterDoubt}
                    onChange={(e) => setRecruiterDoubt(e.target.value)}
                    placeholder="e.g. Reliability, English level, job hopping…"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  />
                </div>
              ) : null}

              {/* Debug-only backend fields hint */}
              {debug ? (
                <div className="text-xs text-black/50">
                  Backend fields: <span className="font-mono">role, job_description, cv_text, recruiter_doubt</span>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader
            title="Results"
            subtitle={role === "recruiter" ? "Verdict, evidence, gaps and interview plan." : "Your strengths, gaps and interview preparation."}
            right={
              score !== null ? (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    {score}%
                  </span>
                  {scoreLabel ? <Badge tone="neutral">{scoreLabel}</Badge> : null}
                </div>
              ) : null
            }
          />
          <CardBody>
            {!result ? (
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="text-black/70 text-sm">
                  {role === "recruiter"
                    ? "Run an analysis to see hiring signals here."
                    : "Run an analysis to get your interview prep here."}
                </div>
                <div className="text-black/40 text-xs mt-2">
                  {debug ? `Health: ${health?.ok ? "OK" : health?.error ? health.error : "…"}` : "Tip: use realistic CV + JD for best results."}
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {tabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={classNames(
                        "px-3 py-2 rounded-xl border text-sm capitalize transition",
                        tab === t ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5"
                      )}
                    >
                      {t}
                    </button>
                  ))}

                  <div className="ml-auto flex items-center gap-2">
                    <Badge tone="neutral">{role === "recruiter" ? "Hiring view" : "Candidate view"}</Badge>
                  </div>
                </div>

                {/* Overview */}
                {tab === "overview" ? (
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-black/50">
                            {role === "recruiter" ? "Executive verdict" : "Your summary"}
                          </div>
                          <div className="text-black text-base font-semibold mt-1">{verdict || "—"}</div>
                        </div>
                        <div className="w-44">
                          <div className="text-xs text-black/50 mb-2">Match score</div>
                          <Progress value={score ?? 0} />
                        </div>
                      </div>

                      {brutal ? (
                        <div className="mt-4 text-sm text-black/70">
                          <span className="text-black/50">{role === "recruiter" ? "Brutal honesty:" : "What could block you:"}</span>{" "}
                          {brutal}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-black/10 bg-white p-5">
                        <div className="text-xs text-black/50">{role === "recruiter" ? "Hire now vs later" : "Timing"}</div>
                        <div className="text-black mt-1">{result?.executive_summary?.hire_now_vs_later ?? "—"}</div>
                      </div>
                      <div className="rounded-2xl border border-black/10 bg-white p-5">
                        <div className="text-xs text-black/50">{role === "recruiter" ? "Replacement cost risk" : "Risk level"}</div>
                        <div className="text-black mt-1">{result?.executive_summary?.replacement_cost_risk ?? scoreLabel || "—"}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <div className="text-xs text-black/50">{role === "recruiter" ? "Executive action" : "Next best action"}</div>
                      <div className="text-black mt-1">
                        {role === "recruiter"
                          ? result?.executive_summary?.executive_action ?? "—"
                          : (result?.decision_trace?.what_would_raise_score_fast?.[0] ?? result?.executive_summary?.executive_action ?? "—")}
                      </div>
                    </div>

                    {/* Skills gap */}
                    {result?.skills_gap ? (
                      <div className="rounded-2xl border border-black/10 bg-white p-5">
                        <div className="text-sm font-semibold mb-3">
                          {role === "recruiter" ? "Skills gap" : "What to improve"}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-black/50 mb-2">Missing hard skills</div>
                            <div className="flex flex-wrap gap-2">
                              {(result.skills_gap.missing_hard_skills ?? []).length ? (
                                result.skills_gap.missing_hard_skills.map((x: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1"
                                    style={{ background: "rgba(245,158,11,0.12)", color: "#92400E", borderColor: "rgba(245,158,11,0.20)" }}
                                  >
                                    {x}
                                  </span>
                                ))
                              ) : (
                                <Badge tone="good">None detected</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-black/50 mb-2">Missing soft skills</div>
                            <div className="flex flex-wrap gap-2">
                              {(result.skills_gap.missing_soft_skills ?? []).length ? (
                                result.skills_gap.missing_soft_skills.map((x: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1"
                                    style={{ background: "rgba(245,158,11,0.12)", color: "#92400E", borderColor: "rgba(245,158,11,0.20)" }}
                                  >
                                    {x}
                                  </span>
                                ))
                              ) : (
                                <Badge tone="good">None detected</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Evidence */}
                {tab === "evidence" ? (
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <div className="text-sm font-semibold mb-3">{role === "recruiter" ? "Evidence" : "What the system sees"}</div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-black/50 mb-2">CV signals</div>
                          <ul className="space-y-2 text-sm text-black/80">
                            {(result?.evidence?.cv_signals ?? []).map((x: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-black/30">•</span>
                                <span>{x}</span>
                              </li>
                            ))}
                            {!((result?.evidence?.cv_signals ?? []).length) ? <li className="text-black/40">—</li> : null}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs text-black/50 mb-2">JD signals</div>
                          <ul className="space-y-2 text-sm text-black/80">
                            {(result?.evidence?.jd_signals ?? []).map((x: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-black/30">•</span>
                                <span>{x}</span>
                              </li>
                            ))}
                            {!((result?.evidence?.jd_signals ?? []).length) ? <li className="text-black/40">—</li> : null}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-xs text-black/50 mb-2">{role === "recruiter" ? "Key mismatches" : "Your biggest gaps"}</div>
                        <div className="flex flex-wrap gap-2">
                          {(result?.evidence?.key_mismatches ?? []).map((x: string, i: number) => (
                            <Badge key={i} tone="bad">
                              {x}
                            </Badge>
                          ))}
                          {!((result?.evidence?.key_mismatches ?? []).length) ? <Badge tone="good">No major mismatches</Badge> : null}
                        </div>
                      </div>
                    </div>

                    {result?.decision_trace ? (
                      <div className="rounded-2xl border border-black/10 bg-white p-5">
                        <div className="text-sm font-semibold mb-3">{role === "recruiter" ? "Decision trace" : "How to improve fast"}</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-black/50 mb-2">{role === "recruiter" ? "Why this score" : "Why your score is this"}</div>
                            <ul className="space-y-2 text-sm text-black/80">
                              {(result.decision_trace.why_this_score ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-black/30">•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-black/50 mb-2">What would raise score fast</div>
                            <ul className="space-y-2 text-sm text-black/80">
                              {(result.decision_trace.what_would_raise_score_fast ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-black/30">•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Interview */}
                {tab === "interview" ? (
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <div className="text-sm font-semibold mb-3">
                        {role === "recruiter" ? recruiterInterviewTitle : candidatePrepTitle}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-black/50 mb-2">
                            {role === "recruiter" ? "Top questions" : "Questions you will likely get"}
                          </div>
                          <ul className="space-y-2 text-sm text-black/80">
                            {interviewQuestions.map((x: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span style={{ color: "var(--accent)" }}>•</span>
                                <span>{x}</span>
                              </li>
                            ))}
                            {!interviewQuestions.length ? <li className="text-black/40">—</li> : null}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs text-black/50 mb-2">
                            {role === "recruiter" ? "Red flags to verify" : "What could worry recruiters (prepare answers)"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {redFlags.map((x: string, i: number) => (
                              <Badge key={i} tone={role === "recruiter" ? "warn" : "info"}>
                                {x}
                              </Badge>
                            ))}
                            {!redFlags.length ? <Badge tone="good">None</Badge> : null}
                          </div>

                          <div className="mt-4">
                            <div className="text-xs text-black/50 mb-2">
                              {role === "recruiter" ? "Work sample test" : "What they may ask you to do"}
                            </div>
                            <div className="text-sm text-black/80">{workSample || "—"}</div>
                          </div>

                          {role === "candidate" ? (
                            <div className="mt-4 rounded-xl border border-black/10 p-4 bg-black/5">
                              <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>
                                Quick prep tip
                              </div>
                              <div className="text-sm text-black/70">
                                Use the “What would raise score fast” section to decide what to improve this week. Then rehearse answers for the red flags above.
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {(result?.skills_gap?.upskilling_plan_7_days || result?.skills_gap?.upskilling_plan_30_days) ? (
                      <div className="rounded-2xl border border-black/10 bg-white p-5">
                        <div className="text-sm font-semibold mb-3">{role === "recruiter" ? "Upskilling plan" : "Your improvement plan"}</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-black/50 mb-2">7 days</div>
                            <ul className="space-y-2 text-sm text-black/80">
                              {(result.skills_gap.upskilling_plan_7_days ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span style={{ color: "var(--accent)" }}>•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                              {!((result.skills_gap.upskilling_plan_7_days ?? []).length) ? <li className="text-black/40">—</li> : null}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-black/50 mb-2">30 days</div>
                            <ul className="space-y-2 text-sm text-black/80">
                              {(result.skills_gap.upskilling_plan_30_days ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span style={{ color: "var(--accent)" }}>•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                              {!((result.skills_gap.upskilling_plan_30_days ?? []).length) ? <li className="text-black/40">—</li> : null}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* JSON (debug-only) */}
                {tab === "json" ? (
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-black/50">Raw response</div>
                      <button
                        onClick={() => copy(rawText)}
                        className="px-3 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-sm transition"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs text-black/80 whitespace-pre-wrap break-words leading-relaxed">
                      {rawText ? rawText : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Footer subtle */}
      <div className="pb-10">
        <div className="mx-auto max-w-6xl px-4 text-xs text-black/40">
          {debug ? (
            <>Debug mode enabled. Add <span className="font-mono">?debug=1</span> to view API details & JSON.</>
          ) : (
            <>Kandrai • Explainable hiring signals & candidate preparation</>
          )}
        </div>
      </div>
    </main>
  );
}
