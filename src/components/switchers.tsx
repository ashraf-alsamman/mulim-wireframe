"use client";

import { Languages, UserRound } from "lucide-react";

import { Select } from "@/components/ui/forms";
import { roleLabels, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { Language, RoleId } from "@/types/demo";

const roles: RoleId[] = [
  "admin",
  "committeesSupervisor",
  "trackSupervisor",
  "specialistEvaluator",
  "previousWinnerEvaluator",
  "securitiesEvaluator",
  "approvalMember",
  "viewer"
];

export function LanguageSwitcher() {
  const language = useDemoStore((state) => state.language);
  const setLanguage = useDemoStore((state) => state.setLanguage);
  return (
    <label className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-[var(--graphite)]" />
      <Select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="w-28">
        <option value="ar">العربية</option>
        <option value="en">English</option>
      </Select>
    </label>
  );
}

export function RoleSwitcher() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const setRole = useDemoStore((state) => state.setRole);
  return (
    <label className="flex items-center gap-2">
      <UserRound className="h-4 w-4 text-[var(--graphite)]" />
      <span className="sr-only">{t(language, "role")}</span>
      <Select value={role} onChange={(event) => setRole(event.target.value as RoleId)} className="w-56">
        {roles.map((item) => (
          <option key={item} value={item}>
            {roleLabels[item][language]}
          </option>
        ))}
      </Select>
    </label>
  );
}
