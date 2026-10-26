/** A plain failure message with a retry. Raw model output is never shown. */
export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-danger bg-white px-4 py-3">
      <div>
        <p className="label text-danger">Run failed</p>
        <p className="mt-1 font-medium">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="arrow-link border border-ink px-3 py-1.5 text-sm font-medium transition-colors duration-300 hover:bg-ink hover:text-white">
          Try again <span className="arrow">→</span>
        </button>
      )}
    </div>
  );
}
