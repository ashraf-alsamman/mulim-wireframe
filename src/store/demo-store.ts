"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createSeedState, defaultCriteria } from "@/data/seed";
import type {
  ActivityItem,
  ChecklistStatus,
  Criterion,
  CriterionId,
  CriterionScores,
  DemoSettings,
  DemoStateSnapshot,
  Entry,
  EvaluationStage,
  Evaluator,
  FilteringChecklist,
  FilteringDecision,
  Language,
  RoleId,
  TimelineItem
} from "@/types/demo";
import {
  awarenessImpactScore,
  calculateInitialScore,
  calculateWeightedFinalScore,
  qualifiesInitial,
  rankEntries,
  selectTopFinalists,
  validateCommitteeWeights
} from "@/utils/calculations";
import { can } from "@/utils/permissions";

export type Toast = {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
};

type EvaluationDraftInput = {
  entryId: string;
  evaluatorId: string;
  stage: EvaluationStage;
  scores: CriterionScores;
  comments: string;
  finalSubmit: boolean;
};

type DemoActions = {
  setLanguage: (language: Language) => void;
  setRole: (role: RoleId) => void;
  resetDemoData: () => void;
  importSnapshot: (snapshot: DemoStateSnapshot) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  updateTrackStatus: (id: string, status: "active" | "inactive") => void;
  upsertEvaluator: (evaluator: Evaluator) => void;
  updateEvaluator: (id: string, patch: Partial<Evaluator>) => void;
  activateCommittee: (id: string) => void;
  archiveCommittee: (id: string) => void;
  duplicateCommittee: (id: string) => void;
  updateCriterion: (id: CriterionId, patch: Partial<Criterion>) => void;
  restoreCriteriaDefaults: () => void;
  updateFilteringDecision: (
    entryId: string,
    checklist: FilteringChecklist,
    decision: FilteringDecision,
    notes: string
  ) => void;
  bulkQualifyEntries: () => void;
  saveEvaluation: (input: EvaluationDraftInput) => void;
  previewFinalists: () => void;
  castTieVote: (tieId: string, evaluatorId: string, entryId: string) => void;
  closeTieVoting: (tieId: string) => void;
  manualResolveTie: (tieId: string, entryId: string) => void;
  submitResults: () => void;
  approveResults: (comments: string) => void;
  returnResults: (comments: string) => void;
  lockResults: () => void;
  reopenDemo: () => void;
  updateWinnerStatus: (
    entryId: string,
    patch: Partial<Pick<Entry, "contactStatus" | "travelStatus" | "ceremonyStatus" | "published">>
  ) => void;
  updateTimelineItem: (id: string, patch: Partial<TimelineItem>) => void;
  updateSettings: (patch: Partial<DemoSettings>) => void;
};

export type DemoStore = DemoStateSnapshot & {
  hydrated: boolean;
  toasts: Toast[];
} & DemoActions;

