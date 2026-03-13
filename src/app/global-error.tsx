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
        <div>Error: {error.message}</div>
        <button onClick={() => reset()}>Retry</button>
      </body>
    </html>
  );
}
