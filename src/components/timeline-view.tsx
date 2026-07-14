import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { localized } from "@/i18n/translations";
import type { Language, TimelineItem } from "@/types/demo";

export function TimelineStrip({ items, language }: { items: TimelineItem[]; language: Language }) {
  return (
    <div className="sketch-card overflow-x-auto p-5">
      <div className="flex min-w-[760px] items-start justify-between gap-4">
        {items.map((item, index) => (
          <div key={item.id} className="relative flex-1">
            {index < items.length - 1 ? <div className="absolute top-5 h-0.5 w-full border-t-2 border-dashed border-[var(--muted-line)] ltr:left-1/2 rtl:right-1/2" /> : null}
            <div className="relative z-10 grid h-10 w-10 place-items-center rounded-[999px_820px_920px_840px] border-2 border-[var(--line)] bg-[var(--paper-warm)] text-sm font-bold text-[var(--ink)]">{index + 1}</div>
            <p className="mt-3 text-sm font-bold text-[var(--ink)]">{localized(language, item.title)}</p>
            <p className="mt-1 text-xs text-[var(--graphite)]">{item.startDate} - {item.dueDate}</p>
            <div className="mt-2">
              <StatusBadge group="timeline" value={item.status} language={language} />
            </div>
            <Progress value={item.progress} className="mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