const seed = createSeedState();

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...seed,
      hydrated: false,
      toasts: [],
      setLanguage: (language) => {
        set({ language });
      },
      setRole: (role) => {
        set({ role });
        addToast(set, `Demo role changed to ${role}.`, "info");
      },
      resetDemoData: () => {
        set({ ...createSeedState(), hydrated: true, toasts: [] });
        addToast(set, "Demo data has been reset.", "success");
      },
      importSnapshot: (snapshot) => {
        set({ ...snapshot, hydrated: true, toasts: [] });
        addToast(set, "Imported demo data backup.", "success");
      },
      dismissToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((item) => (item.id === id ? { ...item, read: true } : item))
        }));
      },
      updateTrackStatus: (id, status) => {
        if (!can(get().role, "manageTracks")) {
          addToast(set, "This role cannot manage tracks.", "error");
          return;
        }
        set((state) => ({
          tracks: state.tracks.map((track) => (track.id === id ? { ...track, status } : track)),
          activities: addActivity(state, "Track status changed", id)
        }));
      },
      upsertEvaluator: (evaluator) => {
        if (!can(get().role, "manageEvaluators")) {
          addToast(set, "This role cannot manage evaluators.", "error");
          return;
        }
        set((state) => {
          const exists = state.evaluators.some((item) => item.id === evaluator.id);
          return {
            evaluators: exists
              ? state.evaluators.map((item) => (item.id === evaluator.id ? evaluator : item))
              : [...state.evaluators, evaluator],
            activities: addActivity(state, exists ? "Evaluator updated" : "Evaluator added", evaluator.id)
          };
        });
        addToast(set, "Evaluator saved.", "success");
      },
      updateEvaluator: (id, patch) => {
        if (!can(get().role, "manageEvaluators")) {
          addToast(set, "This role cannot manage evaluators.", "error");
          return;
        }
        set((state) => ({
          evaluators: state.evaluators.map((evaluator) => (evaluator.id === id ? { ...evaluator, ...patch } : evaluator)),
          activities: addActivity(state, "Evaluator changed", id)
        }));
      },
      activateCommittee: (id) => {
        if (!can(get().role, "manageCommittees")) {
          addToast(set, "This role cannot manage committees.", "error");
          return;
        }
        const state = get();
        const committee = state.committees.find((item) => item.id === id);
        if (!committee) {
          return;
        }
        const validation = validateCommitteeWeights(committee, state.evaluators);
        if (!validation.canActivate) {
          addToast(set, validation.issues[0] ?? "Committee validation failed.", "error");
          set({
            committees: state.committees.map((item) => (item.id === id ? { ...item, approvalStatus: "issues" } : item))
          });
          return;
        }
        set((current) => ({
          committees: current.committees.map((item) =>
            item.id === id ? { ...item, status: "active", approvalStatus: "valid" } : item
          ),
          activities: addActivity(current, "Committee activated", id)
        }));
        addToast(set, "Committee activated.", "success");
      },
      archiveCommittee: (id) => {
        if (!can(get().role, "manageCommittees")) {
          addToast(set, "This role cannot manage committees.", "error");
          return;
        }
        set((state) => ({
          committees: state.committees.map((item) => (item.id === id ? { ...item, status: "archived", approvalStatus: "archived" } : item)),
          activities: addActivity(state, "Committee archived", id)
        }));
      },
      duplicateCommittee: (id) => {
        if (!can(get().role, "manageCommittees")) {
          addToast(set, "This role cannot manage committees.", "error");
          return;
        }
        set((state) => {
          const committee = state.committees.find((item) => item.id === id);
          if (!committee) {
            return state;
          }
          const duplicated = {
            ...committee,
            id: `${committee.id}-COPY-${state.committees.length + 1}`,
            name: {
              ar: `${committee.name.ar} - نسخة`,
              en: `${committee.name.en} - Copy`
            },
            status: "inactive" as const,
            approvalStatus: "draft" as const
          };
          return {
            committees: [...state.committees, duplicated],
            activities: addActivity(state, "Committee duplicated", duplicated.id)
          };
        });
      },
      updateCriterion: (id, patch) => {
        if (!can(get().role, "manageCriteria")) {
          addToast(set, "This role cannot manage criteria.", "error");
          return;
        }
        set((state) => recalculate({ ...state, criteria: state.criteria.map((criterion) => (criterion.id === id ? { ...criterion, ...patch } : criterion)) }));
      },
      restoreCriteriaDefaults: () => {
        if (!can(get().role, "manageCriteria")) {
          addToast(set, "This role cannot manage criteria.", "error");
          return;
        }
        set((state) => recalculate({ ...state, criteria: defaultCriteria }));
        addToast(set, "Criteria restored to PDF defaults.", "success");
      },
      updateFilteringDecision: (entryId, checklist, decision, notes) => {
        if (!can(get().role, "filterEntries")) {
          addToast(set, "This role cannot filter entries.", "error");
          return;
        }
        set((state) =>
          recalculate({
            ...state,
            entries: state.entries.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    filteringChecklist: checklist,
                    filteringDecision: decision,
                    notes,
                    currentStage: decision === "qualified" ? "initialEvaluation" : "filtering",
                    finalistStatus: decision === "disqualified" ? "notQualified" : entry.finalistStatus
                  }
                : entry
            ),
            activities: addActivity(state, `Entry ${decision}`, entryId)
          })
        );
      },
      bulkQualifyEntries: () => {
        if (!can(get().role, "filterEntries")) {
          addToast(set, "This role cannot filter entries.", "error");
          return;
        }
        const passed: ChecklistStatus = "passed";
        set((state) =>
          recalculate({
            ...state,
            entries: state.entries.map((entry) =>
              entry.filteringDecision === "pending" || entry.filteringDecision === "returned"
                ? {
                    ...entry,
                    filteringDecision: "qualified",
                    filteringChecklist: { relevance: passed, intellectualProperty: passed, rulesCompliance: passed },
                    currentStage: "initialEvaluation"
                  }
                : entry
            ),
            activities: addActivity(state, "Bulk filtering applied", "entries")
          })
        );
        addToast(set, "Bulk qualification applied.", "success");
      },
      saveEvaluation: (input) => {
        const permission = input.stage === "initial" ? "submitInitialEvaluation" : "submitFinalEvaluation";
        if (!can(get().role, permission)) {
          addToast(set, "This role cannot submit this evaluation.", "error");
          return;
        }
        if (get().settings.locked) {
          addToast(set, "Results are locked.", "error");
          return;
        }
        set((state) => {
          const existing = state.evaluations.find(
            (item) => item.entryId === input.entryId && item.evaluatorId === input.evaluatorId && item.stage === input.stage
          );
          const evaluation = {
            id: existing?.id ?? `EVAL-${input.entryId}-${input.evaluatorId}-${input.stage}`,
            entryId: input.entryId,
            evaluatorId: input.evaluatorId,
            stage: input.stage,
            scores: input.scores,
            comments: input.comments,
            status: input.finalSubmit ? "submitted" as const : "draft" as const,
            submittedAt: input.finalSubmit ? new Date().toISOString() : existing?.submittedAt
          };
          const evaluations = existing
            ? state.evaluations.map((item) => (item.id === existing.id ? evaluation : item))
            : [...state.evaluations, evaluation];
          return recalculate({
            ...state,
            evaluations,
            activities: input.finalSubmit
              ? addActivity(state, "Score submitted", input.entryId)
              : addActivity(state, "Evaluation draft saved", input.entryId)
          });
        });
        addToast(set, input.finalSubmit ? "Evaluation submitted." : "Draft saved.", "success");
      },
      previewFinalists: () => {
        if (!can(get().role, "manageAll")) {
          addToast(set, "Only administrators can lock the finalist preview.", "error");
          return;
        }
        set((state) => {
          const finalists = selectTopFinalists(state.entries, state.settings.finalistCount, state.tieCases);
          const finalistIds = new Set(finalists.map((entry) => entry.id));
          return {
            entries: state.entries.map((entry) =>
              finalistIds.has(entry.id)
                ? { ...entry, finalistStatus: entry.finalistStatus === "awaitingTieBreak" ? "awaitingTieBreak" : "awaitingApproval" }
                : entry.finalScore > 0
                  ? { ...entry, finalistStatus: "notSelected" }
                  : entry
            ),
            activities: addActivity(state, "Finalist preview generated", "rankings")
          };
        });
      },
      castTieVote: (tieId, evaluatorId, entryId) => {
        if (!can(get().role, "submitFinalEvaluation")) {
          addToast(set, "This role cannot vote in tie-breaking.", "error");
          return;
        }
        set((state) => ({
          tieCases: state.tieCases.map((tieCase) =>
            tieCase.id === tieId
              ? {
                  ...tieCase,
                  votes: [
                    ...tieCase.votes.filter((vote) => vote.evaluatorId !== evaluatorId),
                    { evaluatorId, entryId, date: new Date().toISOString() }
                  ]
                }
              : tieCase
          ),
          activities: addActivity(state, "Tie vote submitted", tieId)
        }));
      },
      closeTieVoting: (tieId) => {
        if (!can(get().role, "manageCommittees")) {
          addToast(set, "This role cannot close voting.", "error");
          return;
        }
        set((state) => ({
          tieCases: state.tieCases.map((tieCase) =>
            tieCase.id === tieId ? { ...tieCase, status: "closed", decidedAt: new Date().toISOString() } : tieCase
          ),
          activities: addActivity(state, "Tie voting closed", tieId)
        }));
      },
      manualResolveTie: (tieId, entryId) => {
        if (!can(get().role, "manageCommittees")) {
          addToast(set, "This role cannot resolve ties.", "error");
          return;
        }
        set((state) =>
          recalculate({
            ...state,
            tieCases: state.tieCases.map((tieCase) =>
              tieCase.id === tieId
                ? { ...tieCase, status: "resolved", manualWinnerId: entryId, decidedAt: new Date().toISOString() }
                : tieCase
            ),
            activities: addActivity(state, "Tie resolved", tieId)
          })
        );
      },
      submitResults: () => {
        set((state) => ({
          settings: { ...state.settings, approvalStatus: "submitted" },
          approvalHistory: [
            ...state.approvalHistory,
            {
              id: `APR-${state.approvalHistory.length + 1}`,
              user: currentUserName(state.role),
              action: "submitted",
              comments: "Submitted from the front-end demo.",
              date: new Date().toISOString()
            }
          ],
          activities: addActivity(state, "Results submitted", "approval")
        }));
      },
      approveResults: (comments) => {
        if (!can(get().role, "approveResults")) {
          addToast(set, "This role cannot approve results.", "error");
          return;
        }
        set((state) => ({
          settings: { ...state.settings, approvalStatus: "approved", approvalComments: comments },
          entries: state.entries.map((entry) =>
            entry.finalistStatus === "awaitingApproval" || entry.finalistStatus === "finalist"
              ? { ...entry, finalistStatus: "approvedWinner" }
              : entry
          ),
          approvalHistory: [
            ...state.approvalHistory,
            {
              id: `APR-${state.approvalHistory.length + 1}`,
              user: currentUserName(state.role),
              action: "approved",
              comments,
              date: new Date().toISOString()
            }
          ],
          activities: addActivity(state, "Results approved", "approval")
        }));
      },
      returnResults: (comments) => {
        if (!can(get().role, "approveResults")) {
          addToast(set, "This role cannot return results.", "error");
          return;
        }
        set((state) => ({
          settings: { ...state.settings, approvalStatus: "returned", approvalComments: comments },
          approvalHistory: [
            ...state.approvalHistory,
            {
              id: `APR-${state.approvalHistory.length + 1}`,
              user: currentUserName(state.role),
              action: "returned",
              comments,
              date: new Date().toISOString()
            }
          ],
          activities: addActivity(state, "Results returned for changes", "approval")
        }));
      },
      lockResults: () => {
        if (!can(get().role, "approveResults")) {
          addToast(set, "This role cannot lock results.", "error");
          return;
        }
        set((state) => ({
          settings: { ...state.settings, approvalStatus: "locked", locked: true },
          activities: addActivity(state, "Results locked", "approval")
        }));
      },
      reopenDemo: () => {
        if (get().role !== "admin") {
          addToast(set, "Only administrators can reopen the demo.", "error");
          return;
        }
        set((state) => ({
          settings: { ...state.settings, approvalStatus: "draft", locked: false },
          activities: addActivity(state, "Demo reopened", "approval")
        }));
      },
      updateWinnerStatus: (entryId, patch) => {
        if (!can(get().role, "manageWinners")) {
          addToast(set, "This role cannot manage winners.", "error");
          return;
        }
        set((state) => ({
          entries: state.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
          activities: addActivity(state, "Winner status updated", entryId)
        }));
      },
      updateTimelineItem: (id, patch) => {
        if (!can(get().role, "editSettings") && !can(get().role, "manageTracks")) {
          addToast(set, "This role cannot edit the timeline.", "error");
          return;
        }
        set((state) => ({
          timeline: state.timeline.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          activities: addActivity(state, "Timeline updated", id)
        }));
      },
      updateSettings: (patch) => {
        if (!can(get().role, "editSettings")) {
          addToast(set, "This role cannot edit settings.", "error");
          return;
        }
        set((state) => recalculate({ ...state, settings: { ...state.settings, ...patch } }));
      }
    }),
    {
      name: "gulf-evaluation-dashboard",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        role: state.role,
        tracks: state.tracks,
        evaluators: state.evaluators,
        committees: state.committees,
        criteria: state.criteria,
        entries: state.entries,
        evaluations: state.evaluations,
        tieCases: state.tieCases,
        timeline: state.timeline,
        notifications: state.notifications,
        activities: state.activities,
        approvalHistory: state.approvalHistory,
        settings: state.settings
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const seedSnapshot = createSeedState();
          const currentTieIds = new Set(state.tieCases.map((tieCase) => tieCase.id));
          const missingTieCases = seedSnapshot.tieCases.filter((tieCase) => !currentTieIds.has(tieCase.id));
          if (missingTieCases.length > 0) {
            const tieEntryIds = new Set(seedSnapshot.tieCases.flatMap((tieCase) => tieCase.entryIds));
            const seedEntriesById = new Map(seedSnapshot.entries.map((entry) => [entry.id, entry]));
            state.tieCases = [...state.tieCases, ...missingTieCases];
            state.entries = state.entries.map((entry) => {
              const seedEntry = seedEntriesById.get(entry.id);
              return seedEntry && tieEntryIds.has(entry.id)
                ? {
                    ...entry,
                    finalScore: seedEntry.finalScore,
                    awarenessScore: seedEntry.awarenessScore,
                    finalistStatus: seedEntry.finalistStatus,
                    currentStage: seedEntry.currentStage,
                    rank: seedEntry.rank
                  }
                : entry;
            });
          }
          state.hydrated = true;
        }
      }
    }
  )
);

