import type {
  ActivityItem,
  ApprovalHistoryItem,
  Committee,
  Criterion,
  CriterionScores,
  DemoSettings,
  DemoStateSnapshot,
  Entry,
  Evaluator,
  Evaluation,
  FilteringChecklist,
  NotificationItem,
  RoleId,
  TieCase,
  TimelineItem,
  Track,
  TrackId
} from "@/types/demo";
import { awarenessImpactScore, calculateInitialScore, calculateWeightedFinalScore, qualifiesInitial } from "@/utils/calculations";

const countries = [
  { ar: "السعودية", en: "Saudi Arabia" },
  { ar: "الإمارات", en: "United Arab Emirates" },
  { ar: "البحرين", en: "Bahrain" },
  { ar: "الكويت", en: "Kuwait" },
  { ar: "عمان", en: "Oman" },
  { ar: "قطر", en: "Qatar" }
];

const participantNames = [
  "نورة القحطاني",
  "سالم المنصوري",
  "مريم الزياني",
  "فهد العجمي",
  "عائشة الحارثية",
  "خالد آل ثاني",
  "هيا السبيعي",
  "راشد الكتبي",
  "دانة المطوع",
  "عبدالله البلوشي",
  "ليان العتيبي",
  "يوسف الشمري",
  "جواهر الهاجري",
  "عمر الفارسي",
  "ريم الكواري",
  "بدر النعيمي"
];

const titleBank: Record<TrackId, string[]> = {
  video: [
    "خطوة واعية نحو الاستثمار",
    "ميزانيتي الصغيرة",
    "قصة سهم",
    "المستثمر الذكي",
    "ثلاث دقائق للادخار",
    "رحلة المال",
    "قرار قبل الشراء",
    "الاستثمار بلغة الشباب"
  ],
  drawing: [
    "ألوان الادخار",
    "سوق آمن",
    "شجرة الاستثمار",
    "خارطة الوعي",
    "دينار اليوم",
    "المحفظة المتوازنة",
    "بوابة المستقبل",
    "القرار الرشيد"
  ],
  photography: [
    "لقطة من سوق الغد",
    "نافذة على الادخار",
    "الضوء والاستثمار",
    "مدن مالية",
    "تفاصيل الوعي",
    "عدسة الميزانية",
    "أثر القرار",
    "ثقة المستثمر"
  ],
  writing: [
    "حين يتعلم المال الكلام",
    "رسالة إلى مستثمر صغير",
    "وعي يحمي المستقبل",
    "حكاية محفظة",
    "من الادخار إلى النمو",
    "دليل العائلة الذكية",
    "أرقام لا تخيفني",
    "استثمار بمعنى المسؤولية"
  ]
};

export const defaultCriteria: Criterion[] = [
  {
    id: "workQuality",
    name: { ar: "جودة العمل", en: "Work Quality" },
    description: {
      ar: "تقيس سلامة التنفيذ، وضوح الفكرة بصرياً أو لغوياً، ومستوى الإتقان العام.",
      en: "Measures execution quality, clarity, and overall craft."
    },
    maxScore: 10,
    order: 1,
    active: true
  },
  {
    id: "creativity",
    name: { ar: "الفكرة والإبداع", en: "Idea and Creativity" },
    description: {
      ar: "تقيس جدة الفكرة، معالجة الموضوع، وجاذبية العرض.",
      en: "Measures originality, treatment of the topic, and presentation appeal."
    },
    maxScore: 10,
    order: 2,
    active: true
  },
  {
    id: "awarenessImpact",
    name: { ar: "أثر التوعية المالية والاستثمارية", en: "Financial and Investment Awareness Impact" },
    description: {
      ar: "تقيس مدى إيصال رسالة مالية أو استثمارية واضحة ومؤثرة.",
      en: "Measures the clarity and impact of the financial or investment awareness message."
    },
    maxScore: 10,
    order: 3,
    active: true
  }
];

export const defaultSettings: DemoSettings = {
  initialQualificationThreshold: 18,
  finalistCount: 44,
  approvalStatus: "underReview",
  locked: false,
  approvalComments: "تم إنشاء القائمة النهائية التجريبية وبانتظار اعتماد الأعضاء.",
};

