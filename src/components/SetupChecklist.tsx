import type { Agent } from "@/lib/types";

interface SetupTask {
  label: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

const priorityDot: Record<SetupTask["priority"], string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-text-dim",
};

export default function SetupChecklist({ agents }: { agents: Agent[] }) {
  const tasks: SetupTask[] = [];

  // Check for agents with no skills
  const noSkills = agents.filter(
    (a) => a.tier === "executive" && a.skills.length === 0
  );
  if (noSkills.length > 0) {
    tasks.push({
      label: "Deploy executive skills",
      detail: `Missing for: ${noSkills.map((a) => a.id.toUpperCase()).join(", ")}`,
      priority: "high",
    });
  }

  // Check for offline executives
  const offExecs = agents.filter(
    (a) => a.tier === "executive" && a.status === "Off"
  );
  if (offExecs.length > 0 && offExecs.length < agents.filter((a) => a.tier === "executive").length) {
    tasks.push({
      label: "Some executives are offline",
      detail: `${offExecs.map((a) => a.id.toUpperCase()).join(", ")} not responding`,
      priority: "medium",
    });
  }

  // Slack setup reminder
  tasks.push({
    label: "Configure Slack bot tokens",
    detail: "Set SLACK_BOT_TOKEN_CMO + SLACK_APP_TOKEN_CMO on VPS",
    priority: "medium",
  });

  if (tasks.length === 0) return null;

  return (
    <div className="bg-dark-surface border border-dark-border rounded-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-sans text-[13px] font-semibold text-text-primary">
          Setup Required
        </h2>
        <span className="font-mono text-[11px] text-text-muted">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => (
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