function recalculate(state: DemoStore): Partial<DemoStore> {
  const entries = state.entries.map((entry) => {
    const initialEvaluation = state.evaluations.find(
      (evaluation) => evaluation.entryId === entry.id && evaluation.stage === "initial" && evaluation.status === "submitted"
    );
    const committee = state.committees.find((item) => item.trackId === entry.trackId);
    const totalScore = initialEvaluation ? calculateInitialScore(initialEvaluation.scores, state.criteria) : entry.totalScore;
    const finalScore = committee ? calculateWeightedFinalScore(entry.id, state.evaluations, committee, state.criteria) : entry.finalScore;
    const awarenessScore = awarenessImpactScore(entry.id, state.evaluations);
    const initiallyQualified = entry.filteringDecision === "qualified" && qualifiesInitial(totalScore, state.settings.initialQualificationThreshold);
    const finalistStatus = !initiallyQualified
      ? "notQualified"
      : entry.finalistStatus === "awaitingTieBreak" || entry.finalistStatus === "approvedWinner"
        ? entry.finalistStatus
        : finalScore > 0
          ? entry.finalistStatus
          : "qualified";

    return {
      ...entry,
      totalScore,
      finalScore,
      awarenessScore,
      finalistStatus,
      evaluationStatus: finalScore > 0 ? "complete" : initiallyQualified ? "draft" : entry.evaluationStatus
    };
  });

  const ranked = rankEntries(entries, state.tieCases);
  const rankMap = new Map(ranked.map((entry) => [entry.id, entry.rank]));

  return {
    ...state,
    entries: entries.map((entry) => ({ ...entry, rank: rankMap.get(entry.id) }))
  };
}

function addActivity(state: DemoStore, action: string, entity: string): ActivityItem[] {
  return [
    {
      id: `ACT-${Date.now()}`,
      user: currentUserName(state.role),
      role: state.role,
      action,
      entity,
      date: new Date().toISOString()
    },
    ...state.activities
  ].slice(0, 100);
}

function currentUserName(role: RoleId): string {
  const names: Record<RoleId, string> = {
    admin: "مدير النظام التجريبي",
    committeesSupervisor: "دانة آل خليفة",
    trackSupervisor: "مشرف المسار",
    specialistEvaluator: "محكم مختص",
    previousWinnerEvaluator: "محكم فائز سابق",
    securitiesEvaluator: "محكم هيئة الأوراق المالية",
    approvalMember: "عضو اعتماد النتائج",
    viewer: "مشاهد فقط"
  };
  return names[role];
}

function addToast(
  set: (partial: Partial<DemoStore> | ((state: DemoStore) => Partial<DemoStore>)) => void,
  message: string,
  tone: Toast["tone"]
): void {
  set((state) => ({
    toasts: [
      ...state.toasts,
      {
        id: `TOAST-${Date.now()}-${state.toasts.length}`,
        message,
        tone
      }
    ].slice(-4)
  }));
}