export function createSeedState(): DemoStateSnapshot {
  const evaluators = createEvaluators();
  const tracks = createTracks();
  const committees = createCommittees();
  const entries = createEntries();
  const evaluations = createEvaluations(entries, committees);

  const enrichedEntries = entries.map((entry) => {
    const initialEvaluation = evaluations.find(
      (evaluation) => evaluation.entryId === entry.id && evaluation.stage === "initial" && evaluation.status === "submitted"
    );
    const committee = committees.find((item) => item.trackId === entry.trackId);
    const initialScore = initialEvaluation ? calculateInitialScore(initialEvaluation.scores, defaultCriteria) : 0;
    const finalScore = committee ? calculateWeightedFinalScore(entry.id, evaluations, committee, defaultCriteria) : 0;
    const awarenessScore = awarenessImpactScore(entry.id, evaluations);
    const isQualified = entry.filteringDecision === "qualified" && qualifiesInitial(initialScore, defaultSettings.initialQualificationThreshold);
    const finalistStatus = finalScore >= 24 ? "finalist" : isQualified ? "qualified" : entry.filteringDecision === "disqualified" ? "notQualified" : entry.finalistStatus;

    return {
      ...entry,
      totalScore: initialScore,
      finalScore,
      awarenessScore,
      finalistStatus,
      currentStage:
        finalistStatus === "finalist"
          ? "approval"
          : isQualified && finalScore > 0
            ? "finalEvaluation"
            : entry.filteringDecision === "qualified"
              ? "initialEvaluation"
              : entry.currentStage
    } satisfies Entry;
  });

  enrichedEntries.sort((a, b) => b.finalScore - a.finalScore).forEach((entry, index) => {
    entry.rank = entry.finalScore > 0 ? index + 1 : undefined;
  });

  const tied = enrichedEntries.filter((entry) => ["ENT-VID-001", "ENT-VID-002"].includes(entry.id));
  for (const entry of tied) {
    entry.finalScore = 27.6;
    entry.awarenessScore = 9.2;
    entry.finalistStatus = "awaitingTieBreak";
    entry.currentStage = "tieBreaking";
  }

  const tieCases: TieCase[] = [
    {
      id: "TIE-001",
      entryIds: ["ENT-VID-001", "ENT-VID-002"],
      reason: "Equal final score and equal awareness-impact score",
      status: "voting",
      votes: [
        { evaluatorId: "EVAL-VID-SPEC", entryId: "ENT-VID-001", date: "2026-03-15T10:00:00.000Z" },
        { evaluatorId: "EVAL-VID-PREV", entryId: "ENT-VID-002", date: "2026-03-15T10:03:00.000Z" }
      ]
    }
  ];

  return {
    language: "ar",
    role: "admin",
    tracks,
    evaluators,
    committees,
    criteria: defaultCriteria,
    entries: enrichedEntries,
    evaluations,
    tieCases,
    timeline: createTimeline(),
    notifications: createNotifications(),
    activities: createActivities(),
    approvalHistory: createApprovalHistory(),
    settings: defaultSettings
  };
}

function createTracks(): Track[] {
  return [
    {
      id: "video",
      name: { ar: "الفيديو", en: "Video" },
      description: { ar: "أعمال مرئية قصيرة تشرح مفاهيم الادخار والاستثمار.", en: "Short visual works explaining saving and investment concepts." },
      supervisorId: "EVAL-VID-SUP",
      committeeId: "COM-VIDEO",
      currentStage: "finalEvaluation",
      status: "active"
    },
    {
      id: "drawing",
      name: { ar: "الرسم", en: "Drawing" },
      description: { ar: "لوحات ورسومات توعوية حول السلوك المالي السليم.", en: "Artwork focused on sound financial behavior." },
      supervisorId: "EVAL-DRW-SUP",
      committeeId: "COM-DRAWING",
      currentStage: "initialEvaluation",
      status: "active"
    },
    {
      id: "photography",
      name: { ar: "التصوير", en: "Photography" },
      description: { ar: "صور فوتوغرافية تعبر عن الوعي الاستثماري.", en: "Photography expressing investment awareness." },
      supervisorId: "EVAL-PHO-SUP",
      committeeId: "COM-PHOTOGRAPHY",
      currentStage: "finalEvaluation",
      status: "active"
    },
    {
      id: "writing",
      name: { ar: "الكتابة", en: "Writing" },
      description: { ar: "مقالات وقصص قصيرة بلغة مبسطة ومؤثرة.", en: "Articles and short stories with clear awareness messages." },
      supervisorId: "EVAL-WRI-SUP",
      committeeId: "COM-WRITING",
      currentStage: "approval",
      status: "active"
    }
  ];
}

