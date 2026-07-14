import { Progress } from "@/components/ui/progress";
import { localized } from "@/i18n/translations";
import type { Committee, Criterion, Evaluation, Evaluator, Language } from "@/types/demo";
import { weightedScoreBreakdown } from "@/utils/calculations";

export function WeightedScoreBreakdown({
  entryId,
  committee,
  evaluators,
  evaluations,
  criteria,
  language
}: {
  entryId: string;
  committee: Committee;
  evaluators: Evaluator[];
  evaluations: Evaluation[];
  criteria: Criterion[];
  language: Language;
}) {
  const rows = weightedScoreBreakdown(entryId, evaluations, committee, criteria);
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const evaluator = evaluators.find((item) => item.id === row.evaluatorId);
        return (
          <div key={row.evaluatorId} className="sketch-note p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-[var(--ink)]">{evaluator?.fullName ?? row.evaluatorId}</p>
                <p className="text-xs text-slate-500">
                  {language === "ar" ? "الدرجة الخام" : "Raw score"} {row.rawScore}/{row.maximumPossibleScore} ·{" "}
                  {language === "ar" ? "الوزن" : "Weight"} {row.weight}%
                </p>
              </div>
              <p className="text-lg font-bold text-[var(--ink)]">{(row.weightedContribution * row.maximumPossibleScore).toFixed(2)}</p>
            </div>
            <Progress value={row.percentage * 100} className="mt-3" />
          </div>
        );
      })}
      <p className="sketch-note p-3 text-sm text-[var(--ink-soft)]">
        {language === "ar"
          ? "الصيغة: الدرجة الموزونة = (درجة المحكم / مجموع المعايير) × وزن المحكم، ثم تجمع المساهمات وتضرب في مجموع المعايير."
          : "Formula: weighted contribution = (evaluator score / criteria maximum) × evaluator weight, then contributions are summed and multiplied by the criteria maximum."}
        {" "}
        {language === "ar" ? "المعايير النشطة:" : "Active criteria:"}{" "}
        {criteria.filter((criterion) => criterion.active).map((criterion) => localized(language, criterion.name)).join("، ")}
      </p>
    </div>
  );
}
