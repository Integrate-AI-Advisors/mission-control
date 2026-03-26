import type { Agent } from "@/lib/types";

interface SetupTask {
  label: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

const priorityDot: Record<SetupTask["priority"], string> = {
  high: "bg-brand-red",
  medium: "bg-brand-amber",
  low: "bg-text-muted",
};

export default function SetupChecklist({ agents }: { agents: Agent[] }) {
  const tasks: SetupTask[] = [];

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

  tasks.push({
    label: "Configure Slack bot tokens",
    detail: "Set SLACK_BOT_TOKEN_CMO + SLACK_APP_TOKEN_CMO on VPS",
    priority: "medium",
  });

  if (tasks.length === 0) return null;

  return (
    <div className="bg-dark-surface border border-dark-border rounded-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em]">
          Setup Required
        </p>
        <span className="font-mono text-[0.6rem] text-text-muted leading-[1.6]">
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
              <p className="font-mono text-[0.6rem] text-text-muted leading-[1.6]">
                {task.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
