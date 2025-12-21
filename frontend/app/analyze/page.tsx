"use client";

import React, { useMemo, useState } from "react";

type Role = "candidate" | "recruiter";

export default function AnalyzePage() {
  const [role, setRole] = useState<Role>("candidate");
  const [jobDescription, setJobDescription] = useState("");
  const [candidateText, setCandidateText] = useState("");
  const [recruiterDoubt, setRecruiterDoubt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<any>(null);

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  }, []);

  async function onAnalyze() {
    setError("");
    setData(null);

    if (!jobDescription.trim() || !candidateText.trim()) {
      setError("Add Job Description + CV text.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          job_description: jobDescription,
          candidate_text: candidateText,
          recruiter_doubt: recruiterDoubt || "",
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${txt || "Unknown"}`);
      }

      setData(await res.json());
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <h1 style={{ margin: 0 }}>Kandrai / Analyze</h1>
      <p style={{ marginTop: 6, opacity: 0.7 }}>API: {apiBase}</p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label>Role:</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
        </select>

        <button onClick={onAnalyze} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <h3 style={{ margin: "0 0 6px" }}>Job Description</h3>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{ width: "100%", minHeight: 220 }}
            placeholder="Paste JD…"
          />
        </div>

        <div>
          <h3 style={{ margin: "0 0 6px" }}>CV / Candidate text</h3>
          <textarea
            value={candidateText}
            onChange={(e) => setCandidateText(e.target.value)}
            style={{ width: "100%", minHeight: 220 }}
            placeholder="Paste CV…"
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3 style={{ margin: "0 0 6px" }}>Recruiter doubt (optional)</h3>
        <textarea
          value={recruiterDoubt}
          onChange={(e) => setRecruiterDoubt(e.target.value)}
          style={{ width: "100%", minHeight: 90 }}
          placeholder="Optional…"
        />
      </div>

      {error ? <p style={{ color: "red" }}>{error}</p> : null}

      {data ? (
        <div style={{ marginTop: 14 }}>
          <h2 style={{ margin: "0 0 8px" }}>Result</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
