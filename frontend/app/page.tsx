export default function Home() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Kandrai</h1>
      <p>Frontend is live. Backend health check:</p>

      <p>
        API URL: <code>{process.env.NEXT_PUBLIC_API_URL ?? "MISSING"}</code>
      </p>

      <a href="/analyze" style={{ display: "inline-block", marginTop: 16 }}>
        Go to Analyze →
      </a>
    </main>
  );
}
