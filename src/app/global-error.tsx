'use client';

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
        <div>
          <h2>Error</h2>
          <p>{error.message}</p>
          <button onClick={() => reset()}>Retry</button>
        </div>
      </body>
    </html>
  );
}
