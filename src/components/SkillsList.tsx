import type { Skill } from "@/lib/types";

export default function SkillsList({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((skill) => (
        <span
          key={skill.name}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-terra/25 text-terra-light bg-terra/[0.06]"
          title={skill.description}
        >
          {skill.name}
        </span>
      ))}
    </div>
  );
}
