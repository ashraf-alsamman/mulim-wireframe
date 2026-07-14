"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Globe2,
  Link as LinkIcon,
  Medal,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { useMemo, useState } from "react";

import { SearchFilterToolbar } from "@/components/search-filter-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type {
  ChecklistStatus,
  Criterion,
  Entry,
  EntryStage,
  Evaluation,
  EvaluationStage,
  FilteringDecision,
  Language
} from "@/types/demo";
import { maximumPossibleScore } from "@/utils/calculations";
import { cn } from "@/utils/cn";

const pageSize = 12;

export function EntriesView() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const text = `${entry.id} ${entry.participantName} ${entry.title} ${entry.participantCountry}`.toLowerCase();
      const matchesText = text.includes(search.toLowerCase());
      const matchesFilter = filter === "all" || entry.trackId === filter || entry.finalistStatus === filter;
      return matchesText && matchesFilter;
    });
  }, [entries, filter, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Array<Column<Entry>> = [
    {
      key: "entry",
      header: t(language, "entries"),
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{row.title}</p>
          <p className="text-xs text-slate-500">
            {row.id} / {row.participantName}
          </p>
        </div>
      )
    },
    {
      key: "track",
      header: t(language, "track"),
      cell: (row) => tracks.find((track) => track.id === row.trackId)?.name[language] ?? row.trackId
    },
    {
      key: "country",
      header: t(language, "country"),
      cell: (row) => row.participantCountry
    },
    {
      key: "filter",
      header: t(language, "filtering"),
      cell: (row) => <Badge tone={filteringTone(row.filteringDecision)}>{formatStatus(row.filteringDecision)}</Badge>
    },
    {
      key: "score",
      header: t(language, "score"),
      cell: (row) => (
        <span className="font-bold text-navy-900">
          {row.finalScore ? row.finalScore.toFixed(2) : row.totalScore.toFixed(2)}
        </span>
      )
    },
    {
      key: "rank",
      header: t(language, "rank"),
      cell: (row) => (row.rank ? `#${row.rank}` : "-")
    },
    {
      key: "status",
      header: t(language, "status"),
      cell: (row) => <StatusBadge group="finalist" value={row.finalistStatus} language={language} />
    },
    {
      key: "actions",
      header: t(language, "actions"),
      cell: (row) => (
        <Button asChild variant="secondary" size="icon">
          <Link href={`/entries/${row.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <SearchFilterToolbar
        language={language}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filter={filter}
        onFilterChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        filterOptions={[
          ...tracks.map((track) => ({ value: track.id, label: localized(language, track.name) })),
          { value: "awaitingTieBreak", label: copy(language, "بانتظار كسر التعادل", "Awaiting tie-break") },
          { value: "approvedWinner", label: copy(language, "فائز معتمد", "Approved winner") }
        ]}
      />
      <DataTable rows={rows} columns={columns} empty={<EmptyState title={copy(language, "لا توجد أعمال", "No entries")} />} />
      <div className="sketch-card flex items-center justify-between p-3">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          {language === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {copy(language, "السابق", "Previous")}
        </Button>
        <p className="text-sm font-semibold text-slate-600">
          {page} / {pages}
        </p>
        <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
          {copy(language, "التالي", "Next")}
          {language === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function EntryDetailView({ id }: { id: string }) {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const evaluators = useDemoStore((state) => state.evaluators);
  const evaluations = useDemoStore((state) => state.evaluations);
  const activities = useDemoStore((state) => state.activities);
  const criteria = useDemoStore((state) => state.criteria);
  const entry = entries.find((item) => item.id === id);

  if (!entry) {
    return <EmptyState title={copy(language, "لم يتم العثور على العمل", "Entry not found")} />;
  }

  const track = tracks.find((item) => item.id === entry.trackId);
  const entryEvaluations = evaluations.filter((evaluation) => evaluation.entryId === entry.id);
  const entryActivities = activities.filter((activity) => activity.entity === entry.id);
  const maxScore = maximumPossibleScore(criteria);
  const submittedEvaluations = entryEvaluations.filter((evaluation) => evaluation.status === "submitted").length;
  const assignedCount = Math.max(entry.assignedEvaluatorIds.length, entryEvaluations.length);
  const trackName = track ? localized(language, track.name) : entry.trackId;

  return (
    <div className="space-y-5">
      <section className="sketch-card overflow-hidden">
        <div className="grid xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.35fr)]">
          <div className={cn("sketch-scribble relative min-h-72 overflow-hidden p-5 text-[var(--paper-soft)]", thumbnailGradient(entry.thumbnail))}>
            <div className="absolute inset-x-6 top-8 h-px bg-[rgba(255,255,255,0.38)]" />
            <div className="absolute inset-x-12 top-20 h-px bg-[rgba(255,255,255,0.28)]" />
            <div className="absolute -end-20 top-12 h-44 w-72 rotate-[-16deg] rounded-[20px_14px_24px_16px] border-2 border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.08)]" />
            <div className="absolute -bottom-16 start-8 h-44 w-72 rotate-[13deg] rounded-[18px_24px_15px_22px] border-2 border-[rgba(255,255,255,0.34)] bg-[rgba(255,255,255,0.08)]" />
            <div className="relative z-10 flex min-h-64 flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-[14px_10px_16px_11px] border-2 border-[rgba(255,255,255,0.56)] bg-[rgba(255,255,255,0.12)]">
                  <Palette className="h-6 w-6" />
                </div>
                <Badge tone="neutral" className="bg-[rgba(255,255,255,0.16)] text-[var(--paper-soft)] ring-[rgba(255,255,255,0.3)]">
                  {entry.id}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[rgba(255,255,255,0.74)]">{trackName}</p>
                <p className="mt-3 max-w-sm text-2xl font-bold leading-tight">{entry.title}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge tone="neutral" className="bg-[var(--paper-soft)] text-[var(--ink)] ring-[var(--paper-soft)]">
                    {entry.category}
                  </Badge>
                  <Badge tone="neutral" className="bg-[rgba(255,255,255,0.16)] text-[var(--paper-soft)] ring-[rgba(255,255,255,0.3)]">
                    {formatDate(entry.submissionDate, language)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(language, "entries")}</p>
                <h1 className="mt-2 max-w-3xl text-2xl font-bold leading-tight text-navy-900 lg:text-3xl">{entry.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge group="finalist" value={entry.finalistStatus} language={language} />
                  <StatusBadge group="evaluation" value={entry.evaluationStatus} language={language} />
                  <Badge tone={filteringTone(entry.filteringDecision)}>{formatStatus(entry.filteringDecision)}</Badge>
                </div>
              </div>
              <div className="sketch-note px-4 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(language, "rank")}</p>
                <p className="mt-1 text-3xl font-bold text-navy-900">{entry.rank ? `#${entry.rank}` : "-"}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <InfoTile icon={UserRound} label={t(language, "participant")} value={entry.participantName} />
              <InfoTile icon={Globe2} label={t(language, "country")} value={entry.participantCountry} />
              <InfoTile icon={Flag} label={t(language, "track")} value={trackName} />
              <InfoTile icon={Award} label={copy(language, "الفئة", "Category")} value={entry.category} />
              <InfoTile icon={CalendarDays} label={copy(language, "تاريخ التقديم", "Submission date")} value={formatDate(entry.submissionDate, language)} />
              <InfoTile icon={Clock3} label={t(language, "status")} value={stageLabel(entry.currentStage, language)} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreMetric
          icon={ClipboardCheck}
          label={copy(language, "الدرجة الأولية", "Initial score")}
          value={entry.totalScore.toFixed(2)}
          detail={copy(language, `من ${maxScore}`, `of ${maxScore}`)}
          progress={scorePercent(entry.totalScore, maxScore)}
          tone="navy"
        />
        <ScoreMetric
          icon={Medal}
          label={copy(language, "الدرجة النهائية الموزونة", "Weighted final")}
          value={entry.finalScore.toFixed(2)}
          detail={copy(language, `من ${maxScore}`, `of ${maxScore}`)}
          progress={scorePercent(entry.finalScore, maxScore)}
          tone="green"
        />
        <ScoreMetric
          icon={Sparkles}
          label={copy(language, "أثر التوعية", "Awareness impact")}
          value={entry.awarenessScore.toFixed(2)}
          detail={copy(language, "من 10", "of 10")}
          progress={scorePercent(entry.awarenessScore, 10)}
          tone="gold"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>{t(language, "filtering")}</CardTitle>
            <Badge tone={filteringTone(entry.filteringDecision)}>{formatStatus(entry.filteringDecision)}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(entry.filteringChecklist).map(([key, value]) => (
                <ChecklistItem key={key} label={checklistLabel(key, language)} value={value} language={language} />
              ))}
            </div>
            <div className="sketch-note p-4 text-sm leading-6 text-[var(--ink-soft)]">
              {entry.qualificationReason}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>{copy(language, "معاينة الوسائط", "Media preview")}</CardTitle>
            <Button asChild variant="secondary" size="sm">
              <a href={entry.entryUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t(language, "view")}
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className={cn("sketch-scribble relative aspect-video overflow-hidden rounded-[17px_12px_19px_14px] border-2 border-[var(--line)] p-5 text-[var(--paper-soft)]", thumbnailGradient(entry.thumbnail))}>
              <div className="absolute inset-x-5 top-5 h-px bg-[rgba(255,255,255,0.34)]" />
              <div className="absolute inset-y-8 end-10 w-px bg-[rgba(255,255,255,0.34)]" />
              <div className="absolute bottom-8 start-8 h-16 w-44 rotate-[-8deg] rounded-[18px_12px_20px_14px] border-2 border-[rgba(255,255,255,0.46)] bg-[rgba(255,255,255,0.08)]" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-[13px_10px_15px_11px] border-2 border-[rgba(255,255,255,0.48)] bg-[rgba(255,255,255,0.12)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Badge tone="neutral" className="bg-[rgba(255,255,255,0.16)] text-[var(--paper-soft)] ring-[rgba(255,255,255,0.3)]">
                    {entry.trackId}
                  </Badge>
                </div>
                <div>
                  <p className="max-w-[18rem] text-lg font-bold leading-tight">{entry.title}</p>
                  <p className="mt-2 text-xs text-[rgba(255,255,255,0.74)]">{entry.id}</p>
                </div>
              </div>
            </div>
            <div className="sketch-note mt-3 flex items-center gap-2 px-3 py-2 text-xs text-[var(--graphite)]">
              <LinkIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{entry.entryUrl}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{copy(language, "درجات المحكمين", "Evaluator scores")}</CardTitle>
          <Badge tone={submittedEvaluations === assignedCount ? "success" : "warning"}>
            {submittedEvaluations}/{assignedCount}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {entryEvaluations.length ? (
            entryEvaluations.map((evaluation) => (
              <EvaluatorScoreCard
                key={evaluation.id}
                evaluation={evaluation}
                evaluatorName={evaluators.find((item) => item.id === evaluation.evaluatorId)?.fullName ?? evaluation.evaluatorId}
                criteria={criteria}
                maxScore={maxScore}
                language={language}
              />
            ))
          ) : (
            <div className="sketch-note border-dashed p-5 text-sm font-bold text-[var(--graphite)]">
              {copy(language, "لا توجد درجات مسجلة لهذا العمل.", "No evaluator scores recorded for this entry.")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>{copy(language, "سجل العمل", "Workflow history")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entryActivities.length ? (
              entryActivities.map((activity) => (
                <TimelineRow
                  key={activity.id}
                  title={activity.action}
                  body={activity.notes}
                  meta={new Date(activity.date).toLocaleString(language === "ar" ? "ar" : "en")}
                />
              ))
            ) : (
              <TimelineRow
                title={copy(language, "لا يوجد نشاط مسجل", "No recorded activity")}
                body={entry.notes}
                meta={copy(language, "ملاحظة العمل", "Entry note")}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy(language, "جاهزية العمل", "Entry readiness")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <ReadinessItem icon={ShieldCheck} label={copy(language, "المرحلة الحالية", "Current stage")} value={stageLabel(entry.currentStage, language)} />
            <ReadinessItem icon={CheckCircle2} label={copy(language, "التقييمات", "Evaluations")} value={`${submittedEvaluations}/${assignedCount}`} />
            <ReadinessItem icon={UserRound} label={t(language, "contact")} value={formatStatus(entry.contactStatus)} />
            <ReadinessItem icon={CalendarDays} label={t(language, "coordinateTravel")} value={formatStatus(entry.travelStatus)} />
            <ReadinessItem icon={Star} label={t(language, "confirmCeremony")} value={formatStatus(entry.ceremonyStatus)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="sketch-note flex min-h-20 items-start gap-3 p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px_8px_12px_9px] border-2 border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-bold leading-5 text-navy-900">{value}</p>
      </div>
    </div>
  );
}

type MetricTone = "navy" | "green" | "gold";

const metricTones: Record<MetricTone, { icon: string; bar: string }> = {
  navy: { icon: "bg-[var(--ink)] text-[var(--paper-soft)]", bar: "bg-[var(--ink)]" },
  green: { icon: "bg-[var(--ink)] text-[var(--paper-soft)]", bar: "bg-[var(--ink)]" },
  gold: { icon: "bg-[var(--ink)] text-[var(--paper-soft)]", bar: "bg-[var(--ink)]" }
};

function ScoreMetric({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  progress: number;
  tone: MetricTone;
}) {
  const toneClasses = metricTones[tone];

  return (
    <div className="sketch-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-navy-900">{value}</p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-[12px_9px_14px_10px] border-2 border-[var(--line)]", toneClasses.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-[999px_850px_920px_840px] border-2 border-[var(--line)] bg-[var(--paper-soft)]">
        <div className={cn("h-full rounded-full transition-all", toneClasses.bar)} style={{ width: `${scorePercent(progress, 100)}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function ChecklistItem({ label, value, language }: { label: string; value: ChecklistStatus; language: Language }) {
  return (
    <div className="sketch-note p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-bold leading-5 text-navy-900">{label}</p>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--ink)]" />
      </div>
      <StatusBadge group="checklist" value={value} language={language} />
    </div>
  );
}

function EvaluatorScoreCard({
  evaluation,
  evaluatorName,
  criteria,
  maxScore,
  language
}: {
  evaluation: Evaluation;
  evaluatorName: string;
  criteria: Criterion[];
  maxScore: number;
  language: Language;
}) {
  const activeCriteria = criteria.filter((criterion) => criterion.active);
  const rawScore = activeCriteria.reduce((total, criterion) => total + (evaluation.scores[criterion.id] ?? 0), 0);

  return (
    <div className="sketch-note p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold text-navy-900">{evaluatorName}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {evaluationStageLabel(evaluation.stage, language)}
          </p>
        </div>
        <Badge tone={evaluation.status === "submitted" ? "success" : "warning"}>{formatStatus(evaluation.status)}</Badge>
      </div>

      <div className="sketch-note mt-4 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(language, "score")}</span>
          <strong className="text-navy-900">
            {rawScore.toFixed(2)} / {maxScore}
          </strong>
        </div>
        <Progress value={scorePercent(rawScore, maxScore)} className="mt-3" />
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {activeCriteria.map((criterion) => {
          const score = evaluation.scores[criterion.id] ?? 0;
          return (
            <div key={criterion.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">{localized(language, criterion.name)}</span>
                <strong className="text-navy-900">
                  {score} / {criterion.maxScore}
                </strong>
              </div>
              <Progress value={scorePercent(score, criterion.maxScore)} className="mt-2" />
            </div>
          );
        })}
      </div>

      {evaluation.comments ? <p className="sketch-note mt-4 p-3 text-xs leading-5 text-[var(--graphite)]">{evaluation.comments}</p> : null}
    </div>
  );
}

function TimelineRow({ title, body, meta }: { title: string; body?: string; meta: string }) {
  return (
    <div className="sketch-note flex gap-3 p-4">
      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[999px_820px_940px_840px] border-2 border-[var(--line)] bg-[var(--ink)] ring-4 ring-[rgba(0,0,0,0.12)]" />
      <div>
        <p className="font-bold text-navy-900">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{meta}</p>
        {body ? <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p> : null}
      </div>
    </div>
  );
}

function ReadinessItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="sketch-note flex items-center gap-3 p-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px_9px_14px_10px] border-2 border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate font-bold text-navy-900">{value}</p>
      </div>
    </div>
  );
}

function checklistLabel(key: string, language: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    relevance: { ar: "الصلة بالتوعية المالية والاستثمارية", en: "Financial/investment relevance" },
    intellectualProperty: { ar: "حقوق الملكية الفكرية", en: "Intellectual property rights" },
    rulesCompliance: { ar: "الشروط العامة وشروط المسار", en: "General and track rules" }
  };
  return labels[key]?.[language] ?? key;
}

function copy(language: Language, ar: string, en: string) {
  return language === "ar" ? ar : en;
}

function thumbnailGradient(thumbnail: string) {
  const gradients: Record<string, string> = {
    navy: "bg-[var(--ink)]",
    burgundy: "bg-[var(--ink)]",
    green: "bg-[var(--ink)]",
    blue: "bg-[var(--ink)]"
  };
  return gradients[thumbnail] ?? gradients.navy;
}

function filteringTone(value: FilteringDecision): "neutral" | "success" | "warning" | "danger" {
  if (value === "qualified") {
    return "success";
  }
  if (value === "disqualified") {
    return "danger";
  }
  if (value === "returned" || value === "pending") {
    return "warning";
  }
  return "neutral";
}

function scorePercent(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function formatDate(value: string, language: Language) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(language === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatStatus(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stageLabel(stage: EntryStage, language: Language) {
  const labels: Record<EntryStage, string> = {
    submitted: copy(language, "تم التقديم", "Submitted"),
    filtering: t(language, "filtering"),
    initialEvaluation: t(language, "initialEvaluation"),
    finalEvaluation: t(language, "finalEvaluation"),
    tieBreaking: t(language, "tieBreaking"),
    approval: t(language, "approvals"),
    winner: t(language, "winners"),
    closed: copy(language, "مغلق", "Closed")
  };
  return labels[stage];
}

function evaluationStageLabel(stage: EvaluationStage, language: Language) {
  const labels: Record<EvaluationStage, string> = {
    initial: t(language, "initialEvaluation"),
    final: t(language, "finalEvaluation")
  };
  return labels[stage];
}
