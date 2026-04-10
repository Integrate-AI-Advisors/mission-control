"use client";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <h2 className="font-serif text-xl text-foreground">Failed to load clients</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "Something went wrong. Please try again."}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
