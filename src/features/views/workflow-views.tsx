"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Bot, Calculator, Check, ChevronDown, EyeOff, RotateCcw, Save, Search, Send, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

type AiScreenQuestion = "similarDesigns" | "badWords" | "inappropriateImage" | "emptyContent";
type AiScreenAction = "none" | "return" | "hide";
type AiFindingFilter = "all" | "flagged" | AiScreenQuestion;

const aiQuestionKeys: AiScreenQuestion[] = ["similarDesigns", "badWords", "inappropriateImage", "emptyContent"];
const defaultAiScreenChecks: Record<AiScreenQuestion, boolean> = {
  similarDesigns: true,
  badWords: true,
  inappropriateImage: true,
  emptyContent: true
};

export function FilteringView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const updateFilteringDecision = useDemoStore((state) => state.updateFilteringDecision);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [checklist, setChecklist] = useState<FilteringChecklist | null>(null);
  const [notes, setNotes] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiEntryId, setAiEntryId] = useState("");
  const [aiChecks, setAiChecks] = useState(defaultAiScreenChecks);
  const [aiFindings, setAiFindings] = useState<Record<AiScreenQuestion, boolean> | null>(null);
  const [aiScreenResults, setAiScreenResults] = useState<Record<string, Record<AiScreenQuestion, boolean>>>({});
  const [aiFindingFilter, setAiFindingFilter] = useState<AiFindingFilter>("all");
  const [aiFilterOpen, setAiFilterOpen] = useState(false);
  const [aiAction, setAiAction] = useState<AiScreenAction>("return");
  const [aiScanning, setAiScanning] = useState(false);
  const [aiScanCountdown, setAiScanCountdown] = useState(3);
  const [aiResultCount, setAiResultCount] = useState<number | null>(null);
  const aiFilterRef = useRef<HTMLDivElement | null>(null);
  const aiScanTimerRef = useRef<number | null>(null);
  const aiScanIntervalRef = useRef<number | null>(null);
  const editable = can(role, "filterEntries");

  useEffect(() => {
    return () => {
      if (aiScanTimerRef.current !== null) {
        window.clearTimeout(aiScanTimerRef.current);
      }
      if (aiScanIntervalRef.current !== null) {
        window.clearInterval(aiScanIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!aiFilterOpen) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (aiFilterRef.current && !aiFilterRef.current.contains(event.target as Node)) {
        setAiFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [aiFilterOpen]);

  const searchedRows = entries.filter((entry) => {
    const text = `${entry.id} ${entry.title} ${entry.participantName}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });
  const rows = searchedRows.filter((entry) => {
    const result = aiScreenResults[entry.id];

    if (aiFindingFilter === "all") {
      return true;
    }
    if (!result) {
      return false;
    }
    if (aiFindingFilter === "flagged") {
      return aiQuestionKeys.some((key) => result[key]);
    }
    return result[aiFindingFilter];
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

  const aiEntry = entries.find((entry) => entry.id === aiEntryId) ?? searchedRows[0] ?? entries[0];
  const aiFindingKeys = aiFindings ? aiQuestionKeys.filter((key) => aiFindings[key]) : [];

  function aiFilterCount(filter: AiFindingFilter) {
    if (filter === "all") {
      return searchedRows.length;
    }

    return searchedRows.filter((entry) => {
      const result = aiScreenResults[entry.id];
      if (!result) {
        return false;
      }
      if (filter === "flagged") {
        return aiQuestionKeys.some((key) => result[key]);
      }
      return result[filter];
    }).length;
  }

  function aiFilterBadgeClass(filter: AiFindingFilter) {
    return filter === "all" ? "bg-[var(--accent-green)]" : "bg-red-600";
  }

  function buildAiScreeningBatch(seedEntry: Entry, resultCount: number) {
    const seedFindings = mockAiScreen(seedEntry, aiChecks);
    const foundKeys = aiQuestionKeys.filter((key) => seedFindings[key]);

    if (foundKeys.length === 0) {
      return { [seedEntry.id]: seedFindings };
    }

    const seedIndex = Math.max(0, searchedRows.findIndex((entry) => entry.id === seedEntry.id));
    const orderedRows = [...searchedRows.slice(seedIndex), ...searchedRows.slice(0, seedIndex)];
    const targetRows = orderedRows.slice(0, Math.min(resultCount, orderedRows.length));

    return targetRows.reduce<Record<string, Record<AiScreenQuestion, boolean>>>((batch, entry) => {
      batch[entry.id] = {
        similarDesigns: foundKeys.includes("similarDesigns"),
        badWords: foundKeys.includes("badWords"),
        inappropriateImage: foundKeys.includes("inappropriateImage"),
        emptyContent: foundKeys.includes("emptyContent")
      };
      return batch;
    }, {});
  }

  function aiScreeningBatchMatchCount(batch: Record<string, Record<AiScreenQuestion, boolean>>) {
    return Object.values(batch).filter((result) => aiQuestionKeys.some((key) => result[key])).length;
  }

  const aiFilterOptions: Array<{ value: AiFindingFilter; label: string; count: number }> = [
    { value: "all", label: language === "ar" ? "كل الأعمال" : "All entries", count: aiFilterCount("all") },
    { value: "flagged", label: language === "ar" ? "أي ملاحظة مرصودة" : "Any AI finding", count: aiFilterCount("flagged") },
    { value: "similarDesigns", label: aiQuestionLabel("similarDesigns", language), count: aiFilterCount("similarDesigns") },
    { value: "badWords", label: aiQuestionLabel("badWords", language), count: aiFilterCount("badWords") },
    { value: "inappropriateImage", label: aiQuestionLabel("inappropriateImage", language), count: aiFilterCount("inappropriateImage") },
    { value: "emptyContent", label: language === "ar" ? "محتوى فارغ" : "Empty content", count: aiFilterCount("emptyContent") }
  ];
  const selectedAiFilter = aiFilterOptions.find((option) => option.value === aiFindingFilter) ?? aiFilterOptions[0];
  const hasAiScreenedEntries = Object.keys(aiScreenResults).length > 0;

  function clearAiScanTimers() {
    if (aiScanTimerRef.current !== null) {
      window.clearTimeout(aiScanTimerRef.current);
      aiScanTimerRef.current = null;
    }
    if (aiScanIntervalRef.current !== null) {
      window.clearInterval(aiScanIntervalRef.current);
      aiScanIntervalRef.current = null;
    }
  }

  function resetAiScanOutput() {
    clearAiScanTimers();
    setAiScanning(false);
    setAiScanCountdown(3);
    setAiFindings(null);
    setAiResultCount(null);
  }

  function closeAiScreening() {
    resetAiScanOutput();
    setAiOpen(false);
  }

  function openAiScreening() {
    setAiEntryId(searchedRows[0]?.id ?? entries[0]?.id ?? "");
    setAiChecks(defaultAiScreenChecks);
    resetAiScanOutput();
    setAiAction("return");
    setAiOpen(true);
  }

  function runAiScreening() {
    if (!aiEntry || aiScanning) {
      return;
    }

    clearAiScanTimers();
    setAiFindings(null);
    setAiResultCount(null);
    setAiAction("none");
    setAiScanning(true);
    setAiScanCountdown(3);

    let remainingSeconds = 3;
    aiScanIntervalRef.current = window.setInterval(() => {
      remainingSeconds -= 1;
      setAiScanCountdown(Math.max(remainingSeconds, 1));
    }, 1000);

    aiScanTimerRef.current = window.setTimeout(() => {
      clearAiScanTimers();
      const findings = mockAiScreen(aiEntry, aiChecks);
      const resultCount = mockAiResultCount(aiEntry);
      const screeningBatch = buildAiScreeningBatch(aiEntry, resultCount);
      const matchedCount = aiScreeningBatchMatchCount(screeningBatch);
      const foundAnything = aiQuestionKeys.some((key) => findings[key]);
      setAiFindings(findings);
      setAiScreenResults((current) => ({ ...current, ...screeningBatch }));
      setAiResultCount(matchedCount);
      setAiAction(foundAnything ? "return" : "none");
      setAiScanning(false);
      setAiScanCountdown(3);
    }, 3000);
  }

  function applyAiDecision() {
    if (!aiEntry || !aiFindings || aiAction === "none") {
      closeAiScreening();
      return;
    }

    const foundLabels = aiFindingKeys.map((key) => aiFindingLabel(key, language)).join(", ");
    const aiNotes = `${aiEntry.notes}\nAI screening: ${foundLabels || "no issue"}`;
    const aiChecklist: FilteringChecklist = {
      relevance: aiFindings.emptyContent ? "failed" : aiEntry.filteringChecklist.relevance,
      intellectualProperty: aiFindings.similarDesigns ? "review" : aiEntry.filteringChecklist.intellectualProperty,
      rulesCompliance: aiFindings.badWords || aiFindings.inappropriateImage ? "failed" : aiEntry.filteringChecklist.rulesCompliance
    };

    updateFilteringDecision(aiEntry.id, aiChecklist, aiAction === "hide" ? "disqualified" : "returned", aiNotes);
    closeAiScreening();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchFilterToolbar language={language} search={search} onSearchChange={setSearch} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={!editable || entries.length === 0} variant="secondary" onClick={openAiScreening}>
            <Bot className="h-4 w-4" />
            {language === "ar" ? "فحص AI" : "AI check"}
          </Button>
          {hasAiScreenedEntries ? (
            <div ref={aiFilterRef} className="relative w-64" dir={language === "ar" ? "rtl" : "ltr"}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={aiFilterOpen}
                className="flex h-11 w-full items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent-green)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)]"
                onClick={() => setAiFilterOpen((open) => !open)}
              >
                <span className="flex items-center gap-2">
                  <span>{selectedAiFilter.label}</span>
                  {selectedAiFilter.count > 0 ? (
                    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black leading-none text-white ${aiFilterBadgeClass(selectedAiFilter.value)}`}>
                      {selectedAiFilter.count}
                    </span>
                  ) : null}
                </span>
                <ChevronDown className={`h-4 w-4 text-[var(--graphite)] transition ${aiFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {aiFilterOpen ? (
                <div
                  role="listbox"
                  className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-[18px] border border-[var(--line)] bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                >
                  {aiFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={option.value === aiFindingFilter}
                      className={`flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-sm font-semibold transition ${
                        option.value === aiFindingFilter ? "bg-[#e3f1f0] text-[var(--accent-green)]" : "text-[var(--ink)] hover:bg-[var(--paper)]"
                      }`}
                      onClick={() => {
                        setAiFindingFilter(option.value);
                        setAiFilterOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {option.count > 0 ? (
                        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black leading-none text-white ${aiFilterBadgeClass(option.value)}`}>
                          {option.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <DataTable rows={rows} columns={columns} />
      <Dialog
        open={aiOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeAiScreening();
            return;
          }
          setAiOpen(open);
        }}
        title={language === "ar" ? "فحص مبدئي بالذكاء الصناعي" : "AI-assisted screening"}
        className="w-[min(96vw,900px)]"
        footer={
          <>
            <Button variant="secondary" onClick={closeAiScreening}>{t(language, "cancel")}</Button>
            <Button disabled={aiScanning || !aiFindings || aiAction === "none"} variant={aiAction === "hide" ? "danger" : "secondary"} onClick={applyAiDecision}>
              {aiAction === "hide" ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {language === "ar" ? "تطبيق الإجراء" : "Apply action"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-3">
              <Label>{language === "ar" ? "العمل المطلوب فحصه" : "Entry to screen"}</Label>
              <Select
                value={aiEntry?.id ?? ""}
                disabled={aiScanning}
                onChange={(event) => {
                  setAiEntryId(event.target.value);
                  resetAiScanOutput();
                }}
              >
                {searchedRows.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.id} - {entry.title}
                  </option>
                ))}
              </Select>
              {aiEntry ? (
                <div className="sketch-note p-4">
                  <p className="font-bold text-[var(--ink)]">{aiEntry.title}</p>
                  <p className="mt-1 text-sm text-[var(--graphite)]">{aiEntry.participantName} · {aiEntry.id}</p>
                </div>
              ) : null}
            </div>

            <div className="sketch-note p-4">
              <p className="font-bold text-[var(--ink)]">{language === "ar" ? "بنود الفحص" : "Screening questions"}</p>
              <div className="mt-3 space-y-3">
                {aiQuestionKeys.map((key) => (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm font-bold">
                    <span>{aiQuestionLabel(key, language)}</span>
                    <input
                      type="checkbox"
                      checked={aiChecks[key]}
                      disabled={aiScanning}
                      onChange={(event) => {
                        setAiChecks((current) => ({ ...current, [key]: event.target.checked }));
                        resetAiScanOutput();
                      }}
                      className="h-4 w-4 accent-[var(--accent-green)]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--graphite)]">
              {language === "ar" ? "الفحص هنا تجريبي لعرض الفلو فقط، وبعد التطبيق يتم تحديث حالة الفرز." : "This is a demo AI check for the flow; applying updates the filtering state."}
            </p>
            <Button disabled={!aiEntry || aiScanning} onClick={runAiScreening}>
              <Bot className="h-4 w-4" />
              {aiScanning
                ? language === "ar"
                  ? `جاري الفحص ${aiScanCountdown}`
                  : `Scanning ${aiScanCountdown}`
                : language === "ar"
                  ? "فحص"
                  : "Run check"}
            </Button>
          </div>

          {aiScanning ? (
            <div className="sketch-note p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--ink)]">{language === "ar" ? "الذكاء الصناعي يفحص العمل الآن" : "AI is screening this entry"}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--graphite)]">
                    {language === "ar" ? "مقارنة التشابه، اللغة، الصورة، واكتمال المحتوى..." : "Checking similarity, language, image safety, and content completeness..."}
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-green)] text-2xl font-black text-white">
                  {aiScanCountdown}
                </div>
              </div>
              <Progress value={(3 - aiScanCountdown) * 34} className="mt-4" />
            </div>
          ) : null}

          {aiFindings ? (
            <div className="space-y-4">
              {aiResultCount ? (
                <div className="sketch-note p-4">
                  <p className="font-bold text-[var(--ink)]">
                    {language === "ar" ? `ظهرت ${aiResultCount} نتائج من فحص الذكاء الصناعي` : `${aiResultCount} AI screening results appeared`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--graphite)]">
                    {language === "ar" ? "النتائج دي متجمعة تحت البنود المختارة، وتقدر بعدها تختار إرجاع أو إخفاء." : "These results are grouped under the selected checks, then you can return or hide the entry."}
                  </p>
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {aiQuestionKeys.map((key) => {
                  const found = aiFindings[key];
                  return (
                    <div key={key} className={`sketch-note p-4 ${found ? "ring-2 ring-[var(--accent-red)]" : ""}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-[var(--ink)]">{aiQuestionLabel(key, language)}</p>
                        <Badge tone={found ? "danger" : "success"}>
                          {found ? (language === "ar" ? "تم الرصد" : "Found") : language === "ar" ? "سليم" : "Clear"}
                        </Badge>
                      </div>
                      {found ? (
                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--accent-red)]">
                          <AlertTriangle className="h-4 w-4" />
                          {aiFindingLabel(key, language)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_260px] md:items-center">
                <div className="sketch-note p-4">
                  <p className="font-bold text-[var(--ink)]">
                    {aiFindingKeys.length
                      ? language === "ar"
                        ? `تم رصد ${aiFindingKeys.length} ملاحظة تحتاج قرار`
                        : `${aiFindingKeys.length} issue(s) need a decision`
                      : language === "ar"
                        ? "لم يتم رصد مشاكل في البنود المختارة"
                        : "No issues found in selected checks"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--graphite)]">
                    {language === "ar" ? "اختر الإجراء المناسب، أو أغلق النافذة بدون تطبيق." : "Choose an action, or close without applying."}
                  </p>
                </div>
                <Select value={aiAction} onChange={(event) => setAiAction(event.target.value as AiScreenAction)}>
                  <option value="return">{language === "ar" ? "إرجاع للمراجعة" : "Return for review"}</option>
                  <option value="hide">{language === "ar" ? "إخفاء / استبعاد" : "Hide / disqualify"}</option>
                  <option value="none">{language === "ar" ? "بدون إجراء الآن" : "No action now"}</option>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
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
  const [evaluationOpen, setEvaluationOpen] = useState(false);
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
            onSelect={(selectedEntryId) => {
              setEntryId(selectedEntryId);
              setEvaluationOpen(true);
            }}
            maxScore={maxScore}
            showInitialScore
          />
        </CardContent>
      </Card>

      <Dialog
        open={evaluationOpen}
        onOpenChange={(open) => {
          setEvaluationOpen(open);
          if (!open) {
            setCalculationOpen(false);
          }
        }}
        title={t(language, "finalEvaluation")}
        className="w-[min(96vw,1180px)]"
      >
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "اختيار المقيم" : "Choose evaluator"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
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
                <p className="font-bold text-[var(--ink)]">{language === "ar" ? "شرط دخول النهائي" : "Final evaluation rule"}</p>
                <p className="mt-1 text-[var(--ink-soft)]">
                  {Math.round(initialPassRate * 100)}% = {passThreshold} / {maxScore}
                </p>
              </div>
            </CardContent>
          </Card>

          <EvaluationPanel
            language={language}
            title={language === "ar" ? "تقييم العمل المختار" : "Evaluate selected entry"}
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
        </div>
      </Dialog>

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
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const castTieVote = useDemoStore((state) => state.castTieVote);
  const closeTieVoting = useDemoStore((state) => state.closeTieVoting);
  const manualResolveTie = useDemoStore((state) => state.manualResolveTie);
  const [voterIdsByTie, setVoterIdsByTie] = useState<Record<string, string>>({});
  const [selectedTieId, setSelectedTieId] = useState("");
  const [tieSearch, setTieSearch] = useState("");
  const canVote = can(role, "submitFinalEvaluation");
  const canResolve = can(role, "manageCommittees");
  const normalizedTieSearch = tieSearch.trim().toLowerCase();
  const visibleTieCases = tieCases.filter((tieCase) => {
    if (!normalizedTieSearch) {
      return true;
    }
    const tiedEntries = tieCase.entryIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry): entry is Entry => Boolean(entry));
    const text = `${tieCase.id} ${tieCase.reason} ${tiedEntries.map((entry) => `${entry.participantName} ${entry.title} ${entry.id}`).join(" ")}`.toLowerCase();
    return text.includes(normalizedTieSearch);
  });
  const selectedTieCase = tieCases.find((tieCase) => tieCase.id === selectedTieId);
  const selectedTiedEntries = selectedTieCase
    ? selectedTieCase.entryIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry): entry is Entry => Boolean(entry))
    : [];
  const selectedTrackId = selectedTiedEntries[0]?.trackId;
  const selectedCommittee = selectedTrackId ? committees.find((item) => item.trackId === selectedTrackId) : undefined;
  const selectedTieVoters =
    selectedCommittee?.members
      .map((member) => evaluators.find((evaluator) => evaluator.id === member.evaluatorId))
      .filter((evaluator): evaluator is NonNullable<typeof evaluator> => Boolean(evaluator)) ?? evaluators;
  const selectedActiveVoterId = selectedTieCase ? (voterIdsByTie[selectedTieCase.id] ?? selectedTieVoters[0]?.id ?? "") : "";
  const selectedActiveVote = selectedTieCase?.votes.find((vote) => vote.evaluatorId === selectedActiveVoterId);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="tie-case-search">{language === "ar" ? "حالات التعادل" : "Tie cases"}</Label>
          <div className="relative">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 ${language === "ar" ? "right-3" : "left-3"}`} />
            <Input
              id="tie-case-search"
              value={tieSearch}
              onChange={(event) => setTieSearch(event.target.value)}
              placeholder={language === "ar" ? "ابحث باسم المشارك أو كود الحالة" : "Search by participant or tie case"}
              className={language === "ar" ? "pr-10" : "pl-10"}
            />
          </div>
        </div>
        <div className="sketch-note p-3 text-sm">
          <p className="font-bold text-[var(--ink)]">{language === "ar" ? "نتائج القائمة" : "List results"}</p>
          <p className="mt-1 text-[var(--ink-soft)]">
            {language === "ar" ? `${visibleTieCases.length} من ${tieCases.length}` : `${visibleTieCases.length} of ${tieCases.length}`}
          </p>
        </div>
      </div>

      {visibleTieCases.map((tieCase) => {
        const tiedEntries = tieCase.entryIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry): entry is Entry => Boolean(entry));
        const participantNames = tiedEntries.map((entry) => entry.participantName).join(" × ");
        const trackId = tiedEntries[0]?.trackId;
        const committee = trackId ? committees.find((item) => item.trackId === trackId) : undefined;
        const tieVoters =
          committee?.members
            .map((member) => evaluators.find((evaluator) => evaluator.id === member.evaluatorId))
            .filter((evaluator): evaluator is NonNullable<typeof evaluator> => Boolean(evaluator)) ?? evaluators;
        const activeVoterId = voterIdsByTie[tieCase.id] ?? tieVoters[0]?.id ?? "";
        const activeVoter = tieVoters.find((evaluator) => evaluator.id === activeVoterId);
        const activeVote = tieCase.votes.find((vote) => vote.evaluatorId === activeVoterId);
        const voteWinner = committeeVoteWinner(tieCase);
        const winnerEntry = tiedEntries.find((entry) => entry.id === (voteWinner ?? tieCase.manualWinnerId));
        const progressTotal = Math.max(1, tieVoters.length);
        const progressValue = Math.min(100, (tieCase.votes.length / progressTotal) * 100);
        return (
          <Card
            key={tieCase.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer transition hover:-translate-y-0.5"
            onClick={() => setSelectedTieId(tieCase.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedTieId(tieCase.id);
              }
            }}
          >
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{participantNames || tieCase.id}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {tieCase.id} · {trackId ?? "-"} · {language === "ar" ? `${tiedEntries.length} أسماء بينهم تعادل` : `${tiedEntries.length} tied participants`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={tieCase.status === "resolved" ? "success" : "warning"}>{tieCase.status}</Badge>
                  <Badge tone="neutral">{tieCase.votes.length}/{tieVoters.length}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="hidden">
              <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr]">
                <div className="sketch-note p-3 text-sm">
                  <p className="font-bold text-[var(--ink)]">
                    {language === "ar" ? `حالة تعادل تضم ${tiedEntries.length} أعمال` : `${tiedEntries.length} tied entries`}
                  </p>
                  <p className="mt-1 text-[var(--ink-soft)]">
                    {language === "ar" ? "المسار" : "Track"}: {trackId ?? "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tie-voter-${tieCase.id}`}>{language === "ar" ? "المحكم المصوّت" : "Voting evaluator"}</Label>
                  <Select
                    id={`tie-voter-${tieCase.id}`}
                    value={activeVoterId}
                    disabled={!canVote || tieCase.status !== "voting"}
                    onChange={(event) => setVoterIdsByTie((current) => ({ ...current, [tieCase.id]: event.target.value }))}
                  >
                    {tieVoters.map((evaluator) => (
                      <option key={evaluator.id} value={evaluator.id}>
                        {evaluator.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {tiedEntries.map((entry) => (
                  <div key={entry.id} className="sketch-note p-4">
                    <p className="font-bold text-navy-900">{entry.title}</p>
                    <p className="text-sm text-slate-500">{entry.participantName} · #{entry.rank ?? "-"}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <InfoLine label={language === "ar" ? "الدرجة النهائية" : "Final score"} value={entry.finalScore.toFixed(2)} />
                      <InfoLine label={language === "ar" ? "أثر التوعية" : "Awareness"} value={entry.awarenessScore.toFixed(2)} />
                    </div>
                    {activeVote?.entryId === entry.id ? (
                      <Badge tone="success" className="mt-3">
                        {language === "ar" ? "اختيار المحكم الحالي" : "Current evaluator choice"}
                      </Badge>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button disabled={!canVote || tieCase.status !== "voting" || !activeVoterId} onClick={() => castTieVote(tieCase.id, activeVoterId, entry.id)}>
                        <ThumbsUp className="h-4 w-4" />
                        {activeVote?.entryId === entry.id ? (language === "ar" ? "صوتك الحالي" : "Your vote") : language === "ar" ? "صوّت لهذا العمل" : "Vote for this entry"}
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
                    {language === "ar" ? "تقدم التصويت" : "Voting progress"} · {tieCase.votes.length}/{tieVoters.length}
                  </p>
                  <Button disabled={!canResolve || tieCase.status !== "voting"} onClick={() => closeTieVoting(tieCase.id)}>
                    {t(language, "closeVoting")}
                  </Button>
                </div>
                <Progress value={progressValue} className="mt-3" />
                {tieCase.status !== "voting" ? (
                  <p className="mt-3 text-sm text-slate-600">
                    {language === "ar" ? "الفائز حسب التصويت:" : "Vote winner:"} {winnerEntry ? `${winnerEntry.id} · ${winnerEntry.title}` : "-"}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    {activeVote
                      ? language === "ar"
                        ? `اختيار ${activeVoter?.fullName ?? ""} الحالي: ${tiedEntries.find((entry) => entry.id === activeVote.entryId)?.title ?? activeVote.entryId}`
                        : `${activeVoter?.fullName ?? "Current voter"} selected: ${tiedEntries.find((entry) => entry.id === activeVote.entryId)?.title ?? activeVote.entryId}`
                      : language === "ar"
                        ? "اختر المحكم ثم اضغط صوّت لهذا العمل لتسجيل الصوت."
                        : "Choose an evaluator, then vote for one entry."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {selectedTieCase ? (
        <Dialog
          open={Boolean(selectedTieCase)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTieId("");
            }
          }}
          title={language === "ar" ? "التصويت على حالة التعادل" : "Vote on tie case"}
          className="w-[min(96vw,980px)]"
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {selectedTiedEntries.map((entry) => (
                <div key={entry.id} className={`sketch-note p-4 ${selectedActiveVote?.entryId === entry.id ? "outline outline-2 outline-offset-2 outline-black" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-navy-900">{entry.participantName}</p>
                      <p className="mt-1 text-sm text-slate-500">{entry.title} · {entry.id}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{selectedTieCase.votes.filter((vote) => vote.entryId === entry.id).length}</Badge>
                      <Button
                        disabled={!canVote || !selectedActiveVoterId}
                        onClick={() => castTieVote(selectedTieCase.id, selectedActiveVoterId, entry.id)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {selectedActiveVote?.entryId === entry.id ? (language === "ar" ? "صوتك الحالي" : "Your vote") : language === "ar" ? "صوّت لهذا الاسم" : "Vote"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-500">
              {selectedActiveVote
                ? `${language === "ar" ? "تم اختيار:" : "Selected:"} ${
                    selectedTiedEntries.find((entry) => entry.id === selectedActiveVote.entryId)?.participantName ?? selectedActiveVote.entryId
                  }`
                : language === "ar"
                  ? "اضغط زر التصويت بجانب الاسم الذي تريد اختياره."
                  : "Click the vote button next to the name you want."}
            </p>
          </div>
        </Dialog>
      ) : null}
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

function aiQuestionLabel(key: AiScreenQuestion, language: "ar" | "en") {
  const labels: Record<AiScreenQuestion, { ar: string; en: string }> = {
    similarDesigns: { ar: "تصاميم متشابهة", en: "Similar designs" },
    badWords: { ar: "ألفاظ خارجة", en: "Profanity" },
    inappropriateImage: { ar: "صورة غير مناسبة", en: "Inappropriate image" },
    emptyContent: { ar: "محتوى فارغ أو ناقص", en: "Empty or incomplete content" }
  };
  return labels[key][language];
}

function aiFindingLabel(key: AiScreenQuestion, language: "ar" | "en") {
  const labels: Record<AiScreenQuestion, { ar: string; en: string }> = {
    similarDesigns: { ar: "تشابه محتمل مع عمل آخر", en: "Possible similarity with another entry" },
    badWords: { ar: "تم رصد لفظ يحتاج مراجعة", en: "A phrase needs review" },
    inappropriateImage: { ar: "تم رصد عنصر بصري غير مناسب", en: "A visual element needs review" },
    emptyContent: { ar: "المحتوى يبدو غير مكتمل", en: "Content appears incomplete" }
  };
  return labels[key][language];
}

function mockAiScreen(entry: Entry, enabled: Record<AiScreenQuestion, boolean>): Record<AiScreenQuestion, boolean> {
  const serial = Number(entry.id.slice(-3));
  return {
    similarDesigns: enabled.similarDesigns && serial % 4 === 1,
    badWords: enabled.badWords && serial % 7 === 0,
    inappropriateImage: enabled.inappropriateImage && (entry.trackId === "drawing" || entry.trackId === "photography") && serial % 5 === 0,
    emptyContent: enabled.emptyContent && (serial % 11 === 0 || entry.title.trim().length < 8)
  };
}

function mockAiResultCount(entry: Entry) {
  const serial = Number(entry.id.slice(-3));
  return serial % 2 === 0 ? 7 : 5;
}
