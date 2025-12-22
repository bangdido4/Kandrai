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
        // ⬇️ si tu backend usa otros nombres, dime tu schema y lo ajusto
        body: JSON.stringify({
          cv_text: cvText,
          jd_text: jdText,
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
        <label style={{ display: "grid", gap: 6 }}>
          <span>CV Text</span>
          <textarea
            name="cvText"
            rows={10}
            placeholder="Paste CV here..."
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Job Description</span>
          <textarea
            name="jdText"
            rows={10}
            placeholder="Paste Job Description here..."
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            required
          />
        </label>

        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          Run Analyze
        </button>
      </form>

      <h3 style={{ marginTop: 18 }}>Result</h3>
      <pre
        id="out"
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          overflowX: "auto",
          minHeight: 120,
        }}
      >
        Ready.
      </pre>
    </main>
  );
}
