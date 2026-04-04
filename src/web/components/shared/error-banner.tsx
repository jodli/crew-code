export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-md bg-error/10 border border-error/20 text-sm text-error/90">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-error/50 hover:text-error/80 transition-colors ml-3 shrink-0"
        >
          &#10005;
        </button>
      )}
    </div>
  );
}

export function DisconnectedBanner() {
  return (
    <div className="bg-error/10 border-b border-error/20 px-6 py-2 text-sm text-error/80 text-center">
      Server disconnected. Retrying...
    </div>
  );
}
