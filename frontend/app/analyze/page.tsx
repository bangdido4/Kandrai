"use client";

import React, { useMemo, useState } from "react";

type AnalyzeResponse = any;

export default function AnalyzePage() {
  // ✅ En cliente: la env var SÍ está disponible porque empieza por NEXT_PUBLIC_
  const api = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? "", []);

  const [cvText, setCvText] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("Ready.");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!api) {
      setResult("ERROR: NEXT_PUBLIC_API_URL is missing in Vercel env vars.");
      return;
    }

    setLoading(true);
    setResult("Sending...");

    try {
      const res = await fetch(`${api}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // ✅ OJO: tu backend FastAPI (según tu main.py) espera estos nombres:
        // role, job_description, candidate_text, recruiter_doubt
        body: JSON.stringify({
          role: "candidate",
          job_description: jdText,
          candidate_text: cvText,
          recruiter_doubt: "",
        }),
      });

      const text = await res.text();
      let data: AnalyzeResponse;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setResult(JSON.stringify({ error: res.status, data }, null, 2));
        return;
      }

      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResult(JSON.stringify({ error: String(err) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1>Analyze</h1>

      <p>
        API: <code>{api || "MISSING"}</code>
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>CV Text</span>
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={10}
            placeholder="Paste CV here..."
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Job Description</span>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste Job Description here..."
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            width: "fit-content",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Running..." : "Run Analyze"}
        </button>
      </form>

      <h3 style={{ marginTop: 18 }}>Result</h3>
      <pre
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          overflowX: "auto",
          minHeight: 120,
          whiteSpace: "pre-wrap",
        }}
      >
        {result}
      </pre>
    </main>
  );
}
