export function ErrorPanel({ message, rawText, onRetry }: { message: string; rawText?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mt-6 border border-danger bg-white p-4">
      <p className="label text-danger">Run failed</p>
      <p className="mt-2 font-medium">{message}</p>
      {rawText && (
        <details className="mt-3">
          <summary className="label cursor-pointer text-ink-soft">Show raw model text</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap bg-field p-2 font-mono text-xs">{rawText}</pre>
        </details>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className="arrow-link mt-3 border border-ink px-3 py-1.5 text-sm font-medium">
          Try again <span className="arrow">→</span>
        </button>
      )}
    </div>
  );
}
