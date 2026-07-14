import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/i18n/translations";
import type { Language } from "@/types/demo";

type StatusGroup = keyof typeof statusLabels;
type StatusValue<T extends StatusGroup> = keyof (typeof statusLabels)[T];

export function StatusBadge<T extends StatusGroup>({
  group,
  value,
  language
}: {
  group: T;
  value: StatusValue<T>;
  language: Language;
}) {
  const labels = statusLabels[group] as Record<string, Record<Language, string>>;
  const text = labels[String(value)]?.[language] ?? String(value);
  const normalized = String(value);
  const tone =
    normalized.includes("active") || normalized.includes("approved") || normalized.includes("complete") || normalized.includes("passed")
      ? "success"
      : normalized.includes("returned") || normalized.includes("review") || normalized.includes("pending") || normalized.includes("delayed")
        ? "warning"
        : normalized.includes("failed") || normalized.includes("inactive") || normalized.includes("blocked")
          ? "danger"
          : normalized.includes("locked")
            ? "burgundy"
            : "neutral";
  return <Badge tone={tone}>{text}</Badge>;
}
