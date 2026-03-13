import type { Agent } from "@/lib/types";

interface SetupTask {
  label: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

// Hardcoded founder-only tasks (remove as completed)
const FOUNDER_TASKS: SetupTask[] = [
  {
    label: "Create LinkedIn Company Page",
    detail: "Blocks Social Media Manager + Sales Rep",
    priority: "high",
  },
  {
    label: "Create Facebook Business Page",
    detail: "Blocks Social Media Manager",
    priority: "high",
  },
  {
    label: "Set up Canva team account",
    detail: "Blocks Content Creator + Social Media Manager",
    priority: "medium",
  },
  {
    label: "Set up Google Docs workspace",
    detail: "Blocks Strategist",
    priority: "medium",
  },
  {
    label: "Enable Discord bot intents",
    detail: "Required for avatar + presence features",
    priority: "low",
  },
];

const priorityDot: Record<SetupTask["priority"], string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-text-dim",
};

export default function SetupChecklist({ agents }: { agents: Agent[] }) {
  // Derive tasks from software with needs-setup or pending status
  const softwareTasks: SetupTask[] = [];
  const seen = new Set<string>();

  for (const agent of agents) {
    for (const sw of agent.software) {
      if (sw.status === "connected") continue;
      const key = `${sw.name}-${sw.status}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Find all employees affected
      const affected = agents
        .filter((a) => a.software.some((s) => s.name === sw.name && s.status === sw.status))
        .map((a) => a.name);

      softwareTasks.push({
        label: sw.status === "pending"
          ? `Connect ${sw.name}`
          : `Set up ${sw.name}`,
        detail: `Needed by ${affected.join(", ")}`,
        priority: affected.length >= 2 ? "high" : "medium",
      });
    }
  }

  // Merge: use software-derived tasks (deduped against founder tasks by label keyword)
  const founderFiltered = FOUNDER_TASKS.filter(
    (ft) => !softwareTasks.some((st) => ft.label.toLowerCase().includes(st.label.replace(/^(Set up|Connect)\s+/i, "").toLowerCase()))
  );

  const allTasks = [...softwareTasks, ...founderFiltered];

  if (allTasks.length === 0) return null;

  // Sort: high first, then medium, then low
  const order = { high: 0, medium: 1, low: 2 };
  allTasks.sort((a, b) => order[a.priority] - order[b.priority]);

  return (
    <div className="bg-dark-surface border border-dark-border rounded-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-sans text-[13px] font-semibold text-text-primary">
          Setup Required
        </h2>
        <span className="font-mono text-[11px] text-text-muted">
          {allTasks.length} {allTasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      <ul className="space-y-2">
        {allTasks.map((task) => (
          <li key={task.label} className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority]}`}
            />
            <div>
              <p className="font-sans text-[12px] text-text-primary leading-tight">
                {task.label}
              </p>
              <p className="font-mono text-[10px] text-text-muted">
                {task.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