function createEvaluators(): Evaluator[] {
  const base: Omit<Evaluator, "id" | "fullName" | "initials" | "email" | "phone" | "country" | "organization" | "assignedTrackIds" | "evaluatorRole" | "weight" | "notes"> = {
    status: "active",
    invitationStatus: "accepted",
    dateAdded: "2026-02-20"
  };

  const people: Array<Pick<Evaluator, "id" | "fullName" | "initials" | "country" | "organization" | "assignedTrackIds" | "evaluatorRole" | "weight" | "notes">> = [
    evaluator("EVAL-VID-SUP", "عبدالرحمن السعد", "عس", "Saudi Arabia", "هيئة السوق المالية", ["video"], "specialist", 60, "مشرف مسار الفيديو"),
    evaluator("EVAL-VID-SPEC", "هند المزروعي", "هم", "United Arab Emirates", "جامعة الإمارات", ["video"], "specialist", 60),
    evaluator("EVAL-VID-PREV", "محمد الزياني", "مز", "Bahrain", "فائز سابق", ["video"], "previousWinner", 20),
    evaluator("EVAL-VID-SEC1", "لولوة الهاجري", "له", "Qatar", "هيئة قطر للأسواق المالية", ["video"], "securitiesAuthority", 10),
    evaluator("EVAL-VID-SEC2", "سالم الرشيدي", "سر", "Kuwait", "هيئة أسواق المال", ["video"], "secondSecuritiesAuthority", 10),
    evaluator("EVAL-DRW-SUP", "مها البلوشية", "مب", "Oman", "البرنامج الخليجي", ["drawing"], "specialist", 60, "مشرف مسار الرسم"),
    evaluator("EVAL-DRW-SPEC", "سارة القحطاني", "سق", "Saudi Arabia", "وزارة التعليم", ["drawing"], "specialist", 60),
    evaluator("EVAL-DRW-PREV", "حمد النعيمي", "حن", "United Arab Emirates", "فائز سابق", ["drawing"], "previousWinner", 20),
    evaluator("EVAL-DRW-SEC1", "نوال المطوع", "نم", "Bahrain", "مصرف البحرين المركزي", ["drawing"], "securitiesAuthority", 10),
    evaluator("EVAL-DRW-SEC2", "فيصل الكندري", "فك", "Kuwait", "هيئة أسواق المال", ["drawing"], "secondSecuritiesAuthority", 10),
    evaluator("EVAL-PHO-SUP", "علي آل محمود", "عم", "Qatar", "مركز قطر للمال", ["photography"], "specialist", 60, "مشرف مسار التصوير"),
    evaluator("EVAL-PHO-SPEC", "ريم الحوسنية", "رح", "Oman", "جمعية التصوير", ["photography"], "specialist", 60),
    evaluator("EVAL-PHO-PREV", "ناصر الشمري", "نش", "Saudi Arabia", "فائز سابق", ["photography"], "previousWinner", 20),
    evaluator("EVAL-PHO-SEC1", "فاطمة الكتبي", "فك", "United Arab Emirates", "هيئة الأوراق المالية والسلع", ["photography"], "securitiesAuthority", 10),
    evaluator("EVAL-PHO-SEC2", "يوسف الحداد", "يح", "Bahrain", "مصرف البحرين المركزي", ["photography"], "secondSecuritiesAuthority", 10),
    evaluator("EVAL-WRI-SUP", "خلود العجمي", "خع", "Kuwait", "مجلس التوعية المالية", ["writing"], "specialist", 60, "مشرف مسار الكتابة"),
    evaluator("EVAL-WRI-SPEC", "عبدالله الكواري", "عك", "Qatar", "جامعة قطر", ["writing"], "specialist", 60),
    evaluator("EVAL-WRI-PREV", "بيان الحارثية", "بح", "Oman", "فائزة سابقة", ["writing"], "previousWinner", 20),
    evaluator("EVAL-WRI-SEC1", "مشاعل السبيعي", "مس", "Saudi Arabia", "هيئة السوق المالية", ["writing"], "securitiesAuthority", 10),
    evaluator("EVAL-WRI-SEC2", "راشد المنصوري", "رم", "United Arab Emirates", "هيئة الأوراق المالية والسلع", ["writing"], "secondSecuritiesAuthority", 10),
    evaluator("EVAL-GEN-001", "دانة آل خليفة", "دخ", "Bahrain", "الأمانة العامة", ["video", "drawing", "photography", "writing"], "specialist", 60, "مشرفة لجان الجائزة")
  ];

  return people.map((person, index) => ({
    ...base,
    ...person,
    email: `${person.id.toLowerCase()}@demo.gcc`,
    phone: `+973 17${String(300000 + index * 137).slice(0, 6)}`
  }));
}

