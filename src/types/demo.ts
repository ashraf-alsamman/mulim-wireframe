export type Language = "ar" | "en";

export type LocalizedText = {
  ar: string;
  en: string;
};

export type RoleId =
  | "admin"
  | "committeesSupervisor"
  | "trackSupervisor"
  | "specialistEvaluator"
  | "previousWinnerEvaluator"
  | "securitiesEvaluator"
  | "approvalMember"
  | "viewer";

export type TrackId = "video" | "drawing" | "photography" | "writing";
export type CompetitionSubcategory = "schools" | "universities";
export type CompetitionId = `${TrackId}-${CompetitionSubcategory}`;

export type EvaluatorRole =
  | "specialist"
  | "previousWinner"
  | "securitiesAuthority"
  | "secondSecuritiesAuthority";

export type EntityStatus = "active" | "inactive" | "archived";
export type InvitationStatus = "pending" | "sent" | "accepted" | "expired";
export type CommitteeApprovalStatus = "draft" | "valid" | "issues" | "approved" | "archived";
export type ChecklistStatus = "passed" | "failed" | "review";
export type FilteringDecision = "pending" | "qualified" | "disqualified" | "returned";
export type EntryStage =
  | "submitted"
  | "filtering"
  | "initialEvaluation"
  | "finalEvaluation"
  | "tieBreaking"
  | "approval"
  | "winner"
  | "closed";
export type EvaluationStatus = "notStarted" | "draft" | "submitted" | "complete" | "blocked";
export type EvaluationStage = "initial" | "final";
export type FinalistStatus =
  | "qualified"
  | "notQualified"
  | "finalist"
  | "awaitingTieBreak"
  | "awaitingApproval"
  | "approvedWinner"
  | "notSelected";
export type TieStatus = "open" | "voting" | "closed" | "resolved";
export type ApprovalStatus =
  | "draft"
  | "submitted"
  | "underReview"
  | "returned"
  | "approved"
  | "locked";
export type TimelineStatus = "notStarted" | "inProgress" | "delayed" | "completed";
export type CriterionId = "workQuality" | "creativity" | "awarenessImpact";

export type CriterionScores = Record<CriterionId, number>;

export type Track = {
  id: TrackId;
  name: LocalizedText;
  description: LocalizedText;
  supervisorId: string;
  committeeId: string;
  currentStage: EntryStage;
  status: EntityStatus;
};

export type Evaluator = {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  country: string;
  organization: string;
  evaluatorRole: EvaluatorRole;
  assignedTrackIds: TrackId[];
  weight: number;
  status: EntityStatus;
  invitationStatus: InvitationStatus;
  dateAdded: string;
  notes: string;
};

export type CommitteeMember = {
  evaluatorId: string;
  role: EvaluatorRole;
  weight: number;
};

export type Committee = {
  id: string;
  name: LocalizedText;
  trackId: TrackId;
  supervisorId: string;
  members: CommitteeMember[];
  status: EntityStatus;
  approvalStatus: CommitteeApprovalStatus;
};

export type Criterion = {
  id: CriterionId;
  name: LocalizedText;
  description: LocalizedText;
  maxScore: number;
  order: number;
  active: boolean;
};

export type FilteringChecklist = {
  relevance: ChecklistStatus;
  intellectualProperty: ChecklistStatus;
  rulesCompliance: ChecklistStatus;
};

export type Entry = {
  id: string;
  participantName: string;
  participantCountry: string;
  trackId: TrackId;
  category: string;
  subcategory?: CompetitionSubcategory;
  title: string;
  submissionDate: string;
  entryUrl: string;
  thumbnail: string;
  eligibilityStatus: ChecklistStatus;
  intellectualPropertyConfirmed: boolean;
  trackConditionCompliance: ChecklistStatus;
  currentStage: EntryStage;
  assignedEvaluatorIds: string[];
  evaluationStatus: EvaluationStatus;
  totalScore: number;
  finalScore: number;
  awarenessScore: number;
  rank?: number;
  notes: string;
  filteringChecklist: FilteringChecklist;
  filteringDecision: FilteringDecision;
  finalistStatus: FinalistStatus;
  qualificationReason?: string;
  contactStatus: "notContacted" | "contacted" | "responded";
  travelStatus: "notStarted" | "coordinated";
  ceremonyStatus: "pending" | "confirmed";
  published: boolean;
};

export type Evaluation = {
  id: string;
  entryId: string;
  evaluatorId: string;
  stage: EvaluationStage;
  scores: CriterionScores;
  comments: string;
  status: "draft" | "submitted";
  submittedAt?: string;
};

export type TieVote = {
  evaluatorId: string;
  entryId: string;
  date: string;
};

export type TieCase = {
  id: string;
  entryIds: string[];
  reason: string;
  status: TieStatus;
  votes: TieVote[];
  manualWinnerId?: string;
  decidedAt?: string;
};

export type TimelineItem = {
  id: string;
  title: LocalizedText;
  owner: string;
  startDate: string;
  dueDate: string;
  progress: number;
  status: TimelineStatus;
};

export type NotificationItem = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  date: string;
  read: boolean;
  tone: "info" | "warning" | "success" | "danger";
};

export type ActivityItem = {
  id: string;
  user: string;
  role: RoleId;
  action: string;
  entity: string;
  date: string;
  notes?: string;
};

export type ApprovalHistoryItem = {
  id: string;
  user: string;
  action: ApprovalStatus;
  comments: string;
  date: string;
};

export type DemoSettings = {
  initialQualificationThreshold: number;
  finalistCount: number;
  approvalStatus: ApprovalStatus;
  locked: boolean;
  approvalComments: string;
};

export type DemoStateSnapshot = {
  language: Language;
  role: RoleId;
  tracks: Track[];
  evaluators: Evaluator[];
  committees: Committee[];
  criteria: Criterion[];
  entries: Entry[];
  evaluations: Evaluation[];
  tieCases: TieCase[];
  timeline: TimelineItem[];
  notifications: NotificationItem[];
  activities: ActivityItem[];
  approvalHistory: ApprovalHistoryItem[];
  settings: DemoSettings;
};
