"use client";

import Link from "next/link";
import { Download, FileJson, Printer, Sparkles, Trophy, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { TimelineStrip } from "@/components/timeline-view";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/forms";
import { localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { DemoStateSnapshot, Entry, TimelineItem } from "@/types/demo";
import { rankEntries, selectTopFinalists } from "@/utils/calculations";

export function WinnersView() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const settings = useDemoStore((state) => state.settings);
  const tieCases = useDemoStore((state) => state.tieCases);
  const updateWinnerStatus = useDemoStore((state) => state.updateWinnerStatus);
  const ranked = useMemo(() => {
    const approved = entries.filter((entry) => entry.finalistStatus === "approvedWinner");
    return approved.length ? rankEntries(approved, tieCases) : selectTopFinalists(entries, Math.min(12, settings.finalistCount), tieCases);
  }, [entries, settings.finalistCount, tieCases]);

  const columns: Array<Column<Entry & { rank: number }>> = [
    {
      key: "rank",
      header: t(language, "rank"),
      cell: (row) => <span className="text-lg font-bold text-burgundy-700">#{row.rank}</span>
    },
    {
      key: "entry",
      header: t(language, "winners"),
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{row.participantName}</p>
          <p className="text-xs text-slate-500">{row.title}</p>
        </div>
      )
    },
    {
      key: "track",
      header: t(language, "track"),
      cell: (row) => tracks.find((track) => track.id === row.trackId)?.name[language] ?? row.trackId
    },
    {
      key: "score",
      header: t(language, "score"),
      cell: (row) => row.finalScore.toFixed(2)
    },
    {
      key: "awareness",
      header: language === "ar" ? "أثر التوعية" : "Awareness",
      cell: (row) => row.awarenessScore.toFixed(2)
    },
    {
      key: "ops",
      header: language === "ar" ? "التواصل والسفر" : "Contact and travel",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.contactStatus === "responded" ? "success" : row.contactStatus === "contacted" ? "info" : "neutral"}>{row.contactStatus}</Badge>
          <Badge tone={row.travelStatus === "coordinated" ? "success" : "neutral"}>{row.travelStatus}</Badge>
          <Badge tone={row.ceremonyStatus === "confirmed" ? "success" : "warning"}>{row.ceremonyStatus}</Badge>
        </div>
      )
    },
    {
      key: "actions",
      header: t(language, "actions"),
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => updateWinnerStatus(row.id, { contactStatus: "contacted" })}>{t(language, "contact")}</Button>
          <Button size="sm" variant="secondary" onClick={() => updateWinnerStatus(row.id, { travelStatus: "coordinated" })}>{t(language, "coordinateTravel")}</Button>
          <Button size="sm" variant="secondary" onClick={() => updateWinnerStatus(row.id, { ceremonyStatus: "confirmed" })}>{t(language, "confirmCeremony")}</Button>
          <Button size="sm" onClick={() => updateWinnerStatus(row.id, { published: !row.published })}>{row.published ? t(language, "unpublish") : t(language, "publish")}</Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "الفائزون الإجماليون وحسب المسار" : "Overall and track winners"}</p>
          <p className="text-3xl font-bold text-navy-900">{ranked.length}</p>
        </div>
        <Button asChild variant="burgundy">
          <Link href="/winners/announcement">
            <Sparkles className="h-4 w-4" />
            {t(language, "announcement")}
          </Link>
        </Button>
      </div>
      <DataTable rows={ranked} columns={columns} />
    </div>
  );
}

