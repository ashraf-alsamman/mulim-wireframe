"use client";

import { ArrowLeft, ArrowRight, BadgeCheck, Calculator, Check, RotateCcw, Save, Search, Send, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ScoreInput } from "@/components/score-input";
import { SearchFilterToolbar } from "@/components/search-filter-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import { Progress } from "@/components/ui/progress";
import { WeightedScoreBreakdown } from "@/components/weighted-score-breakdown";
import { localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { ChecklistStatus, CriterionId, CriterionScores, Entry, FilteringChecklist } from "@/types/demo";
import { activeCriteria, committeeVoteWinner, maximumPossibleScore, rankEntries } from "@/utils/calculations";
import { can } from "@/utils/permissions";

const emptyScores: CriterionScores = {
  workQuality: 0,
  creativity: 0,
  awarenessImpact: 0
};
const initialPassRate = 0.6;

function initialPassThreshold(maxScore: number) {
  return Math.round(maxScore * initialPassRate * 100) / 100;
}

export function FilteringView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const updateFilteringDecision = useDemoStore((state) => state.updateFilteringDecision);
  const bulkQualifyEntries = useDemoStore((state) => state.bulkQualifyEntries);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [checklist, setChecklist] = useState<FilteringChecklist | null>(null);
  const [notes, setNotes] = useState("");
  const editable = can(role, "filterEntries");

  const rows = entries.filter((entry) => {
    const text = `${entry.id} ${entry.title} ${entry.participantName}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

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
      key: "relevance",
      header: language === "ar" ? "الصلة" : "Relevance",
      cell: (row) => <StatusBadge group="checklist" value={row.filteringChecklist.relevance} language={language} />
    },
    {
      key: "ip",
      header: language === "ar" ? "الملكية" : "IP rights",
      cell: (row) => <StatusBadge group="checklist" value={row.filteringChecklist.intellectualProperty} language={language} />
    },
    {
      key: "rules",
      header: language === "ar" ? "الشروط" : "Rules",
      cell: (row) => <StatusBadge group="checklist" value={row.filteringChecklist.rulesCompliance} language={language} />
    },
    {
      key: "decision",
      header: t(language, "status"),
      cell: (row) => <Badge tone={row.filteringDecision === "qualified" ? "success" : row.filteringDecision === "disqualified" ? "danger" : "warning"}>{row.filteringDecision}</Badge>
    },
    {
      key: "actions",
      header: t(language, "actions"),
      cell: (row) => (
        <Button
          variant="secondary"
          disabled={!editable}
          onClick={() => {
            setSelected(row);
            setChecklist(row.filteringChecklist);
            setNotes(row.notes);
          }}
        >
          {t(language, "edit")}
        </Button>
      )
    }
  ];

  function updateItem(key: keyof FilteringChecklist, value: ChecklistStatus) {
    setChecklist((current) => (current ? { ...current, [key]: value } : current));
  }

  function save(decision: "qualified" | "disqualified" | "returned") {
    if (!selected || !checklist) {
      return;
    }
    updateFilteringDecision(selected.id, checklist, decision, notes);
    setSelected(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchFilterToolbar language={language} search={search} onSearchChange={setSearch} />
        <Button disabled={!editable} variant="secondary" onClick={bulkQualifyEntries}>
          <BadgeCheck className="h-4 w-4" />
          {t(language, "bulkQualify")}
        </Button>
      </div>
      <DataTable rows={rows} columns={columns} />
      <Dialog
        open={Boolean(selected)}
        onOpenChange={() => setSelected(null)}
        title={selected ? `${selected.id} · ${selected.title}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => save("returned")}>{t(language, "returnReview")}</Button>
            <Button variant="danger" onClick={() => save("disqualified")}>{t(language, "disqualify")}</Button>
            <Button variant="success" onClick={() => save("qualified")}>{t(language, "qualify")}</Button>
          </>
        }
      >
        {checklist ? (
          <div className="space-y-4">
            {(["relevance", "intellectualProperty", "rulesCompliance"] as Array<keyof FilteringChecklist>).map((key) => (
              <div key={key} className="grid gap-2 md:grid-cols-[1fr_220px] md:items-center">
                <p className="font-semibold text-slate-700">{filteringLabel(key, language)}</p>
                <Select value={checklist[key]} onChange={(event) => updateItem(key, event.target.value as ChecklistStatus)}>
                  <option value="passed">{language === "ar" ? "ناجح" : "Passed"}</option>
                  <option value="failed">{language === "ar" ? "راسب" : "Failed"}</option>
                  <option value="review">{language === "ar" ? "يتطلب مراجعة" : "Requires review"}</option>
                </Select>
              </div>
            ))}
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function InitialEvaluationView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const entries = useDemoStore((state) => state.entries);
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const evaluations = useDemoStore((state) => state.evaluations);
  const criteriaSource = useDemoStore((state) => state.criteria);
  const settings = useDemoStore((state) => state.settings);
  const saveEvaluation = useDemoStore((state) => state.saveEvaluation);
  const criteria = useMemo(() => activeCriteria(criteriaSource), [criteriaSource]);
  const eligibleEntries = useMemo(() => entries.filter((entry) => entry.filteringDecision === "qualified"), [entries]);
  const maxScore = maximumPossibleScore(criteria);
  const passThreshold = initialPassThreshold(maxScore);
  const [entryId, setEntryId] = useState(eligibleEntries[0]?.id ?? "");
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const entry = eligibleEntries.find((item) => item.id === entryId) ?? eligibleEntries[0];
  const entryIndex = entry ? eligibleEntries.findIndex((item) => item.id === entry.id) : -1;
  const committee = entry ? committees.find((item) => item.trackId === entry.trackId) : undefined;
  const specialist = committee?.members.find((member) => member.role === "specialist");
  const evaluator = specialist ? evaluators.find((item) => item.id === specialist.evaluatorId) : undefined;
  const existing = entry && specialist ? evaluations.find((item) => item.entryId === entry.id && item.evaluatorId === specialist.evaluatorId && item.stage === "initial") : undefined;
  const [scores, setScores] = useState<CriterionScores>(existing?.scores ?? emptyScores);
  const [comments, setComments] = useState(existing?.comments ?? "");
  const total = criteria.reduce((sum, criterion) => sum + scores[criterion.id], 0);
  const editable = can(role, "submitInitialEvaluation") && !settings.locked;

  useEffect(() => {
    const currentEntryExists = eligibleEntries.some((item) => item.id === entryId);
    if (eligibleEntries.length > 0 && !currentEntryExists) {
      setEntryId(eligibleEntries[0].id);
    }
    if (eligibleEntries.length === 0 && entryId) {
      setEntryId("");
    }
  }, [eligibleEntries, entryId]);

  useEffect(() => {
    setScores(existing?.scores ?? emptyScores);
    setComments(existing?.comments ?? "");
  }, [entry?.id, evaluator?.id, existing?.scores, existing?.comments]);

  function changeScore(id: CriterionId, value: number) {
    const criterion = criteria.find((item) => item.id === id);
    setScores((current) => ({ ...current, [id]: Math.max(0, Math.min(criterion?.maxScore ?? 10, value)) }));
  }

  function persist(finalSubmit: boolean) {
    if (!entry || !evaluator) {
      return;
    }
    if (finalSubmit && criteria.some((criterion) => scores[criterion.id] <= 0)) {
      window.alert(language === "ar" ? "أدخل درجات جميع المعايير قبل الإرسال." : "Score every criterion before submitting.");
      return;
    }
    if (finalSubmit && !window.confirm(language === "ar" ? "تأكيد الإرسال النهائي؟" : "Confirm final submission?")) {
      return;
    }
    saveEvaluation({
      entryId: entry.id,
      evaluatorId: evaluator.id,
      stage: "initial",
      scores,
      comments,
      finalSubmit
    });
  }

  if (!entry) {
    return <EmptyState title={language === "ar" ? "لا توجد أعمال مؤهلة للتقييم الأولي" : "No entries eligible for initial evaluation"} />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "اختيار عمل للتقييم" : "Choose an entry to evaluate"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EntrySelectionList
            language={language}
            label={language === "ar" ? "الأعمال المؤهلة بعد الفرز" : "Entries qualified after filtering"}
            entries={eligibleEntries}
            selectedEntryId={entry.id}
            onSelect={(selectedEntryId) => {
              setEntryId(selectedEntryId);
              setEvaluationOpen(true);
            }}
            maxScore={maxScore}
          />
        </CardContent>
      </Card>

      <Dialog open={evaluationOpen} onOpenChange={setEvaluationOpen} title={t(language, "initialEvaluation")} className="w-[min(96vw,1180px)]">
        <EvaluationPanel
          language={language}
          title={language === "ar" ? "تقييم العمل المختار" : "Evaluate selected entry"}
          entry={entry}
          evaluatorName={evaluator?.fullName ?? "-"}
          total={total}
          maxScore={maxScore}
          threshold={passThreshold}
          scores={scores}
          comments={comments}
          criteria={criteria}
          editable={editable}
          onScore={changeScore}
          onComments={setComments}
          onDraft={() => persist(false)}
          onSubmit={() => persist(true)}
          onPrevious={() => {
            const previousEntry = eligibleEntries[entryIndex - 1];
            if (previousEntry) {
              setEntryId(previousEntry.id);
            }
          }}
          onNext={() => {
            const nextEntry = eligibleEntries[entryIndex + 1];
            if (nextEntry) {
              setEntryId(nextEntry.id);
            }
          }}
          previousDisabled={entryIndex <= 0}
          nextDisabled={entryIndex >= eligibleEntries.length - 1}
        />
      </Dialog>
    </div>
  );
}

export function FinalEvaluationView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const entries = useDemoStore((state) => state.entries);
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const evaluations = useDemoStore((state) => state.evaluations);
  const criteriaSource = useDemoStore((state) => state.criteria);
  const settings = useDemoStore((state) => state.settings);
  const saveEvaluation = useDemoStore((state) => state.saveEvaluation);
  const criteria = useMemo(() => activeCriteria(criteriaSource), [criteriaSource]);
  const maxScore = maximumPossibleScore(criteria);
  const passThreshold = initialPassThreshold(maxScore);
  const eligibleEntries = useMemo(
    () => entries.filter((entry) => entry.filteringDecision === "qualified" && entry.totalScore >= passThreshold),
    [entries, passThreshold]
  );
  const [entryId, setEntryId] = useState(eligibleEntries[0]?.id ?? "");
  const entry = eligibleEntries.find((item) => item.id === entryId) ?? eligibleEntries[0];
  const committee = entry ? committees.find((item) => item.trackId === entry.trackId) : undefined;
  const [evaluatorId, setEvaluatorId] = useState(committee?.members[0]?.evaluatorId ?? "");
  const activeEvaluatorId = evaluatorId || committee?.members[0]?.evaluatorId || "";
  const existing = entry ? evaluations.find((item) => item.entryId === entry.id && item.evaluatorId === activeEvaluatorId && item.stage === "final") : undefined;
  const [scores, setScores] = useState<CriterionScores>(existing?.scores ?? emptyScores);
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [calculationOpen, setCalculationOpen] = useState(false);
  const editable = can(role, "submitFinalEvaluation") && !settings.locked;
  const total = criteria.reduce((sum, criterion) => sum + scores[criterion.id], 0);

  useEffect(() => {
    const currentEntryExists = eligibleEntries.some((item) => item.id === entryId);
    if (eligibleEntries.length > 0 && !currentEntryExists) {
      setEntryId(eligibleEntries[0].id);
    }
    if (eligibleEntries.length === 0 && entryId) {
      setEntryId("");
    }
  }, [eligibleEntries, entryId]);

  useEffect(() => {
    const currentEvaluatorExists = committee?.members.some((member) => member.evaluatorId === evaluatorId);
    if (committee?.members.length && !currentEvaluatorExists) {
      setEvaluatorId(committee.members[0].evaluatorId);
    }
  }, [committee, evaluatorId]);

  useEffect(() => {
    setScores(existing?.scores ?? emptyScores);
    setComments(existing?.comments ?? "");
  }, [entry?.id, activeEvaluatorId, existing?.scores, existing?.comments]);

  function changeScore(id: CriterionId, value: number) {
    const criterion = criteria.find((item) => item.id === id);
    setScores((current) => ({ ...current, [id]: Math.max(0, Math.min(criterion?.maxScore ?? 10, value)) }));
  }

  function persist(finalSubmit: boolean) {
    if (!entry || !activeEvaluatorId) {
      return;
    }
    if (finalSubmit && criteria.some((criterion) => scores[criterion.id] <= 0)) {
      window.alert(language === "ar" ? "أدخل درجات جميع المعايير قبل الإرسال." : "Score every criterion before submitting.");
      return;
    }
    saveEvaluation({
      entryId: entry.id,
      evaluatorId: activeEvaluatorId,
      stage: "final",
      scores,
      comments,
      finalSubmit
    });
  }

  if (!entry || !committee) {
    return <EmptyState title={language === "ar" ? "لا توجد أعمال للتقييم النهائي" : "No entries eligible for final evaluation"} />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "اختيار عمل متأهل ومقيم" : "Choose a passed entry and evaluator"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EntrySelectionList
            language={language}
            label={language === "ar" ? "الأعمال التي عدت التقييم الأولي" : "Entries that passed initial evaluation"}
            entries={eligibleEntries}
            selectedEntryId={entry.id}
            onSelect={setEntryId}
            maxScore={maxScore}
            showInitialScore
          />
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-2">
              <Label htmlFor="final-evaluator-select">{language === "ar" ? "المقيم" : "Evaluator"}</Label>
              <Select id="final-evaluator-select" value={activeEvaluatorId} onChange={(event) => setEvaluatorId(event.target.value)}>
                {committee.members.map((member) => {
                  const evaluator = evaluators.find((item) => item.id === member.evaluatorId);
                  return (
                    <option key={member.evaluatorId} value={member.evaluatorId}>
                      {evaluator?.fullName ?? member.evaluatorId} · {member.weight}%
                    </option>
                  );
                })}
              </Select>
            </div>
            <div className="sketch-note p-3 text-sm">
              <p className="font-bold text-[var(--ink)]">{language === "ar" ? "شرط الظهور في القائمة" : "List rule"}</p>
              <p className="mt-1 text-[var(--ink-soft)]">
                {Math.round(initialPassRate * 100)}% = {passThreshold} / {maxScore}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EvaluationPanel
        language={language}
        title={t(language, "finalEvaluation")}
        entry={entry}
        evaluatorName={evaluators.find((item) => item.id === activeEvaluatorId)?.fullName ?? activeEvaluatorId}
        total={total}
        maxScore={maxScore}
        scores={scores}
        comments={comments}
        criteria={criteria}
        editable={editable}
        onScore={changeScore}
        onComments={setComments}
        onDraft={() => persist(false)}
        onSubmit={() => persist(true)}
        extraAction={
          <Button variant="secondary" onClick={() => setCalculationOpen(true)}>
            <Calculator className="h-4 w-4" />
            {t(language, "calculation")}
          </Button>
        }
      />

      <Dialog open={calculationOpen} onOpenChange={setCalculationOpen} title={t(language, "calculation")}>
        <WeightedScoreBreakdown
          entryId={entry.id}
          committee={committee}
          evaluators={evaluators}
          evaluations={evaluations}
          criteria={criteria}
          language={language}
        />
      </Dialog>
    </div>
  );
}

function EntrySelectionList({
  language,
  label,
  entries,
  selectedEntryId,
  onSelect,
  maxScore,
  showInitialScore = false
}: {
  language: "ar" | "en";
  label: string;
  entries: Entry[];
  selectedEntryId: string;
  onSelect: (entryId: string) => void;
  maxScore: number;
  showInitialScore?: boolean;
}) {
  const pageSize = 12;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const searchable = `${entry.id} ${entry.title} ${entry.participantName} ${entry.trackId}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [entries, normalizedQuery]);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const start = (page - 1) * pageSize;
  const visibleEntries = filteredEntries.slice(start, start + pageSize);
  const firstVisible = filteredEntries.length === 0 ? 0 : start + 1;
  const lastVisible = Math.min(start + pageSize, filteredEntries.length);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery, entries]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="entry-list-search">{label}</Label>
          <div className="relative">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 ${language === "ar" ? "right-3" : "left-3"}`} />
            <Input
              id="entry-list-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === "ar" ? "ابحث بالكود أو العنوان أو اسم المشارك" : "Search by code, title, or participant"}
              className={language === "ar" ? "pr-10" : "pl-10"}
            />
          </div>
        </div>
        <div className="sketch-note p-3 text-sm">
          <p className="font-bold text-[var(--ink)]">{language === "ar" ? "نتائج القائمة" : "List results"}</p>
          <p className="mt-1 text-[var(--ink-soft)]">
            {language === "ar"
              ? `${firstVisible}-${lastVisible} من ${filteredEntries.length}`
              : `${firstVisible}-${lastVisible} of ${filteredEntries.length}`}
          </p>
        </div>
      </div>

      <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
        {visibleEntries.length > 0 ? (
          visibleEntries.map((entry) => {
            const selected = entry.id === selectedEntryId;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(entry.id)}
                className={`sketch-note block w-full p-3 text-start transition ${
                  selected ? "outline outline-2 outline-offset-2 outline-black" : "hover:-translate-y-0.5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-navy-900">{entry.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.id} · {entry.participantName} · {entry.trackId}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 text-xs">
                    {showInitialScore ? <span className="sketch-badge px-2 py-1">{entry.totalScore.toFixed(1)} / {maxScore}</span> : null}
                    {selected ? (
                      <span className="sketch-badge inline-flex items-center gap-1 px-2 py-1">
                        <Check className="h-3.5 w-3.5" />
                        {language === "ar" ? "مختار" : "Selected"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="sketch-note p-4 text-sm text-[var(--ink-soft)]">
            {language === "ar" ? "لا توجد نتائج مطابقة للبحث." : "No matching entries."}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--ink-soft)]">
          {language === "ar" ? `صفحة ${page} من ${pageCount}` : `Page ${page} of ${pageCount}`}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            {language === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {language === "ar" ? "السابق" : "Previous"}
          </Button>
          <Button variant="secondary" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            {language === "ar" ? "التالي" : "Next"}
            {language === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TieBreakingView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const tieCases = useDemoStore((state) => state.tieCases);
  const entries = useDemoStore((state) => state.entries);
  const evaluators = useDemoStore((state) => state.evaluators);
  const castTieVote = useDemoStore((state) => state.castTieVote);
  const closeTieVoting = useDemoStore((state) => state.closeTieVoting);
  const manualResolveTie = useDemoStore((state) => state.manualResolveTie);
  const voter = evaluators[0];
  const canVote = can(role, "submitFinalEvaluation");
  const canResolve = can(role, "manageCommittees");

  return (
    <div className="space-y-5">
      {tieCases.map((tieCase) => {
        const tiedEntries = tieCase.entryIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry): entry is Entry => Boolean(entry));
        const voteWinner = committeeVoteWinner(tieCase);
        return (
          <Card key={tieCase.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{tieCase.id} · {tieCase.reason}</CardTitle>
                <Badge tone={tieCase.status === "resolved" ? "success" : "warning"}>{tieCase.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {tiedEntries.map((entry) => (
                  <div key={entry.id} className="sketch-note p-4">
                    <p className="font-bold text-navy-900">{entry.title}</p>
                    <p className="text-sm text-slate-500">{entry.participantName} · #{entry.rank ?? "-"}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <InfoLine label={language === "ar" ? "الدرجة النهائية" : "Final score"} value={entry.finalScore.toFixed(2)} />
                      <InfoLine label={language === "ar" ? "أثر التوعية" : "Awareness"} value={entry.awarenessScore.toFixed(2)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button disabled={!canVote || tieCase.status !== "voting"} onClick={() => castTieVote(tieCase.id, voter.id, entry.id)}>
                        <ThumbsUp className="h-4 w-4" />
                        {language === "ar" ? "تصويت" : "Vote"}
                      </Button>
                      <Button disabled={!canResolve} variant="secondary" onClick={() => manualResolveTie(tieCase.id, entry.id)}>
                        {t(language, "manualResolve")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sketch-note p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-700">
                    {language === "ar" ? "تقدم التصويت" : "Voting progress"} · {tieCase.votes.length}/{evaluators.length}
                  </p>
                  <Button disabled={!canResolve || tieCase.status !== "voting"} onClick={() => closeTieVoting(tieCase.id)}>
                    {t(language, "closeVoting")}
                  </Button>
                </div>
                <Progress value={(tieCase.votes.length / Math.max(1, evaluators.length)) * 100} className="mt-3" />
                {tieCase.status !== "voting" ? (
                  <p className="mt-3 text-sm text-slate-600">
                    {language === "ar" ? "الفائز حسب التصويت:" : "Vote winner:"} {voteWinner ?? tieCase.manualWinnerId ?? "-"}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    {language === "ar" ? "يتم إخفاء المجاميع الحية حتى إغلاق التصويت." : "Live totals are hidden until voting closes."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ApprovalsView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const entries = useDemoStore((state) => state.entries);
  const tieCases = useDemoStore((state) => state.tieCases);
  const settings = useDemoStore((state) => state.settings);
  const approvalHistory = useDemoStore((state) => state.approvalHistory);
  const submitResults = useDemoStore((state) => state.submitResults);
  const approveResults = useDemoStore((state) => state.approveResults);
  const returnResults = useDemoStore((state) => state.returnResults);
  const lockResults = useDemoStore((state) => state.lockResults);
  const reopenDemo = useDemoStore((state) => state.reopenDemo);
  const [comments, setComments] = useState(settings.approvalComments);
  const ranked = rankEntries(entries.filter((entry) => entry.finalScore > 0), tieCases).slice(0, settings.finalistCount);
  const canApprove = can(role, "approveResults");

  const columns: Array<Column<Entry & { rank: number }>> = [
    {
      key: "rank",
      header: t(language, "rank"),
      cell: (row) => `#${row.rank}`
    },
    {
      key: "entry",
      header: t(language, "entries"),
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{row.title}</p>
          <p className="text-xs text-slate-500">{row.participantName}</p>
        </div>
      )
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
      key: "status",
      header: t(language, "status"),
      cell: (row) => <StatusBadge group="finalist" value={row.finalistStatus} language={language} />
    }
  ];

  return (
    <div className="space-y-5">
      {settings.locked ? (
        <div className="sketch-note bg-[var(--paper-soft)] p-4 text-sm font-bold text-[var(--ink)]">{t(language, "lockedWarning")}</div>
      ) : null}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t(language, "approvalStatus")}</CardTitle>
            <StatusBadge group="approval" value={settings.approvalStatus} language={language} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={comments} onChange={(event) => setComments(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={!can(role, "manageAll")} onClick={submitResults}>
              <Send className="h-4 w-4" />
              {t(language, "submit")}
            </Button>
            <Button disabled={!canApprove} variant="success" onClick={() => approveResults(comments)}>
              <Check className="h-4 w-4" />
              {t(language, "approve")}
            </Button>
            <Button disabled={!canApprove} variant="secondary" onClick={() => returnResults(comments)}>
              <RotateCcw className="h-4 w-4" />
              {t(language, "returnChanges")}
            </Button>
            <Button
              disabled={!canApprove || settings.locked}
              variant="burgundy"
              onClick={() => {
                if (window.confirm(language === "ar" ? "قفل النتائج يمنع تعديل الدرجات والترتيب واللجان. هل تريد المتابعة؟" : "Locking prevents edits to scores, rankings, and committees. Continue?")) {
                  lockResults();
                }
              }}
            >
              {t(language, "lockResults")}
            </Button>
            <Button disabled={role !== "admin"} variant="ghost" onClick={reopenDemo}>
              {t(language, "reopenDemo")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <DataTable rows={ranked} columns={columns} />
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "سجل الاعتماد" : "Approval history"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {approvalHistory.map((item) => (
            <div key={item.id} className="sketch-note p-3 text-sm">
              <strong>{item.user}</strong> · {item.action} · {new Date(item.date).toLocaleString(language === "ar" ? "ar" : "en")}
              <p className="mt-1 text-slate-500">{item.comments}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EvaluationPanel({
  language,
  title,
  entry,
  evaluatorName,
  total,
  maxScore,
  threshold,
  scores,
  comments,
  criteria,
  editable,
  onScore,
  onComments,
  onDraft,
  onSubmit,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  extraAction
}: {
  language: "ar" | "en";
  title: string;
  entry: Entry;
  evaluatorName: string;
  total: number;
  maxScore: number;
  threshold?: number;
  scores: CriterionScores;
  comments: string;
  criteria: ReturnType<typeof activeCriteria>;
  editable: boolean;
  onScore: (id: CriterionId, value: number) => void;
  onComments: (value: string) => void;
  onDraft: () => void;
  onSubmit: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  extraAction?: ReactNode;
}) {
  const thresholdPercent = threshold === undefined || maxScore === 0 ? null : Math.round((threshold / maxScore) * 100);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoLine label={t(language, "entries")} value={`${entry.id} · ${entry.title}`} />
          <InfoLine label={t(language, "participant")} value={entry.participantName} />
          <InfoLine label={language === "ar" ? "المحكم" : "Evaluator"} value={evaluatorName} />
          <div className="rounded-lg bg-navy-50 p-4">
            <p className="text-sm font-semibold text-navy-700">{language === "ar" ? "المجموع" : "Total"}</p>
            <p className="text-4xl font-bold text-navy-900">{total.toFixed(1)} / {maxScore}</p>
            {threshold !== undefined ? (
              <p className="mt-1 text-sm text-slate-600">
                {language === "ar" ? "حد التأهل" : "Qualification threshold"} {thresholdPercent}% ({threshold} / {maxScore})
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {onPrevious ? (
              <Button variant="secondary" disabled={previousDisabled} onClick={onPrevious}>
                {language === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                {t(language, "previousEntry")}
              </Button>
            ) : null}
            {onNext ? (
              <Button variant="secondary" disabled={nextDisabled} onClick={onNext}>
                {t(language, "nextEntry")}
                {language === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          {criteria.map((criterion) => (
            <ScoreInput
              key={criterion.id}
              id={criterion.id}
              label={localized(language, criterion.name)}
              value={scores[criterion.id]}
              max={criterion.maxScore}
              disabled={!editable}
              onChange={onScore}
            />
          ))}
          <Textarea value={comments} disabled={!editable} onChange={(event) => onComments(event.target.value)} />
          <div className="flex flex-wrap justify-end gap-2">
            {extraAction}
            <Button variant="secondary" disabled={!editable} onClick={onDraft}>
              <Save className="h-4 w-4" />
              {t(language, "draft")}
            </Button>
            <Button disabled={!editable} onClick={onSubmit}>
              <Send className="h-4 w-4" />
              {t(language, "submitFinal")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <strong className="text-navy-900">{value}</strong>
    </div>
  );
}

function filteringLabel(key: keyof FilteringChecklist, language: "ar" | "en") {
  const labels: Record<keyof FilteringChecklist, { ar: string; en: string }> = {
    relevance: { ar: "الصلة بالتوعية المالية والاستثمارية", en: "Relevance to financial and investment awareness" },
    intellectualProperty: { ar: "تأكيد حقوق الملكية الفكرية", en: "Intellectual-property confirmation" },
    rulesCompliance: { ar: "الالتزام بالشروط العامة وشروط المسار", en: "General and track-condition compliance" }
  };
  return labels[key][language];
}
