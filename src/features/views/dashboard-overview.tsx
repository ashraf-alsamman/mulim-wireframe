"use client";

import { Award, BadgeCheck, ClipboardCheck, FileText, Filter, Trophy, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ActivityLog } from "@/components/activity-log";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";

export function DashboardOverview() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const evaluators = useDemoStore((state) => state.evaluators);
  const committees = useDemoStore((state) => state.committees);
  const evaluations = useDemoStore((state) => state.evaluations);
  const criteria = useDemoStore((state) => state.criteria);
  const timeline = useDemoStore((state) => state.timeline);
  const activities = useDemoStore((state) => state.activities);

  const qualified = entries.filter((entry) => entry.filteringDecision === "qualified").length;
  const disqualified = entries.filter((entry) => entry.filteringDecision === "disqualified").length;
  const finalists = entries.filter((entry) => ["finalist", "awaitingApproval", "approvedWinner", "awaitingTieBreak"].includes(entry.finalistStatus)).length;
  const approvedWinners = entries.filter((entry) => entry.finalistStatus === "approvedWinner").length;
  const completedEvaluations = evaluations.filter((evaluation) => evaluation.status === "submitted").length;
  const expectedEvaluations = committees.reduce((total, committee) => {
    const trackEntries = entries.filter((entry) => entry.trackId === committee.trackId && entry.filteringDecision === "qualified").length;
    return total + trackEntries * committee.members.length;
  }, 0);
  const committeeCompletion = expectedEvaluations > 0 ? Math.round((completedEvaluations / expectedEvaluations) * 100) : 0;

  const entriesByTrack = tracks.map((track) => ({
    name: localized(language, track.name),
    entries: entries.filter((entry) => entry.trackId === track.id).length,
    qualified: entries.filter((entry) => entry.trackId === track.id && entry.filteringDecision === "qualified").length
  }));

  const funnel = [
    { name: language === "ar" ? "مقدمة" : "Submitted", value: entries.length, fill: "#0b1e34" },
    { name: language === "ar" ? "مؤهلة" : "Qualified", value: qualified, fill: "#1f7a53" },
    { name: language === "ar" ? "نهائية" : "Finalists", value: finalists, fill: "#56a6d6" },
    { name: language === "ar" ? "معتمدة" : "Approved", value: approvedWinners, fill: "#9f2446" }
  ];

  const averageByCriterion = criteria.map((criterion) => {
    const submitted = evaluations.filter((evaluation) => evaluation.status === "submitted");
    const total = submitted.reduce((sum, evaluation) => sum + evaluation.scores[criterion.id], 0);
    return {
      name: localized(language, criterion.name),
      average: submitted.length ? Number((total / submitted.length).toFixed(1)) : 0
    };
  });

  const workload = evaluators.slice(0, 8).map((evaluator) => ({
    name: evaluator.fullName.split(" ")[0],
    assigned: entries.filter((entry) => entry.assignedEvaluatorIds.includes(evaluator.id)).length,
    completed: evaluations.filter((evaluation) => evaluation.evaluatorId === evaluator.id && evaluation.status === "submitted").length
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t(language, "totalEntries")} value={entries.length} icon={FileText} tone="navy" />
        <KpiCard label={t(language, "qualifiedEntries")} value={qualified} detail={`${disqualified} ${t(language, "disqualifiedEntries")}`} icon={Filter} tone="green" />
        <KpiCard label={t(language, "completedEvaluations")} value={completedEvaluations} detail={`${committeeCompletion}% ${t(language, "committeeCompletion")}`} icon={ClipboardCheck} tone="blue" />
        <KpiCard label={t(language, "approvedWinners")} value={approvedWinners} detail={`${finalists} ${t(language, "finalists")}`} icon={Trophy} tone="burgundy" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t(language, "averageByTrack")}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entriesByTrack}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" name={t(language, "entries")} fill="#173d69" radius={[4, 4, 0, 0]} />
                <Bar dataKey="qualified" name={t(language, "qualifiedEntries")} fill="#1f7a53" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "قمع حالة الأعمال" : "Entry-status funnel"}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnel} isAnimationActive>
                  {funnel.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t(language, "averageByCriterion")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={averageByCriterion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#9f2446" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(language, "evaluatorWorkload")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workload.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  <span className="text-slate-500">{item.completed}/{item.assigned}</span>
                </div>
                <Progress value={item.assigned ? (item.completed / item.assigned) * 100 : 0} className="mt-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(language, "upcomingDeadlines")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.slice(-3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3">
                <div>
                  <p className="font-semibold text-navy-900">{localized(language, item.title)}</p>
                  <p className="text-xs text-slate-500">{item.owner}</p>
                </div>
                <BadgeCheck className="h-5 w-5 text-gulf-green" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t(language, "committeeCompletion")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-md bg-emerald-50 text-2xl font-bold text-emerald-700">
                {committeeCompletion}%
              </div>
              <div className="flex-1">
                <Progress value={committeeCompletion} />
                <p className="mt-2 text-sm text-slate-500">
                  {completedEvaluations} / {expectedEvaluations} {t(language, "completedEvaluations")}
                </p>
              </div>
              <Users className="h-6 w-6 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(language, "recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityLog items={activities} language={language} />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-burgundy-100 bg-burgundy-50 p-4 text-sm font-semibold text-burgundy-700">
        <Award className="me-2 inline h-4 w-4" />
        {language === "ar"
          ? "البيانات مستندة إلى قواعد PDF ومهيأة كعرض أمامي فقط مع حفظ محلي."
          : "Data follows the PDF-derived rules and is stored locally for this front-end demo."}
      </div>
    </div>
  );
}
