import { describe, expect, it } from "vitest";

import type { Committee, Criterion, Entry, Evaluation, Evaluator, TieCase } from "@/types/demo";
import {
  calculateInitialScore,
  calculateWeightedFinalScore,
  committeeVoteWinner,
  compareAwarenessTie,
  qualifiesInitial,
  rankEntries,
  selectTopFinalists,
  validateCommitteeWeights
} from "./calculations";

const criteria: Criterion[] = [
  {
    id: "workQuality",
    name: { ar: "جودة العمل", en: "Work Quality" },
    description: { ar: "", en: "" },
    maxScore: 10,
    order: 1,
    active: true
  },
  {
    id: "creativity",
    name: { ar: "الإبداع", en: "Creativity" },
    description: { ar: "", en: "" },
    maxScore: 10,
    order: 2,
    active: true
  },
  {
    id: "awarenessImpact",
    name: { ar: "الأثر", en: "Awareness" },
    description: { ar: "", en: "" },
    maxScore: 10,
    order: 3,
    active: true
  }
];

const evaluators: Evaluator[] = [
  evaluator("A", "specialist", 60),
  evaluator("B", "previousWinner", 20),
  evaluator("C", "securitiesAuthority", 10),
  evaluator("D", "secondSecuritiesAuthority", 10)
];

const committee: Committee = {
  id: "COM",
  name: { ar: "لجنة", en: "Committee" },
  trackId: "video",
  supervisorId: "A",
  members: [
    { evaluatorId: "A", role: "specialist", weight: 60 },
    { evaluatorId: "B", role: "previousWinner", weight: 20 },
    { evaluatorId: "C", role: "securitiesAuthority", weight: 10 },
    { evaluatorId: "D", role: "secondSecuritiesAuthority", weight: 10 }
  ],
  status: "active",
  approvalStatus: "valid"
};

describe("calculation utilities", () => {
  it("calculates the initial score", () => {
    expect(calculateInitialScore({ workQuality: 7, creativity: 6, awarenessImpact: 8 }, criteria)).toBe(21);
  });

  it("applies the default 18/30 qualification rule", () => {
    expect(qualifiesInitial(18)).toBe(true);
    expect(qualifiesInitial(17.5)).toBe(false);
  });

  it("validates committee weights and required roles", () => {
    expect(validateCommitteeWeights(committee, evaluators).canActivate).toBe(true);
    expect(validateCommitteeWeights({ ...committee, members: committee.members.slice(0, 3) }, evaluators).canActivate).toBe(false);
  });

  it("calculates weighted final score", () => {
    const evaluations: Evaluation[] = committee.members.map((member) => ({
      id: member.evaluatorId,
      entryId: "E1",
      evaluatorId: member.evaluatorId,
      stage: "final",
      scores: { workQuality: 9, creativity: 9, awarenessImpact: 9 },
      comments: "",
      status: "submitted"
    }));
    expect(calculateWeightedFinalScore("E1", evaluations, committee, criteria)).toBe(27);
  });

  it("ranks by final score then awareness impact", () => {
    const ranked = rankEntries([
      entry("A", 25, 8),
      entry("B", 25, 9),
      entry("C", 20, 10)
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["B", "A", "C"]);
  });

  it("selects the configured top finalists", () => {
    const entries = Array.from({ length: 50 }, (_, index) => entry(`E${index}`, 50 - index, 5));
    expect(selectTopFinalists(entries, 44)).toHaveLength(44);
  });

  it("resolves awareness-impact ties before committee voting", () => {
    expect(compareAwarenessTie(entry("A", 20, 8), entry("B", 20, 9))?.id).toBe("B");
    expect(compareAwarenessTie(entry("A", 20, 9), entry("B", 20, 9))).toBeNull();
  });

  it("resolves committee-vote tie breaks", () => {
    const tieCase: TieCase = {
      id: "TIE",
      entryIds: ["A", "B"],
      reason: "Equal score",
      status: "closed",
      votes: [
        { evaluatorId: "A", entryId: "A", date: "" },
        { evaluatorId: "B", entryId: "A", date: "" },
        { evaluatorId: "C", entryId: "B", date: "" }
      ]
    };
    expect(committeeVoteWinner(tieCase)).toBe("A");
  });
});

function evaluator(id: string, role: Evaluator["evaluatorRole"], weight: number): Evaluator {
  return {
    id,
    fullName: id,
    initials: id,
    email: `${id}@demo.local`,
    phone: "000",
    country: "Saudi Arabia",
    organization: "Demo",
    evaluatorRole: role,
    assignedTrackIds: ["video"],
    weight,
    status: "active",
    invitationStatus: "accepted",
    dateAdded: "2026-01-01",
    notes: ""
  };
}

function entry(id: string, finalScore: number, awarenessScore: number): Entry {
  return {
    id,
    participantName: id,
    participantCountry: "Saudi Arabia",
    trackId: "video",
    category: "Demo",
    title: id,
    submissionDate: "2026-03-01",
    entryUrl: "",
    thumbnail: "navy",
    eligibilityStatus: "passed",
    intellectualPropertyConfirmed: true,
    trackConditionCompliance: "passed",
    currentStage: "finalEvaluation",
    assignedEvaluatorIds: [],
    evaluationStatus: "complete",
    totalScore: finalScore,
    finalScore,
    awarenessScore,
    notes: "",
    filteringChecklist: {
      relevance: "passed",
      intellectualProperty: "passed",
      rulesCompliance: "passed"
    },
    filteringDecision: "qualified",
    finalistStatus: "qualified",
    contactStatus: "notContacted",
    travelStatus: "notStarted",
    ceremonyStatus: "pending",
    published: false
  };
}
