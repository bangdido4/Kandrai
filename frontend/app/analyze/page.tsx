"use client";

export const dynamic = "force-dynamic";

type AnalyzeResponse = any;

export default function AnalyzePage() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const fd = new FormData(form);

    const cvText = String(fd.get("cvText") || "");
    const jdText = String(fd.get("jdText") || "");

    const outEl = document.getElementById("out") as HTMLPreElement | null;
    if (outEl) outEl.textContent = "Sending...";

    try {
      const res = await fetch(`${api}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "candidate",
          job_description: jdText,
          candidate_text: cvText,
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
        if (outEl) outEl.textContent = JSON.stringify({ error: res.status, data }, null, 2);
        return;
      }

      if (outEl) outEl.textContent = JSON.stringify(data, null, 2);
    } catch (err: any) {
      if (outEl) outEl.textContent = JSON.stringify({ error: String(err) }, null, 2);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1>Analyze</h1>

      <p>
        API: <code>{api || "MISSING"}</code>
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          CV Text
          <textarea name="cvText" rows={10} required />
        </label>

        <label>
          Job Description
          <textarea name="jdText" rows={10} required />
        </label>

        <button type="submit">Run Analyze</button>
      </form>

      <h3>Result</h3>
      <pre id="out">Ready.</pre>
    </main>
  );
}
