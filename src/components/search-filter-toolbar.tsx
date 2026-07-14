"use client";

import { Search } from "lucide-react";

import { Input, Select } from "@/components/ui/forms";
import { t } from "@/i18n/translations";
import type { Language } from "@/types/demo";

export function SearchFilterToolbar({
  language,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  filterOptions
}: {
  language: Language;
  search: string;
  onSearchChange: (value: string) => void;
  filter?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <label className="relative flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t(language, "search")}
          className="ps-10"
        />
      </label>
      {filterOptions && onFilterChange ? (
        <Select value={filter} onChange={(event) => onFilterChange(event.target.value)} className="md:w-56">
          <option value="all">{t(language, "all")}</option>
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : null}
    </div>
  );
}
