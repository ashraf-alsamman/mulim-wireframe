import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { evaluatorRoleLabels, localized } from "@/i18n/translations";
import type { CommitteeMember, Entry, Evaluator, Language, Track } from "@/types/demo";

export function EntryPreview({ entry, track, language }: { entry: Entry; track?: Track; language: Language }) {
  const colors = {
    navy: "bg-[var(--ink)]",
    burgundy: "bg-[var(--ink)]",
    green: "bg-[var(--ink)]",
    blue: "bg-[var(--ink)]"
  };
  const color = colors[entry.thumbnail as keyof typeof colors] ?? colors.navy;
  return (
    <Card className="overflow-hidden">
      <div className={`sketch-scribble relative h-28 border-b-2 border-dashed border-[var(--muted-line)] ${color}`}>
        <div className="absolute inset-5 rotate-[-3deg] rounded-[18px_12px_20px_14px] border-2 border-[rgba(255,255,255,0.78)]" />
        <div className="absolute bottom-5 end-8 h-8 w-16 rotate-[8deg] rounded-[50%] border-2 border-[rgba(255,255,255,0.68)]" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="info">{track ? localized(language, track.name) : entry.trackId}</Badge>
          <span className="text-xs font-bold text-[var(--graphite)]">{entry.id}</span>
        </div>
        <p className="mt-3 font-bold text-[var(--ink)]">{entry.title}</p>
        <p className="mt-1 text-sm text-slate-500">{entry.participantName} · {entry.participantCountry}</p>
      </div>
    </Card>
  );
}

export function EvaluatorCard({ evaluator, language }: { evaluator: Evaluator; language: Language }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[999px_820px_920px_840px] border-2 border-[var(--line)] bg-[var(--paper-warm)] text-sm font-bold text-[var(--ink)]">{evaluator.initials}</div>
        <div>
          <p className="font-bold text-[var(--ink)]">{evaluator.fullName}</p>
          <p className="text-xs text-slate-500">{evaluator.organization}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="burgundy">{evaluatorRoleLabels[evaluator.evaluatorRole][language]}</Badge>
        <Badge tone="neutral">{evaluator.weight}%</Badge>
      </div>
    </Card>
  );
}

export function CommitteeMemberCard({
  member,
  evaluator,
  language
}: {
  member: CommitteeMember;
  evaluator?: Evaluator;
  language: Language;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-[var(--ink)]">{evaluator?.fullName ?? member.evaluatorId}</p>
          <p className="text-xs text-slate-500">{evaluatorRoleLabels[member.role][language]}</p>
        </div>
        <Badge tone="info">{member.weight}%</Badge>
      </div>
      <Progress value={member.weight} className="mt-4" />
    </Card>
  );
}
