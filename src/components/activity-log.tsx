import { roleLabels } from "@/i18n/translations";
import type { ActivityItem, Language } from "@/types/demo";

export function ActivityLog({ items, language }: { items: ActivityItem[]; language: Language }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-navy-900">{item.action}</p>
              <p className="text-sm text-slate-500">{item.user} · {roleLabels[item.role][language]}</p>
            </div>
            <time className="whitespace-nowrap text-xs text-slate-400">{new Date(item.date).toLocaleDateString(language === "ar" ? "ar" : "en")}</time>
          </div>
          <p className="mt-2 text-sm text-slate-500">{item.entity}</p>
          {item.notes ? <p className="mt-1 text-xs text-slate-400">{item.notes}</p> : null}
        </div>
      ))}
    </div>
  );
}
