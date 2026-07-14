import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { evaluatorRoleLabels, localized } from "@/i18n/translations";
import type { CommitteeMember, Entry, Evaluator, Language, Track } from "@/types/demo";

export function EntryPreview({ entry, track, language }: { entry: Entry; track?: Track; language: Language }) {
  const colors = {
    navy: "from-navy-900 to-navy-500",
    burgundy: "from-burgundy-700 to-burgundy-500",
    green: "from-emerald-700 to-gulf-green",
    blue: "from-sky-700 to-gulf-blue"
  };
  const color = colors[entry.thumbnail as keyof typeof colors] ?? colors.navy;
  return (
    <Card className="overflow-hidden">
      <div className={`h-28 bg-gradient-to-br ${color}`} />
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="info">{track ? localized(language, track.name) : entry.trackId}</Badge>
          <span className="text-xs font-semibold text-slate-500">{entry.id}</span>
        </div>
        <p className="mt-3 font-bold text-navy-900">{entry.title}</p>
        <p className="mt-1 text-sm text-slate-500">{entry.participantName} · {entry.participantCountry}</p>
      </div>
    </Card>
  );
}

export function EvaluatorCard({ evaluator, language }: { evaluator: Evaluator; language: Language }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">{evaluator.initials}</div>
        <div>
          <p className="font-bold text-navy-900">{evaluator.fullName}</p>
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
          <p className="font-bold text-navy-900">{evaluator?.fullName ?? member.evaluatorId}</p>
          <p className="text-xs text-slate-500">{evaluatorRoleLabels[member.role][language]}</p>
        </div>
        <Badge tone="info">{member.weight}%</Badge>
      </div>
      <Progress value={member.weight} className="mt-4" />
    </Card>
  );
}
