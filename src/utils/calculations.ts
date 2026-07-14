import type {
  Committee,
  Criterion,
  CriterionId,
  Entry,
  Evaluation,
  Evaluator,
  EvaluatorRole,
  TieCase,
  TrackId
} from "@/types/demo";

export type WeightedBreakdownRow = {
  evaluatorId: string;
  rawScore: number;
  maximumPossibleScore: number;
  percentage: number;
  weight: number;
  weightedContribution: number;
};

export type CommitteeValidation = {
  totalWeight: number;
  issues: string[];
  canActivate: boolean;
};

const requiredRoles: EvaluatorRole[] = [
  "specialist",
  "previousWinner",
  "securitiesAuthority",
  "secondSecuritiesAuthority"
];

export function activeCriteria(criteria: Criterion[]): Criterion[] {
  return [...criteria].filter((criterion) => criterion.active).sort((a, b) => a.order - b.order);
}

export function maximumPossibleScore(criteria: Criterion[]): number {
  return activeCriteria(criteria).reduce((total, criterion) => total + criterion.maxScore, 0);
}

export function calculateInitialScore(scores: Record<CriterionId, number>, criteria: Criterion[]): number {
  return activeCriteria(criteria).reduce((total, criterion) => total + (scores[criterion.id] ?? 0), 0);
}

export function qualifiesInitial(score: number, threshold = 18): boolean {
  return score >= threshold;
}

export function validateCommitteeWeights(
  committee: Committee,
  evaluators: Evaluator[],
  trackId: TrackId = committee.trackId
): CommitteeValidation {
  const issues: string[] = [];
  const memberEvaluatorIds = committee.members.map((member) => member.evaluatorId);
  const totalWeight = committee.members.reduce((total, member) => total + member.weight, 0);

  if (totalWeight !== 100) {
    issues.push(`Total evaluator weight is ${totalWeight}%, expected 100%.`);
  }

  for (const role of requiredRoles) {
    if (!committee.members.some((member) => member.role === role)) {
      issues.push(`Missing required role: ${role}.`);
    }
  }

  const duplicatedIds = memberEvaluatorIds.filter((id, index) => memberEvaluatorIds.indexOf(id) !== index);
  for (const id of [...new Set(duplicatedIds)]) {
    issues.push(`Evaluator ${id} is assigned more than once.`);
  }

  for (const member of committee.members) {
    const evaluator = evaluators.find((item) => item.id === member.evaluatorId);
    if (!evaluator) {
      issues.push(`Evaluator ${member.evaluatorId} was not found.`);
      continue;
    }

    if (!evaluator.assignedTrackIds.includes(trackId)) {
      issues.push(`${evaluator.fullName} is not assigned to this track.`);
    }

    if (evaluator.status !== "active") {
      issues.push(`${evaluator.fullName} is inactive.`);
    }
  }

  return {
    totalWeight,
    issues,
    canActivate: issues.length === 0
  };
}

export function scoreEvaluation(evaluation: Evaluation, criteria: Criterion[]): number {
  return calculateInitialScore(evaluation.scores, criteria);
}

export function weightedScoreBreakdown(
  entryId: string,
  evaluations: Evaluation[],
  committee: Committee,
  criteria: Criterion[]
): WeightedBreakdownRow[] {
  const maxScore = maximumPossibleScore(criteria);
  return committee.members.map((member) => {
    const evaluation = evaluations.find(
      (item) => item.entryId === entryId && item.evaluatorId === member.evaluatorId && item.stage === "final" && item.status === "submitted"
    );
    const rawScore = evaluation ? scoreEvaluation(evaluation, criteria) : 0;
    const percentage = maxScore > 0 ? rawScore / maxScore : 0;
    const weightedContribution = percentage * (member.weight / 100);

    return {
      evaluatorId: member.evaluatorId,
      rawScore,
      maximumPossibleScore: maxScore,
      percentage,
      weight: member.weight,
      weightedContribution
    };
  });
}

export function calculateWeightedFinalScore(
  entryId: string,
  evaluations: Evaluation[],
  committee: Committee,
  criteria: Criterion[]
): number {
  const maxScore = maximumPossibleScore(criteria);
  const contribution = weightedScoreBreakdown(entryId, evaluations, committee, criteria).reduce(
    (total, row) => total + row.weightedContribution,
    0
  );
  return roundScore(contribution * maxScore);
}

export function awarenessImpactScore(entryId: string, evaluations: Evaluation[]): number {
  const submitted = evaluations.filter((item) => item.entryId === entryId && item.status === "submitted");
  if (submitted.length === 0) {
    return 0;
  }
  const total = submitted.reduce((sum, evaluation) => sum + evaluation.scores.awarenessImpact, 0);
  return roundScore(total / submitted.length);
}

export type RankedEntry = Entry & {
  rank: number;
  tieReason?: string;
};

export function rankEntries(entries: Entry[], tieCases: TieCase[] = []): RankedEntry[] {
  const manualWinners = new Map<string, Set<string>>();
  for (const tieCase of tieCases) {
    if (tieCase.manualWinnerId) {
      manualWinners.set(tieCase.manualWinnerId, new Set(tieCase.entryIds));
    } else if (tieCase.status === "closed" || tieCase.status === "resolved") {
      const winner = committeeVoteWinner(tieCase);
      if (winner) {
        manualWinners.set(winner, new Set(tieCase.entryIds));
      }
    }
  }

  const sorted = [...entries].sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    if (b.awarenessScore !== a.awarenessScore) {
      return b.awarenessScore - a.awarenessScore;
    }
    const aTie = findManualTiePriority(a.id, manualWinners);
    const bTie = findManualTiePriority(b.id, manualWinners);
    if (aTie !== bTie) {
      return bTie - aTie;
    }
    return a.submissionDate.localeCompare(b.submissionDate);
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    tieReason: entries.some(
      (candidate) =>
        candidate.id !== entry.id &&
        candidate.finalScore === entry.finalScore &&
        candidate.awarenessScore === entry.awarenessScore
    )
      ? "Equal final score and awareness-impact score"
      : undefined
  }));
}

export function selectTopFinalists(entries: Entry[], finalistCount: number, tieCases: TieCase[] = []): RankedEntry[] {
  return rankEntries(
    entries.filter((entry) => entry.finalistStatus !== "notQualified" && entry.finalScore > 0),
    tieCases
  ).slice(0, finalistCount);
}

export function compareAwarenessTie(a: Entry, b: Entry): Entry | null {
  if (a.finalScore !== b.finalScore) {
    return null;
  }
  if (a.awarenessScore === b.awarenessScore) {
    return null;
  }
  return a.awarenessScore > b.awarenessScore ? a : b;
}

export function committeeVoteWinner(tieCase: TieCase): string | null {
  const counts = new Map<string, number>();
  for (const vote of tieCase.votes) {
    counts.set(vote.entryId, (counts.get(vote.entryId) ?? 0) + 1);
  }

  let winner: string | null = null;
  let highScore = -1;
  let tied = false;

  for (const entryId of tieCase.entryIds) {
    const count = counts.get(entryId) ?? 0;
    if (count > highScore) {
      winner = entryId;
      highScore = count;
      tied = false;
    } else if (count === highScore) {
      tied = true;
    }
  }

  return tied ? null : winner;
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function findManualTiePriority(entryId: string, winners: Map<string, Set<string>>): number {
  for (const [winnerId, tiedIds] of winners) {
    if (winnerId === entryId) {
      return 1;
    }
    if (tiedIds.has(entryId)) {
      return 0;
    }
  }
  return 0;
}