function evaluator(
  id: string,
  fullName: string,
  initials: string,
  country: string,
  organization: string,
  assignedTrackIds: TrackId[],
  evaluatorRole: Evaluator["evaluatorRole"],
  weight: number,
  notes = ""
): Pick<Evaluator, "id" | "fullName" | "initials" | "country" | "organization" | "assignedTrackIds" | "evaluatorRole" | "weight" | "notes"> {
  return { id, fullName, initials, country, organization, assignedTrackIds, evaluatorRole, weight, notes };
}

function createCommittees(): Committee[] {
  return [
    committee("COM-VIDEO", "video", "EVAL-VID-SUP", ["EVAL-VID-SPEC", "EVAL-VID-PREV", "EVAL-VID-SEC1", "EVAL-VID-SEC2"]),
    committee("COM-DRAWING", "drawing", "EVAL-DRW-SUP", ["EVAL-DRW-SPEC", "EVAL-DRW-PREV", "EVAL-DRW-SEC1", "EVAL-DRW-SEC2"]),
    committee("COM-PHOTOGRAPHY", "photography", "EVAL-PHO-SUP", ["EVAL-PHO-SPEC", "EVAL-PHO-PREV", "EVAL-PHO-SEC1", "EVAL-PHO-SEC2"]),
    committee("COM-WRITING", "writing", "EVAL-WRI-SUP", ["EVAL-WRI-SPEC", "EVAL-WRI-PREV", "EVAL-WRI-SEC1", "EVAL-WRI-SEC2"])
  ];
}

function committee(id: string, trackId: TrackId, supervisorId: string, evaluatorIds: string[]): Committee {
  const roles = ["specialist", "previousWinner", "securitiesAuthority", "secondSecuritiesAuthority"] as const;
  const weights = [60, 20, 10, 10];
  const title = {
    video: { ar: "لجنة تقييم الفيديو", en: "Video Evaluation Committee" },
    drawing: { ar: "لجنة تقييم الرسم", en: "Drawing Evaluation Committee" },
    photography: { ar: "لجنة تقييم التصوير", en: "Photography Evaluation Committee" },
    writing: { ar: "لجنة تقييم الكتابة", en: "Writing Evaluation Committee" }
  }[trackId];

  return {
    id,
    name: title,
    trackId,
    supervisorId,
    members: evaluatorIds.map((evaluatorId, index) => ({
      evaluatorId,
      role: roles[index],
      weight: weights[index]
    })),
    status: "active",
    approvalStatus: "valid"
  };
}

