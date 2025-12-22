export const dynamic = "force-dynamic";

async function getHealth() {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${base}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health failed: ${res.status}`);
  return res.json();
}

export default async function AnalyzePage() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "MISSING";
  const health = await getHealth();

  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Analyze</h1>

      <p>
        API: <code>{api}</code>
      </p>

      <h3>Backend /health response</h3>
      <pre
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(health, null, 2)}
      </pre>
    </main>
  );
}

