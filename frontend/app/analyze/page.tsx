export default function AnalyzePage() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Analyze</h1>
      <p>API: <code>{process.env.NEXT_PUBLIC_API_URL}</code></p>
    </main>
  );
}