function createEntries(): Entry[] {
  const tracks: TrackId[] = ["video", "drawing", "photography", "writing"];
  return tracks.flatMap((trackId) =>
    Array.from({ length: 16 }, (_, index) => {
      const serial = index + 1;
      const subcategory = index < 8 ? "schools" : "universities";
      const country = countries[(index + tracks.indexOf(trackId)) % countries.length];
      const checklist = checklistFor(index);
      const failed = Object.values(checklist).includes("failed");
      const review = Object.values(checklist).includes("review");
      const filteringDecision = failed ? "disqualified" : review ? "returned" : "qualified";
      const id = `ENT-${trackId.slice(0, 3).toUpperCase()}-${String(serial).padStart(3, "0")}`;
      const trackEvaluatorPrefix = trackId === "video" ? "VID" : trackId === "drawing" ? "DRW" : trackId === "photography" ? "PHO" : "WRI";

      return {
        id,
        participantName: participantNames[(index + tracks.indexOf(trackId) * 3) % participantNames.length],
        participantCountry: country.en,
        trackId,
        category: subcategory === "schools" ? "Schools" : "Universities",
        subcategory,
        title: titleBank[trackId][index % titleBank[trackId].length],
        submissionDate: `2026-03-${String(1 + (index % 8)).padStart(2, "0")}`,
        entryUrl: `https://demo.local/entries/${id}`,
        thumbnail: ["navy", "burgundy", "green", "blue"][index % 4],
        eligibilityStatus: failed ? "failed" : review ? "review" : "passed",
        intellectualPropertyConfirmed: checklist.intellectualProperty === "passed",
        trackConditionCompliance: checklist.rulesCompliance,
        currentStage: filteringDecision === "qualified" ? "initialEvaluation" : "filtering",
        assignedEvaluatorIds: [
          `EVAL-${trackEvaluatorPrefix}-SPEC`,
          `EVAL-${trackEvaluatorPrefix}-PREV`,
          `EVAL-${trackEvaluatorPrefix}-SEC1`,
          `EVAL-${trackEvaluatorPrefix}-SEC2`
        ],
        evaluationStatus: filteringDecision === "qualified" ? "draft" : "blocked",
        totalScore: 0,
        finalScore: 0,
        awarenessScore: 0,
        notes: failed ? "ملاحظة: لم يستوف العمل أحد شروط المشاركة." : "عمل صالح للعرض التجريبي.",
        filteringChecklist: checklist,
        filteringDecision,
        finalistStatus: failed ? "notQualified" : "qualified",
        qualificationReason: failed ? "لم يستوف شروط الملكية أو المسار." : "مستوف للشروط العامة وشروط المسار.",
        contactStatus: "notContacted",
        travelStatus: "notStarted",
        ceremonyStatus: "pending",
        published: false
      } satisfies Entry;
    })
  );
}

function checklistFor(index: number): FilteringChecklist {
  if (index % 13 === 0) {
    return { relevance: "failed", intellectualProperty: "passed", rulesCompliance: "review" };
  }
  if (index % 9 === 0) {
    return { relevance: "passed", intellectualProperty: "review", rulesCompliance: "passed" };
  }
  if (index % 11 === 0) {
    return { relevance: "passed", intellectualProperty: "failed", rulesCompliance: "passed" };
  }
  return { relevance: "passed", intellectualProperty: "passed", rulesCompliance: "passed" };
}

function createEvaluations(entries: Entry[], committees: Committee[]): Evaluation[] {
  const evaluations: Evaluation[] = [];

  for (const entry of entries) {
    if (entry.filteringDecision !== "qualified") {
      continue;
    }

    const committee = committees.find((item) => item.trackId === entry.trackId);
    if (!committee) {
      continue;
    }

    const numeric = Number(entry.id.slice(-3));
    const specialist = committee.members.find((member) => member.role === "specialist");
    if (specialist) {
      const scores = scoresFor(numeric, 0, entry.id === "ENT-VID-001" || entry.id === "ENT-VID-002");
      evaluations.push(evaluation(entry.id, specialist.evaluatorId, "initial", scores, "submitted"));
    }

    if (numeric % 7 === 0) {
      continue;
    }

    committee.members.forEach((member, memberIndex) => {
      if (numeric % 5 === 0 && memberIndex === 3) {
        return;
      }
      const forceTie = entry.id === "ENT-VID-001" || entry.id === "ENT-VID-002";
      evaluations.push(evaluation(entry.id, member.evaluatorId, "final", scoresFor(numeric, memberIndex, forceTie), "submitted"));
    });
  }

  return evaluations;
}

function scoresFor(seed: number, evaluatorOffset: number, forceTie = false): CriterionScores {
  if (forceTie) {
    return {
      workQuality: 9,
      creativity: 9,
      awarenessImpact: 9.2
    };
  }

  const base = 5 + ((seed + evaluatorOffset) % 5);
  return {
    workQuality: Math.min(10, base + (seed % 3 === 0 ? 1 : 0)),
    creativity: Math.min(10, base + ((seed + evaluatorOffset) % 2)),
    awarenessImpact: Math.min(10, base + (seed % 4 === 0 ? 1.5 : 0.5))
  };
}

function evaluation(
  entryId: string,
  evaluatorId: string,
  stage: "initial" | "final",
  scores: CriterionScores,
  status: "draft" | "submitted"
): Evaluation {
  return {
    id: `EVAL-${entryId}-${evaluatorId}-${stage}`.replaceAll("_", "-"),
    entryId,
    evaluatorId,
    stage,
    scores,
    comments: stage === "initial" ? "تمت مراجعة العمل وفق معايير المرحلة الأولى." : "تم تقييم العمل من عضو اللجنة.",
    status,
    submittedAt: "2026-03-14T09:00:00.000Z"
  };
}

