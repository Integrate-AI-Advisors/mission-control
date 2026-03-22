// Tools list — shows agent tools as simple badges
export default function ToolsList({ tools }: { tools: string[] }) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.slice(0, 8).map((tool) => (
        <span
          key={tool}
          className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border border-dark-border bg-dark-surface text-text-secondary"
        >
          {tool}
        </span>
      ))}
      {tools.length > 8 && (
        <span className="text-[10px] font-mono text-text-muted px-1">
          +{tools.length - 8} more
        </span>
      )}
    </div>
  );
}
