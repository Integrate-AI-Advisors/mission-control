export default function Sidebar({ activeClient }: { activeClient: string }) {
  return (
    <div className="w-16 min-h-screen bg-dark-surface border-r border-dark-border flex flex-col items-center py-4 gap-3">
      {/* IntegrateAI Logo */}
      <a
        href="/dashboard/integrateai"
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
          activeClient === "integrateai"
            ? "bg-terra/20 border border-terra/40 shadow-[0_0_12px_rgba(217,119,87,0.15)]"
            : "bg-dark-card border border-dark-border hover:border-terra/20"
        }`}
        title="IntegrateAI Advisors"
      >
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <rect width="32" height="32" rx="8" fill="#1a1a19" />
          <circle cx="8" cy="11" r="3" fill="#d97757" />
          <circle cx="18" cy="11" r="3" fill="#d97757" opacity="0.4" />
          <circle cx="8" cy="21" r="3" fill="#d97757" opacity="0.2" />
          <circle cx="18" cy="21" r="3" fill="#d97757" />
        </svg>
      </a>

      {/* Divider */}
      <div className="w-6 h-px bg-dark-border" />

      {/* Add Client (placeholder) */}
      <button
        className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-text-muted hover:text-terra hover:border-terra/20 transition-all group relative"
        title="Add client (coming soon)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-current"
        >
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute left-14 bg-dark-card border border-dark-border text-text-secondary text-[11px] font-mono px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Coming soon
        </span>
      </button>
    </div>
  );
}