function createTimeline(): TimelineItem[] {
  return [
    {
      id: "TIME-001",
      title: { ar: "استلام أعمال المرحلة الأولى", en: "Receiving the first-stage work" },
      owner: "الأمانة العامة",
      startDate: "2026-03-01",
      dueDate: "2026-03-01",
      progress: 100,
      status: "completed"
    },
    {
      id: "TIME-002",
      title: { ar: "تسليم المرحلة الأولى", en: "Delivering the first stage" },
      owner: "مشرفو المسارات",
      startDate: "2026-03-02",
      dueDate: "2026-03-07",
      progress: 100,
      status: "completed"
    },
    {
      id: "TIME-003",
      title: { ar: "استلام أعمال المرحلة الثانية", en: "Receiving the second-stage work" },
      owner: "لجان التقييم",
      startDate: "2026-03-08",
      dueDate: "2026-03-08",
      progress: 90,
      status: "completed"
    },
    {
      id: "TIME-004",
      title: { ar: "تسليم المرحلة الثانية", en: "Delivering the second stage" },
      owner: "لجان التقييم",
      startDate: "2026-03-09",
      dueDate: "2026-03-14",
      progress: 76,
      status: "inProgress"
    },
    {
      id: "TIME-005",
      title: { ar: "مرحلة اعتماد الفائزين", en: "Winner approval stage" },
      owner: "لجنة اعتماد النتائج",
      startDate: "2026-03-15",
      dueDate: "2026-03-29",
      progress: 35,
      status: "inProgress"
    }
  ];
}

function createNotifications(): NotificationItem[] {
  return [
    notification("NOT-001", "Evaluator invitation pending", "دعوة محكم بانتظار القبول", "warning"),
    notification("NOT-002", "Evaluation deadline approaching", "موعد تسليم المرحلة الثانية يقترب", "info"),
    notification("NOT-003", "Missing evaluation", "هناك تقييم ناقص في لجنة التصوير", "danger"),
    notification("NOT-004", "Tie detected", "تم رصد تعادل في مسار الفيديو", "warning"),
    notification("NOT-005", "Results approved", "تم اعتماد نتائج تجريبية سابقة", "success")
  ];
}

function notification(id: string, en: string, ar: string, tone: NotificationItem["tone"]): NotificationItem {
  return {
    id,
    title: { ar, en },
    body: { ar: "إشعار تجريبي ضمن سير عمل لجان التقييم.", en: "Demo notification from the judging workflow." },
    date: "2026-03-15T12:00:00.000Z",
    read: id === "NOT-005",
    tone
  };
}

function createActivities(): ActivityItem[] {
  const items: Array<[string, RoleId, string, string, string]> = [
    ["دانة آل خليفة", "committeesSupervisor", "Committee activated", "COM-VIDEO", "تم تفعيل لجنة الفيديو بعد اكتمال الأوزان."],
    ["هند المزروعي", "specialistEvaluator", "Score submitted", "ENT-VID-001", "درجة أولية ونهائية مرسلة."],
    ["مها البلوشية", "trackSupervisor", "Entry filtered", "ENT-DRW-004", "تم تأهيل العمل."],
    ["لولوة الهاجري", "securitiesEvaluator", "Tie vote submitted", "TIE-001", "تم تسجيل صوت في كسر التعادل."],
    ["خلود العجمي", "approvalMember", "Results reviewed", "Final ranking", "مراجعة القائمة النهائية قيد التنفيذ."]
  ];

  return items.map(([user, role, action, entity, notes], index) => ({
    id: `ACT-${String(index + 1).padStart(3, "0")}`,
    user,
    role,
    action,
    entity,
    date: `2026-03-15T1${index}:20:00.000Z`,
    notes
  }));
}

function createApprovalHistory(): ApprovalHistoryItem[] {
  return [
    {
      id: "APR-001",
      user: "خلود العجمي",
      action: "submitted",
      comments: "تم رفع النتائج للمراجعة التجريبية.",
      date: "2026-03-15T10:30:00.000Z"
    },
    {
      id: "APR-002",
      user: "دانة آل خليفة",
      action: "underReview",
      comments: "جاري فحص التعادلات وحسابات الأوزان.",
      date: "2026-03-15T11:10:00.000Z"
    }
  ];
}