export function AnnouncementView() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const tieCases = useDemoStore((state) => state.tieCases);
  const winners = rankEntries(entries.filter((entry) => entry.finalScore > 0), tieCases).slice(0, 6);
  const [index, setIndex] = useState(0);
  const winner = winners[index];
  const track = winner ? tracks.find((item) => item.id === winner.trackId) : undefined;

  if (!winner) {
    return <EmptyState title={language === "ar" ? "لا توجد نتائج للعرض" : "No winners to announce"} />;
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-lg bg-navy-900 p-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(86,166,214,0.35),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(159,36,70,0.3),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 40 }, (_, dot) => (
          <span
            key={dot}
            className="absolute h-2 w-2 animate-bounce rounded-sm bg-gulf-gold"
            style={{
              insetInlineStart: `${(dot * 17) % 100}%`,
              top: `${(dot * 23) % 100}%`,
              animationDelay: `${(dot % 9) * 120}ms`
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center text-center">
        <Trophy className="h-16 w-16 text-gulf-gold" />
        <p className="mt-6 text-lg font-semibold text-gulf-blue">{track ? localized(language, track.name) : winner.trackId}</p>
        <h1 className="mt-4 text-5xl font-bold md:text-7xl">{winner.participantName}</h1>
        <p className="mt-4 text-2xl text-white/85">{winner.title}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Badge tone="burgundy">#{winner.rank}</Badge>
          <Badge tone="success">{winner.participantCountry}</Badge>
          <Badge tone="info">{winner.finalScore.toFixed(2)}</Badge>
        </div>
        <div className="mt-10 flex gap-3">
          <Button variant="secondary" onClick={() => setIndex((current) => Math.max(0, current - 1))}>Previous</Button>
          <Button variant="secondary" onClick={() => setIndex((current) => Math.min(winners.length - 1, current + 1))}>Next</Button>
          <Button onClick={() => document.documentElement.requestFullscreen?.()}>{t(language, "fullScreen")}</Button>
        </div>
      </div>
    </div>
  );
}

export function TimelinePageView() {
  const language = useDemoStore((state) => state.language);
  const timeline = useDemoStore((state) => state.timeline);
  const updateTimelineItem = useDemoStore((state) => state.updateTimelineItem);

  const columns: Array<Column<TimelineItem>> = [
    {
      key: "title",
      header: t(language, "timeline"),
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{localized(language, row.title)}</p>
          <p className="text-xs text-slate-500">{row.owner}</p>
        </div>
      )
    },
    {
      key: "start",
      header: language === "ar" ? "البداية" : "Start",
      cell: (row) => <Input type="date" value={row.startDate} onChange={(event) => updateTimelineItem(row.id, { startDate: event.target.value })} />
    },
    {
      key: "due",
      header: language === "ar" ? "الاستحقاق" : "Due",
      cell: (row) => <Input type="date" value={row.dueDate} onChange={(event) => updateTimelineItem(row.id, { dueDate: event.target.value })} />
    },
    {
      key: "progress",
      header: t(language, "progress"),
      cell: (row) => (
        <Input type="number" min={0} max={100} value={row.progress} onChange={(event) => updateTimelineItem(row.id, { progress: Number(event.target.value) })} />
      )
    },
    {
      key: "status",
      header: t(language, "status"),
      cell: (row) => (
        <Select value={row.status} onChange={(event) => updateTimelineItem(row.id, { status: event.target.value as TimelineItem["status"] })}>
          <option value="notStarted">{language === "ar" ? "لم يبدأ" : "Not started"}</option>
          <option value="inProgress">{language === "ar" ? "جار" : "In progress"}</option>
          <option value="delayed">{language === "ar" ? "متأخر" : "Delayed"}</option>
          <option value="completed">{language === "ar" ? "مكتمل" : "Completed"}</option>
        </Select>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <TimelineStrip items={timeline} language={language} />
      <DataTable rows={timeline} columns={columns} />
    </div>
  );
}

type ReportKey = "progress" | "workload" | "scores" | "rankings" | "ties" | "approvals" | "winners";

export function ReportsView() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const evaluators = useDemoStore((state) => state.evaluators);
  const evaluations = useDemoStore((state) => state.evaluations);
  const committees = useDemoStore((state) => state.committees);
  const tieCases = useDemoStore((state) => state.tieCases);
  const approvalHistory = useDemoStore((state) => state.approvalHistory);
  const [report, setReport] = useState<ReportKey>("rankings");
  const rows = reportRows(report, { entries, evaluators, evaluations, committees, tieCases, approvalHistory });

  function exportCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Select value={report} onChange={(event) => setReport(event.target.value as ReportKey)} className="md:w-72">
            <option value="progress">{language === "ar" ? "تقدم المحكمين" : "Evaluator progress"}</option>
            <option value="workload">{language === "ar" ? "عبء المحكمين" : "Evaluator workload"}</option>
            <option value="scores">{language === "ar" ? "درجات الأعمال" : "Entry scores"}</option>
            <option value="rankings">{language === "ar" ? "الترتيب النهائي" : "Final rankings"}</option>
            <option value="ties">{language === "ar" ? "قرارات التعادل" : "Tie-breaking decisions"}</option>
            <option value="approvals">{language === "ar" ? "سجل الاعتماد" : "Approval history"}</option>
            <option value="winners">{language === "ar" ? "قائمة الفائزين" : "Winners list"}</option>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              {t(language, "csv")}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t(language, "print")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {Object.keys(rows[0] ?? { empty: "" }).map((key) => (
                  <th key={key} className="px-4 py-3 text-start font-bold">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, cell) => (
                    <td key={cell} className="px-4 py-3 text-slate-700">{String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SettingsView() {
  const language = useDemoStore((state) => state.language);
  const snapshot = useDemoStore((state) => state);
  const settings = useDemoStore((state) => state.settings);
  const updateSettings = useDemoStore((state) => state.updateSettings);
  const resetDemoData = useDemoStore((state) => state.resetDemoData);
  const importSnapshot = useDemoStore((state) => state.importSnapshot);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportBackup() {
    const data: DemoStateSnapshot = {
      language: snapshot.language,
      role: snapshot.role,
      tracks: snapshot.tracks,
      evaluators: snapshot.evaluators,
      committees: snapshot.committees,
      criteria: snapshot.criteria,
      entries: snapshot.entries,
      evaluations: snapshot.evaluations,
      tieCases: snapshot.tieCases,
      timeline: snapshot.timeline,
      notifications: snapshot.notifications,
      activities: snapshot.activities,
      approvalHistory: snapshot.approvalHistory,
      settings: snapshot.settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "demo-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File | undefined) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(String(reader.result)) as DemoStateSnapshot;
      importSnapshot(parsed);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t(language, "settings")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t(language, "initialThreshold")}</Label>
            <Input
              type="number"
              min={0}
              value={settings.initialQualificationThreshold}
              onChange={(event) => updateSettings({ initialQualificationThreshold: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t(language, "finalistCount")}</Label>
            <Input type="number" min={1} value={settings.finalistCount} onChange={(event) => updateSettings({ finalistCount: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>{t(language, "approvalStatus")}</Label>
            <StatusBadge group="approval" value={settings.approvalStatus} language={language} />
          </div>
          <div className="space-y-2">
            <Label>{language === "ar" ? "حالة القفل" : "Lock state"}</Label>
            <Badge tone={settings.locked ? "burgundy" : "success"}>{settings.locked ? "Locked" : "Editable"}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportBackup}>
            <FileJson className="h-4 w-4" />
            {t(language, "jsonBackup")}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t(language, "importData")}
          </Button>
          <input ref={fileRef} hidden type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
          <Button variant="danger" onClick={resetDemoData}>
            {t(language, "reset")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "افتراضات PDF المستخدمة" : "PDF assumptions used"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600">
          <p>{language === "ar" ? "المسارات: الفيديو، الرسم، التصوير، الكتابة." : "Tracks: Video, Drawing, Photography, Writing."}</p>
          <p>{language === "ar" ? "المعايير: جودة العمل، الفكرة والإبداع، أثر التوعية المالية والاستثمارية، 10 درجات لكل معيار." : "Criteria: Work Quality, Idea and Creativity, Financial and Investment Awareness Impact, 10 points each."}</p>
          <p>{language === "ar" ? "الجدول الزمني الافتراضي: 1، 7، 8، 14، 29 مارس 2026." : "Default timeline: March 1, 7, 8, 14, and 29, 2026."}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function reportRows(
  report: ReportKey,
  data: {
    entries: Entry[];
    evaluators: ReturnType<typeof useDemoStore.getState>["evaluators"];
    evaluations: ReturnType<typeof useDemoStore.getState>["evaluations"];
    committees: ReturnType<typeof useDemoStore.getState>["committees"];
    tieCases: ReturnType<typeof useDemoStore.getState>["tieCases"];
    approvalHistory: ReturnType<typeof useDemoStore.getState>["approvalHistory"];
  }
): Array<Record<string, string | number>> {
  if (report === "progress") {
    return data.evaluators.map((evaluator) => ({
      evaluator: evaluator.fullName,
      submitted: data.evaluations.filter((evaluation) => evaluation.evaluatorId === evaluator.id && evaluation.status === "submitted").length,
      drafts: data.evaluations.filter((evaluation) => evaluation.evaluatorId === evaluator.id && evaluation.status === "draft").length
    }));
  }
  if (report === "workload") {
    return data.evaluators.map((evaluator) => ({
      evaluator: evaluator.fullName,
      assignedEntries: data.entries.filter((entry) => entry.assignedEvaluatorIds.includes(evaluator.id)).length,
      tracks: evaluator.assignedTrackIds.join(", ")
    }));
  }
  if (report === "scores") {
    return data.entries.map((entry) => ({
      id: entry.id,
      participant: entry.participantName,
      initialScore: entry.totalScore,
      finalScore: entry.finalScore,
      status: entry.finalistStatus
    }));
  }
  if (report === "ties") {
    return data.tieCases.map((tieCase) => ({
      id: tieCase.id,
      entries: tieCase.entryIds.join(", "),
      status: tieCase.status,
      votes: tieCase.votes.length,
      manualWinner: tieCase.manualWinnerId ?? ""
    }));
  }
  if (report === "approvals") {
    return data.approvalHistory.map((item) => ({
      user: item.user,
      action: item.action,
      date: item.date,
      comments: item.comments
    }));
  }
  const ranked = rankEntries(data.entries.filter((entry) => entry.finalScore > 0), data.tieCases);
  return ranked.map((entry) => ({
    rank: entry.rank,
    id: entry.id,
    participant: entry.participantName,
    country: entry.participantCountry,
    title: entry.title,
    finalScore: entry.finalScore,
    awarenessScore: entry.awarenessScore,
    status: entry.finalistStatus
  }));
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll("\"", "\"\"")}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}
