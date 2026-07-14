"use client";

import { CommitteeMemberCard, EntryPreview, EvaluatorCard } from "@/components/entity-cards";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { localized } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import { validateCommitteeWeights } from "@/utils/calculations";

export function TrackDetailView({ id }: { id: string }) {
  const language = useDemoStore((state) => state.language);
  const tracks = useDemoStore((state) => state.tracks);
  const entries = useDemoStore((state) => state.entries);
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const track = tracks.find((item) => item.id === id);

  if (!track) {
    return <EmptyState title={language === "ar" ? "لم يتم العثور على المسار" : "Track not found"} />;
  }

  const trackEntries = entries.filter((entry) => entry.trackId === track.id);
  const committee = committees.find((item) => item.id === track.committeeId);
  const supervisor = evaluators.find((item) => item.id === track.supervisorId);
  const progress = trackEntries.length ? Math.round((trackEntries.filter((entry) => entry.finalScore > 0).length / trackEntries.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{localized(language, track.name)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Info label={language === "ar" ? "المشرف" : "Supervisor"} value={supervisor?.fullName ?? track.supervisorId} />
          <Info label={language === "ar" ? "الأعمال" : "Entries"} value={String(trackEntries.length)} />
          <Info label={language === "ar" ? "المؤهلة" : "Qualified"} value={String(trackEntries.filter((entry) => entry.filteringDecision === "qualified").length)} />
          <div>
            <p className="text-xs font-semibold text-slate-500">{language === "ar" ? "الحالة" : "Status"}</p>
            <div className="mt-1"><StatusBadge group="entity" value={track.status} language={language} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Progress value={progress} />
          <p className="mt-2 text-sm text-slate-500">{progress}%</p>
        </CardContent>
      </Card>
      {committee ? (
        <Card>
          <CardHeader>
            <CardTitle>{localized(language, committee.name)}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {committee.members.map((member) => (
              <CommitteeMemberCard key={member.evaluatorId} member={member} evaluator={evaluators.find((item) => item.id === member.evaluatorId)} language={language} />
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trackEntries.slice(0, 8).map((entry) => (
          <EntryPreview key={entry.id} entry={entry} track={track} language={language} />
        ))}
      </div>
    </div>
  );
}

export function EvaluatorDetailView({ id }: { id: string }) {
  const language = useDemoStore((state) => state.language);
  const evaluator = useDemoStore((state) => state.evaluators.find((item) => item.id === id));
  const entries = useDemoStore((state) => state.entries);
  const evaluations = useDemoStore((state) => state.evaluations);
  const tracks = useDemoStore((state) => state.tracks);

  if (!evaluator) {
    return <EmptyState title={language === "ar" ? "لم يتم العثور على المحكم" : "Evaluator not found"} />;
  }

  const assignedEntries = entries.filter((entry) => entry.assignedEvaluatorIds.includes(evaluator.id));
  const submitted = evaluations.filter((evaluation) => evaluation.evaluatorId === evaluator.id && evaluation.status === "submitted");

  return (
    <div className="space-y-5">
      <EvaluatorCard evaluator={evaluator} language={language} />
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Info label={language === "ar" ? "الدولة" : "Country"} value={evaluator.country} />
          <Info label={language === "ar" ? "الأعمال المسندة" : "Assigned entries"} value={String(assignedEntries.length)} />
          <Info label={language === "ar" ? "التقييمات المرسلة" : "Submitted evaluations"} value={String(submitted.length)} />
          <Info
            label={language === "ar" ? "المسارات" : "Tracks"}
            value={evaluator.assignedTrackIds.map((trackId) => tracks.find((track) => track.id === trackId)?.name[language] ?? trackId).join(", ")}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {assignedEntries.slice(0, 8).map((entry) => (
          <EntryPreview key={entry.id} entry={entry} track={tracks.find((track) => track.id === entry.trackId)} language={language} />
        ))}
      </div>
    </div>
  );
}

export function CommitteeDetailView({ id }: { id: string }) {
  const language = useDemoStore((state) => state.language);
  const committee = useDemoStore((state) => state.committees.find((item) => item.id === id));
  const evaluators = useDemoStore((state) => state.evaluators);
  const entries = useDemoStore((state) => state.entries);
  const evaluations = useDemoStore((state) => state.evaluations);
  const tracks = useDemoStore((state) => state.tracks);

  if (!committee) {
    return <EmptyState title={language === "ar" ? "لم يتم العثور على اللجنة" : "Committee not found"} />;
  }

  const validation = validateCommitteeWeights(committee, evaluators);
  const committeeEntries = entries.filter((entry) => entry.trackId === committee.trackId && entry.filteringDecision === "qualified");
  const completed = committeeEntries.filter((entry) =>
    committee.members.every((member) =>
      evaluations.some((evaluation) => evaluation.entryId === entry.id && evaluation.evaluatorId === member.evaluatorId && evaluation.stage === "final" && evaluation.status === "submitted")
    )
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{localized(language, committee.name)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Info label={language === "ar" ? "المسار" : "Track"} value={tracks.find((track) => track.id === committee.trackId)?.name[language] ?? committee.trackId} />
          <Info label={language === "ar" ? "الأعمال المسندة" : "Assigned entries"} value={String(committeeEntries.length)} />
          <Info label={language === "ar" ? "المكتملة" : "Completed"} value={String(completed.length)} />
          <div>
            <p className="text-xs font-semibold text-slate-500">{language === "ar" ? "اعتماد اللجنة" : "Committee approval"}</p>
            <div className="mt-1"><StatusBadge group="committee" value={committee.approvalStatus} language={language} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Progress value={committeeEntries.length ? (completed.length / committeeEntries.length) * 100 : 0} />
          <p className="mt-2 text-sm text-slate-500">{completed.length}/{committeeEntries.length}</p>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {committee.members.map((member) => (
          <CommitteeMemberCard key={member.evaluatorId} member={member} evaluator={evaluators.find((item) => item.id === member.evaluatorId)} language={language} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "ملاحظات التحقق" : "Validation issues"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          {validation.issues.length ? validation.issues.map((issue) => <p key={issue}>{issue}</p>) : <p>{language === "ar" ? "اللجنة مكتملة وصالحة." : "Committee is complete and valid."}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-navy-900">{value}</p>
    </div>
  );
}
