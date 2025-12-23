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
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
      : tone === "bad"
      ? "bg-rose-500/10 text-rose-200 ring-rose-500/20"
      : tone === "info"
      ? "bg-sky-500/10 text-sky-200 ring-sky-500/20"
      : "bg-white/5 text-white/80 ring-white/10";

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

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const tone =
    v >= 80
      ? "bg-emerald-400"
      : v >= 60
      ? "bg-sky-400"
      : v >= 40
      ? "bg-amber-400"
      : "bg-rose-400";
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className={classNames("h-full rounded-full", tone)} style={{ width: `${v}%` }} />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.5)]">
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
    <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
      <div>
        <div className="text-white text-base font-semibold">{title}</div>
        {subtitle ? <div className="text-white/60 text-sm mt-1">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>;
}

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={classNames("h-3 rounded bg-white/10 animate-pulse", w)} />;
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

  const score = useMemo(() => {
    const p = result?.match_score?.percentage;
    return typeof p === "number" ? p : null;
  }, [result]);

  const scoreLabel = result?.match_score?.label ?? "";
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
      // ✅ ALIGNMENT WITH NEW BACKEND (main.py)
      const payload = {
        role, // optional in backend, but sending is fine
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

  const toneFromScore = (p: number | null) => {
    if (p === null) return "neutral" as const;
    if (p >= 80) return "good" as const;
    if (p >= 60) return "info" as const;
    if (p >= 40) return "warn" as const;
    return "bad" as const;
  };

  const canRun = !!api && cvText.trim().length > 0 && jobDescription.trim().length > 0 && !loading;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#070A12]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center font-semibold">
              K
            </div>
            <div>
              <div className="font-semibold leading-tight">Kandrai</div>
              <div className="text-xs text-white/60 leading-tight">Recruitment Intelligence</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={health?.ok ? "good" : health?.error ? "bad" : "neutral"}>
              {health?.ok ? `API OK ${health?.marker ? `(${health.marker})` : ""}` : health?.error ? "API ERROR" : "API…"}
            </Badge>
            <Badge tone="neutral">
              <span className="text-white/60 mr-2">API</span>
              <span className="font-mono text-[11px]">{api || "MISSING"}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Explainable AI</Badge>
            <Badge tone="neutral">Structured output</Badge>
            <Badge tone="neutral">Decision trace</Badge>
            <Badge tone="neutral">Interview plan</Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Explainable CV ↔ JD intelligence, <span className="text-white/70">built for decision speed</span>
          </h1>

          <p className="text-white/60 max-w-3xl">
            Paste a CV and a Job Description. Get a structured verdict, evidence, gaps, interview plan and decision trace —
            ready for SaaS UI.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 pb-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader
            title="Inputs"
            subtitle="CV + Job Description. Choose a role and run analysis."
            right={
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{role === "recruiter" ? "Recruiter mode" : "Candidate mode"}</Badge>
              </div>
            }
          />
          <CardBody>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setRole("recruiter")}
                  className={classNames(
                    "px-3 py-2 rounded-xl border text-sm",
                    role === "recruiter" ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  Recruiter
                </button>
                <button
                  onClick={() => setRole("candidate")}
                  className={classNames(
                    "px-3 py-2 rounded-xl border text-sm",
                    role === "candidate" ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  Candidate
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCvText("");
                      setJobDescription("");
                      setRecruiterDoubt("");
                      setResult(null);
                      setRawText("");
                      setTab("overview");
                    }}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                  >
                    Clear
                  </button>

                  <button
                    disabled={!canRun}
                    onClick={runAnalyze}
                    className={classNames(
                      "px-4 py-2 rounded-xl text-sm font-medium border transition",
                      !canRun
                        ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                        : "border-white/20 bg-white text-black hover:bg-white/90"
                    )}
                  >
                    {loading ? "Running…" : "Run Analyze"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <label className="text-sm text-white/70">Candidate / CV Text</label>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={10}
                  placeholder="Paste candidate CV here..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm text-white/70">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  placeholder="Paste job description here..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {role === "recruiter" ? (
                <div className="grid gap-3">
                  <label className="text-sm text-white/70">Recruiter doubt (optional)</label>
                  <input
                    value={recruiterDoubt}
                    onChange={(e) => setRecruiterDoubt(e.target.value)}
                    placeholder="e.g. Worried about job hopping / English level / reliability..."
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              ) : null}

              <div className="text-xs text-white/50">
                Backend fields: <span className="font-mono">role, job_description, cv_text, recruiter_doubt</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader
            title="Output"
            subtitle="Verdict, evidence, gaps and interview plan. UI-ready."
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(rawText || JSON.stringify(result ?? {}, null, 2))}
                  className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                >
                  Copy JSON
                </button>
              </div>
            }
          />
          <CardBody>
            {!result ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-white/70 text-sm">Run an analysis to see results here.</div>
                <div className="text-white/40 text-xs mt-2">
                  Health check: {health?.ok ? "OK" : health?.error ? health.error : "…"}
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {(["overview", "evidence", "interview", "json"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={classNames(
                        "px-3 py-2 rounded-xl border text-sm capitalize",
                        tab === t ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                  {score !== null ? (
                    <div className="ml-auto flex items-center gap-2">
                      <Badge tone={toneFromScore(score)}>{score}%</Badge>
                      {scoreLabel ? <Badge tone="neutral">{scoreLabel}</Badge> : null}
                    </div>
                  ) : null}
                </div>

                {/* Loading skeleton inside output when running */}
                {loading ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="grow">
                        <SkeletonLine w="w-40" />
                        <div className="mt-3 space-y-2">
                          <SkeletonLine />
                          <SkeletonLine w="w-5/6" />
                        </div>
                      </div>
                      <div className="w-40">
                        <SkeletonLine w="w-24" />
                        <div className="mt-3 h-2 rounded bg-white/10 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Overview */}
                {tab === "overview" ? (
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-white/50">Executive verdict</div>
                          <div className="text-white text-base font-semibold mt-1">{verdict || "—"}</div>
                        </div>
                        <div className="w-40">
                          <div className="text-xs text-white/50 mb-2">Match score</div>
                          <Progress value={score ?? 0} />
                        </div>
                      </div>

                      {brutal ? (
                        <div className="mt-4 text-sm text-white/70">
                          <span className="text-white/50">Brutal honesty:</span> {brutal}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="text-xs text-white/50">Hire now vs later</div>
                        <div className="text-white mt-1">{result?.executive_summary?.hire_now_vs_later ?? "—"}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="text-xs text-white/50">Replacement cost risk</div>
                        <div className="text-white mt-1">{result?.executive_summary?.replacement_cost_risk ?? "—"}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="text-xs text-white/50">Executive action</div>
                      <div className="text-white mt-1">{result?.executive_summary?.executive_action ?? "—"}</div>
                    </div>

                    {/* Skills gap */}
                    {result?.skills_gap ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="text-sm font-semibold mb-3">Skills gap</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-white/50 mb-2">Missing hard skills</div>
                            <div className="flex flex-wrap gap-2">
                              {(result.skills_gap.missing_hard_skills ?? []).length ? (
                                result.skills_gap.missing_hard_skills.map((x: string, i: number) => (
                                  <Badge key={i} tone="warn">
                                    {x}
                                  </Badge>
                                ))
                              ) : (
                                <Badge tone="good">None detected</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-white/50 mb-2">Missing soft skills</div>
                            <div className="flex flex-wrap gap-2">
                              {(result.skills_gap.missing_soft_skills ?? []).length ? (
                                result.skills_gap.missing_soft_skills.map((x: string, i: number) => (
                                  <Badge key={i} tone="warn">
                                    {x}
                                  </Badge>
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
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="text-sm font-semibold mb-3">Evidence</div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/50 mb-2">CV signals</div>
                          <ul className="space-y-2 text-sm text-white/80">
                            {(result?.evidence?.cv_signals ?? []).map((x: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-white/30">•</span>
                                <span>{x}</span>
                              </li>
                            ))}
                            {!((result?.evidence?.cv_signals ?? []).length) ? <li className="text-white/40">—</li> : null}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs text-white/50 mb-2">JD signals</div>
                          <ul className="space-y-2 text-sm text-white/80">
                            {(result?.evidence?.jd_signals ?? []).map((x: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-white/30">•</span>
                                <span>{x}</span>
                              </li>
                            ))}
                            {!((result?.evidence?.jd_signals ?? []).length) ? <li className="text-white/40">—</li> : null}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-xs text-white/50 mb-2">Key mismatches</div>
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
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="text-sm font-semibold mb-3">Decision trace</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-white/50 mb-2">Why this score</div>
                            <ul className="space-y-2 text-sm text-white/80">
                              {(result.decision_trace.why_this_score ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-white/30">•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                              {!((result.decision_trace.why_this_score ?? []).length) ? <li className="text-white/40">—</li> : null}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-white/50 mb-2">What raises score fast</div>
                            <ul className="space-y-2 text-sm text-white/80">
                              {(result.decision_trace.what_would_raise_score_fast ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-white/30">•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                              {!((result.decision_trace.what_would_raise_score_fast ?? []).length) ? <li className="text-white/40">—</li> : null}
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
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="text-sm font-semibold mb-3">Interview plan</div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/50 mb-2">Top questions</div>
                          <ul className="space-y-2 text-sm text-white/80">
                            {(result?.interview_plan?.top_7_questions ?? []).map((x: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-white/30">•</span>
                                <span>{x}</span>
                              </li>
                            ))}
                            {!((result?.interview_plan?.top_7_questions ?? []).length) ? <li className="text-white/40">—</li> : null}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs text-white/50 mb-2">Red flags to verify</div>
                          <div className="flex flex-wrap gap-2">
                            {(result?.interview_plan?.red_flags_to_verify ?? []).map((x: string, i: number) => (
                              <Badge key={i} tone="warn">
                                {x}
                              </Badge>
                            ))}
                            {!((result?.interview_plan?.red_flags_to_verify ?? []).length) ? <Badge tone="good">None</Badge> : null}
                          </div>

                          <div className="mt-4">
                            <div className="text-xs text-white/50 mb-2">Work sample test</div>
                            <div className="text-sm text-white/80">{result?.interview_plan?.work_sample_test ?? "—"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {result?.skills_gap?.upskilling_plan_7_days || result?.skills_gap?.upskilling_plan_30_days ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="text-sm font-semibold mb-3">Upskilling plan</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-white/50 mb-2">7 days</div>
                            <ul className="space-y-2 text-sm text-white/80">
                              {(result.skills_gap.upskilling_plan_7_days ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-white/30">•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                              {!((result.skills_gap.upskilling_plan_7_days ?? []).length) ? <li className="text-white/40">—</li> : null}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-white/50 mb-2">30 days</div>
                            <ul className="space-y-2 text-sm text-white/80">
                              {(result.skills_gap.upskilling_plan_30_days ?? []).map((x: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-white/30">•</span>
                                  <span>{x}</span>
                                </li>
                              ))}
                              {!((result.skills_gap.upskilling_plan_30_days ?? []).length) ? <li className="text-white/40">—</li> : null}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* JSON */}
                {tab === "json" ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-white/50">Raw response</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copy(rawText)}
                          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <pre className="text-xs text-white/80 whitespace-pre-wrap break-words leading-relaxed">
                      {rawText ? rawText : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

