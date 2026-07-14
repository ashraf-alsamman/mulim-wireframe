"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { EntryPreview } from "@/components/entity-cards";
import { SearchFilterToolbar } from "@/components/search-filter-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { Entry } from "@/types/demo";

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
          <p className="text-xs text-slate-500">{row.id} · {row.participantName}</p>
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
      cell: (row) => (
        <Badge tone={row.filteringDecision === "qualified" ? "success" : row.filteringDecision === "disqualified" ? "danger" : "warning"}>
          {row.filteringDecision}
        </Badge>
      )
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
      cell: (row) => row.rank ? `#${row.rank}` : "-"
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
          { value: "awaitingTieBreak", label: language === "ar" ? "بانتظار كسر التعادل" : "Awaiting tie-break" },
          { value: "approvedWinner", label: language === "ar" ? "فائز معتمد" : "Approved winner" }
        ]}
      />
      <DataTable rows={rows} columns={columns} empty={<EmptyState title={language === "ar" ? "لا توجد أعمال" : "No entries"} />} />
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          {language === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {language === "ar" ? "السابق" : "Previous"}
        </Button>
        <p className="text-sm font-semibold text-slate-600">{page} / {pages}</p>
        <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
          {language === "ar" ? "التالي" : "Next"}
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
    return <EmptyState title={language === "ar" ? "لم يتم العثور على العمل" : "Entry not found"} />;
  }

  const track = tracks.find((item) => item.id === entry.trackId);
  const entryEvaluations = evaluations.filter((evaluation) => evaluation.entryId === entry.id);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <EntryPreview entry={entry} track={track} language={language} />
        <Card>
          <CardHeader>
            <CardTitle>{entry.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Info label={t(language, "participant")} value={entry.participantName} />
            <Info label={t(language, "country")} value={entry.participantCountry} />
            <Info label={t(language, "track")} value={track ? localized(language, track.name) : entry.trackId} />
            <Info label={language === "ar" ? "الفئة" : "Category"} value={entry.category} />
            <Info label={language === "ar" ? "تاريخ التقديم" : "Submission date"} value={entry.submissionDate} />
            <Info label={t(language, "rank")} value={entry.rank ? `#${entry.rank}` : "-"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t(language, "filtering")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(entry.filteringChecklist).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-600">{checklistLabel(key, language)}</span>
                <StatusBadge group="checklist" value={value} language={language} />
              </div>
            ))}
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{entry.qualificationReason}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "الدرجات" : "Scores"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label={language === "ar" ? "الأولية" : "Initial"} value={`${entry.totalScore.toFixed(2)}`} />
            <Info label={language === "ar" ? "النهائية الموزونة" : "Weighted final"} value={`${entry.finalScore.toFixed(2)}`} />
            <Info label={language === "ar" ? "أثر التوعية" : "Awareness impact"} value={`${entry.awarenessScore.toFixed(2)}`} />
            <StatusBadge group="finalist" value={entry.finalistStatus} language={language} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "معاينة الوسائط" : "Media preview"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid aspect-video place-items-center rounded-lg bg-gradient-to-br from-navy-900 via-navy-700 to-gulf-blue text-white">
              <FileText className="h-10 w-10" />
            </div>
            <p className="mt-3 truncate text-xs text-slate-500">{entry.entryUrl}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "درجات المحكمين" : "Evaluator scores"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {entryEvaluations.map((evaluation) => {
            const evaluator = evaluators.find((item) => item.id === evaluation.evaluatorId);
            return (
              <div key={evaluation.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy-900">{evaluator?.fullName ?? evaluation.evaluatorId}</p>
                    <p className="text-xs text-slate-500">{evaluation.stage}</p>
                  </div>
                  <Badge tone={evaluation.status === "submitted" ? "success" : "warning"}>{evaluation.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  {criteria.map((criterion) => (
                    <div key={criterion.id} className="flex items-center justify-between">
                      <span>{localized(language, criterion.name)}</span>
                      <strong>{evaluation.scores[criterion.id]}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">{evaluation.comments}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "سجل العمل" : "Workflow history"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activities
            .filter((activity) => activity.entity === entry.id)
            .map((activity) => (
              <div key={activity.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <strong>{activity.action}</strong> · {new Date(activity.date).toLocaleString(language === "ar" ? "ar" : "en")}
              </div>
            ))}
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{entry.notes}</div>
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

function checklistLabel(key: string, language: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    relevance: { ar: "الصلة بالتوعية المالية والاستثمارية", en: "Financial/investment relevance" },
    intellectualProperty: { ar: "حقوق الملكية الفكرية", en: "Intellectual property rights" },
    rulesCompliance: { ar: "الشروط العامة وشروط المسار", en: "General and track rules" }
  };
  return labels[key]?.[language] ?? key;
}
