export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h1>Error</h1>
        <p>{error.message}</p>
        <button onClick={() => reset()}>Retry</button>
      </body>
    </html>
  );
}
