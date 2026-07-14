"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Copy, Eye, Pencil, Plus, Power, PowerOff, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CommitteeMemberCard, EvaluatorCard } from "@/components/entity-cards";
import { SearchFilterToolbar } from "@/components/search-filter-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import { Progress } from "@/components/ui/progress";
import { evaluatorRoleLabels, localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { Evaluator, EvaluatorRole, Track } from "@/types/demo";
import { validateCommitteeWeights } from "@/utils/calculations";
import {
  buildCompetitionSummaries,
  competitionCategoryOrder,
  competitionSubcategories,
  type CompetitionSummary
} from "@/utils/competitions";
import { can } from "@/utils/permissions";

const evaluatorSchema = z.object({
  id: z.string().min(3),
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(6),
  country: z.string().min(2),
  organization: z.string().min(2),
  evaluatorRole: z.enum(["specialist", "previousWinner", "securitiesAuthority", "secondSecuritiesAuthority"]),
  assignedTrackId: z.enum(["video", "drawing", "photography", "writing"]),
  weight: z.number().min(1).max(100),
  notes: z.string().optional()
});

type EvaluatorFormData = z.infer<typeof evaluatorSchema>;

const defaultWeights: Record<EvaluatorRole, number> = {
  specialist: 60,
  previousWinner: 20,
  securitiesAuthority: 10,
  secondSecuritiesAuthority: 10
};

export function TracksView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const tracks = useDemoStore((state) => state.tracks);
  const entries = useDemoStore((state) => state.entries);
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const updateTrackStatus = useDemoStore((state) => state.updateTrackStatus);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Track | null>(null);
  const editable = can(role, "manageTracks");

  const rows = tracks
    .filter((track) => localized(language, track.name).toLowerCase().includes(search.toLowerCase()))
    .map((track) => {
      const trackEntries = entries.filter((entry) => entry.trackId === track.id);
      const evaluated = trackEntries.filter((entry) => entry.finalScore > 0 || entry.totalScore > 0).length;
      const qualified = trackEntries.filter((entry) => entry.filteringDecision === "qualified").length;
      return {
        ...track,
        entryCount: trackEntries.length,
        evaluated,
        qualified,
        progress: trackEntries.length ? Math.round((evaluated / trackEntries.length) * 100) : 0,
        committee: committees.find((committee) => committee.id === track.committeeId),
        supervisor: evaluators.find((evaluator) => evaluator.id === track.supervisorId)
      };
    });

  const columns: Array<Column<(typeof rows)[number]>> = [
    {
      key: "name",
      header: t(language, "track"),
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{localized(language, row.name)}</p>
          <p className="text-xs text-slate-500">{localized(language, row.description)}</p>
        </div>
      )
    },
    {
      key: "supervisor",
      header: language === "ar" ? "المشرف" : "Supervisor",
      cell: (row) => row.supervisor?.fullName ?? row.supervisorId
    },
    {
      key: "entries",
      header: t(language, "entries"),
      cell: (row) => (
        <span>
          {row.evaluated}/{row.entryCount} · {row.qualified} {t(language, "qualifiedEntries")}
        </span>
      )
    },
    {
      key: "progress",
      header: t(language, "progress"),
      cell: (row) => (
        <div className="min-w-36">
          <Progress value={row.progress} />
          <p className="mt-1 text-xs text-slate-500">{row.progress}%</p>
        </div>
      )
    },
    {
      key: "status",
      header: t(language, "status"),
      cell: (row) => <StatusBadge group="entity" value={row.status} language={language} />
    },
    {
      key: "actions",
      header: t(language, "actions"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setSelected(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant={row.status === "active" ? "ghost" : "success"}
            size="icon"
            disabled={!editable}
            onClick={() => updateTrackStatus(row.id, row.status === "active" ? "inactive" : "active")}
          >
            {row.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <SearchFilterToolbar language={language} search={search} onSearchChange={setSearch} />
      <DataTable rows={rows} columns={columns} />
      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)} title={selected ? localized(language, selected.name) : ""}>
        {selected ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "الوصف" : "Description"}</p>
              <p className="mt-2 text-navy-900">{localized(language, selected.description)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "اللجنة" : "Committee"}</p>
              <p className="mt-2 text-navy-900">{committees.find((committee) => committee.id === selected.committeeId)?.name[language]}</p>
            </Card>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function CompetitionsView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const tracks = useDemoStore((state) => state.tracks);
  const entries = useDemoStore((state) => state.entries);
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const updateTrackStatus = useDemoStore((state) => state.updateTrackStatus);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CompetitionSummary | null>(null);
  const editable = can(role, "manageTracks");

  const competitions = buildCompetitionSummaries(tracks, entries).filter((competition) => {
    const text = `${localized(language, competition.name)} ${localized(language, competition.trackName)} ${localized(language, competition.subcategoryName)}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">{t(language, "mainCategory")}</p>
            <h2 className="text-2xl font-bold text-navy-900">{t(language, "competitions")}</h2>
          </div>
          <div className="md:w-80">
            <SearchFilterToolbar language={language} search={search} onSearchChange={setSearch} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {competitionCategoryOrder.map((trackId) => {
          const track = tracks.find((item) => item.id === trackId);
          const categoryCompetitions = competitions.filter((competition) => competition.trackId === trackId);
          if (!track || categoryCompetitions.length === 0) {
            return null;
          }

          const entryCount = categoryCompetitions.reduce((total, competition) => total + competition.entryCount, 0);
          const qualifiedEntries = categoryCompetitions.reduce((total, competition) => total + competition.qualifiedEntries, 0);
          const evaluatedEntries = categoryCompetitions.reduce((total, competition) => total + competition.evaluatedEntries, 0);

          return (
            <Card key={trackId} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{t(language, "mainCategory")}</p>
                    <CardTitle className="mt-1 text-lg">{localized(language, track.name)}</CardTitle>
                  </div>
                  <StatusBadge group="entity" value={track.status} language={language} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-3 text-center">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">{t(language, "entries")}</p>
                    <p className="text-lg font-bold text-navy-900">{entryCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">{t(language, "qualifiedEntries")}</p>
                    <p className="text-lg font-bold text-navy-900">{qualifiedEntries}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">{t(language, "completedEvaluations")}</p>
                    <p className="text-lg font-bold text-navy-900">{evaluatedEntries}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {competitionSubcategories.map((subcategory) => {
                  const competition = categoryCompetitions.find((item) => item.subcategory === subcategory.id);
                  if (!competition) {
                    return null;
                  }
                  const supervisor = evaluators.find((evaluator) => evaluator.id === competition.supervisorId);
                  const committee = committees.find((item) => item.id === competition.committeeId);

                  return (
                    <div key={competition.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-navy-900">{localized(language, competition.subcategoryName)}</p>
                          <p className="mt-1 text-xs text-slate-500">{localized(language, competition.name)}</p>
                        </div>
                        <Badge tone={competition.subcategory === "schools" ? "info" : "burgundy"}>
                          {localized(language, competition.subcategoryName)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="text-[11px] text-slate-500">{t(language, "entries")}</p>
                          <p className="font-bold text-navy-900">{competition.entryCount}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">{t(language, "qualifiedEntries")}</p>
                          <p className="font-bold text-navy-900">{competition.qualifiedEntries}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">{t(language, "progress")}</p>
                          <p className="font-bold text-navy-900">{competition.progress}%</p>
                        </div>
                      </div>
                      <Progress value={competition.progress} className="mt-3" />
                      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">{supervisor?.fullName ?? competition.supervisorId}</p>
                        <p className="mt-1 truncate">{committee ? localized(language, committee.name) : competition.committeeId}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setSelected(competition)}>
                          <Eye className="h-4 w-4" />
                          {t(language, "view")}
                        </Button>
                        <Button
                          variant={competition.status === "active" ? "ghost" : "success"}
                          size="sm"
                          disabled={!editable}
                          onClick={() => updateTrackStatus(competition.trackId, competition.status === "active" ? "inactive" : "active")}
                        >
                          {competition.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          {competition.status === "active" ? t(language, "deactivate") : t(language, "activate")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)} title={selected ? localized(language, selected.name) : ""}>
        {selected ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-500">{t(language, "mainCategory")}</p>
              <p className="mt-2 text-navy-900">{localized(language, selected.trackName)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-500">{t(language, "subcategory")}</p>
              <p className="mt-2 text-navy-900">{localized(language, selected.subcategoryName)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "الوصف" : "Description"}</p>
              <p className="mt-2 text-navy-900">{localized(language, selected.description)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "اللجنة" : "Committee"}</p>
              <p className="mt-2 text-navy-900">{committees.find((committee) => committee.id === selected.committeeId)?.name[language]}</p>
            </Card>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function EvaluatorsView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const evaluators = useDemoStore((state) => state.evaluators);
  const tracks = useDemoStore((state) => state.tracks);
  const upsertEvaluator = useDemoStore((state) => state.upsertEvaluator);
  const updateEvaluator = useDemoStore((state) => state.updateEvaluator);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluator | null>(null);
  const [profile, setProfile] = useState<Evaluator | null>(null);
  const editable = can(role, "manageEvaluators");

  const form = useForm<EvaluatorFormData>({
    resolver: zodResolver(evaluatorSchema),
    defaultValues: emptyEvaluatorDefaults(evaluators.length)
  });

  const rows = evaluators.filter((evaluator) => {
    const text = `${evaluator.fullName} ${evaluator.email} ${evaluator.organization}`.toLowerCase();
    const matchesText = text.includes(search.toLowerCase());
    const matchesFilter = filter === "all" || evaluator.evaluatorRole === filter;
    return matchesText && matchesFilter;
  });

  const columns: Array<Column<Evaluator>> = [
    {
      key: "name",
      header: language === "ar" ? "المحكم" : "Evaluator",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{row.initials}</div>
          <div>
            <p className="font-bold text-navy-900">{row.fullName}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: "role",
      header: t(language, "role"),
      cell: (row) => <Badge tone="burgundy">{evaluatorRoleLabels[row.evaluatorRole][language]}</Badge>
    },
    {
      key: "track",
      header: t(language, "track"),
      cell: (row) => row.assignedTrackIds.map((trackId) => tracks.find((track) => track.id === trackId)?.name[language] ?? trackId).join(", ")
    },
    {
      key: "weight",
      header: language === "ar" ? "الوزن" : "Weight",
      cell: (row) => `${row.weight}%`
    },
    {
      key: "status",
      header: t(language, "status"),
      cell: (row) => <StatusBadge group="entity" value={row.status} language={language} />
    },
    {
      key: "actions",
      header: t(language, "actions"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setProfile(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!editable}
            onClick={() => {
              setEditing(row);
              form.reset({
                id: row.id,
                fullName: row.fullName,
                email: row.email,
                phone: row.phone,
                country: row.country,
                organization: row.organization,
                evaluatorRole: row.evaluatorRole,
                assignedTrackId: row.assignedTrackIds[0] as "video" | "drawing" | "photography" | "writing",
                weight: row.weight,
                notes: row.notes
              });
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={row.status === "active" ? "ghost" : "success"}
            size="icon"
            disabled={!editable}
            onClick={() => updateEvaluator(row.id, { status: row.status === "active" ? "inactive" : "active" })}
          >
            {row.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </Button>
        </div>
      )
    }
  ];

  function openNew() {
    setEditing(null);
    form.reset(emptyEvaluatorDefaults(evaluators.length));
    setFormOpen(true);
  }

  function submit(values: EvaluatorFormData) {
    const initials = values.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
    upsertEvaluator({
      id: values.id,
      fullName: values.fullName,
      initials,
      email: values.email,
      phone: values.phone,
      country: values.country,
      organization: values.organization,
      evaluatorRole: values.evaluatorRole,
      assignedTrackIds: [values.assignedTrackId],
      weight: values.weight,
      status: editing?.status ?? "active",
      invitationStatus: editing?.invitationStatus ?? "pending",
      dateAdded: editing?.dateAdded ?? new Date().toISOString().slice(0, 10),
      notes: values.notes ?? ""
    });
    setEditing(null);
    setFormOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchFilterToolbar
          language={language}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={Object.entries(evaluatorRoleLabels).map(([value, label]) => ({ value, label: label[language] }))}
        />
        <Button disabled={!editable} onClick={openNew}>
          <Plus className="h-4 w-4" />
          {t(language, "add")}
        </Button>
      </div>
      <DataTable rows={rows} columns={columns} />

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            form.reset(emptyEvaluatorDefaults(evaluators.length));
          }
        }}
        title={editing ? t(language, "edit") : t(language, "add")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>{t(language, "cancel")}</Button>
            <Button onClick={form.handleSubmit(submit)}>
              <Save className="h-4 w-4" />
              {t(language, "save")}
            </Button>
          </>
        }
      >
        <EvaluatorForm form={form} tracks={tracks} language={language} />
      </Dialog>

      <Dialog open={Boolean(profile)} onOpenChange={() => setProfile(null)} title={profile?.fullName ?? ""}>
        {profile ? <EvaluatorCard evaluator={profile} language={language} /> : null}
      </Dialog>
    </div>
  );
}

function EvaluatorForm({
  form,
  tracks,
  language
}: {
  form: ReturnType<typeof useForm<EvaluatorFormData>>;
  tracks: Track[];
  language: "ar" | "en";
}) {
  const role = form.watch("evaluatorRole");
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
      <FormField label="ID" error={form.formState.errors.id?.message}>
        <Input {...form.register("id")} />
      </FormField>
      <FormField label={language === "ar" ? "الاسم الكامل" : "Full name"} error={form.formState.errors.fullName?.message}>
        <Input {...form.register("fullName")} />
      </FormField>
      <FormField label={language === "ar" ? "البريد الإلكتروني" : "Email"} error={form.formState.errors.email?.message}>
        <Input {...form.register("email")} />
      </FormField>
      <FormField label={language === "ar" ? "الهاتف" : "Phone"} error={form.formState.errors.phone?.message}>
        <Input {...form.register("phone")} />
      </FormField>
      <FormField label={language === "ar" ? "الدولة" : "Country"} error={form.formState.errors.country?.message}>
        <Input {...form.register("country")} />
      </FormField>
      <FormField label={language === "ar" ? "الجهة" : "Organization"} error={form.formState.errors.organization?.message}>
        <Input {...form.register("organization")} />
      </FormField>
      <FormField label={t(language, "role")} error={form.formState.errors.evaluatorRole?.message}>
        <Select
          {...form.register("evaluatorRole", {
            onChange: (event) => {
              const value = event.target.value as EvaluatorRole;
              form.setValue("weight", defaultWeights[value]);
            }
          })}
        >
          {Object.entries(evaluatorRoleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label[language]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t(language, "track")} error={form.formState.errors.assignedTrackId?.message}>
        <Select {...form.register("assignedTrackId")}>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {localized(language, track.name)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={language === "ar" ? "الوزن" : "Weight"} error={form.formState.errors.weight?.message}>
        <Input type="number" {...form.register("weight", { valueAsNumber: true })} />
      </FormField>
      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        {language === "ar" ? "الوزن الافتراضي لهذا الدور:" : "Default weight for this role:"} {defaultWeights[role]}%
      </div>
      <div className="md:col-span-2">
        <FormField label={language === "ar" ? "ملاحظات" : "Notes"} error={form.formState.errors.notes?.message}>
          <Textarea {...form.register("notes")} />
        </FormField>
      </div>
    </form>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function emptyEvaluatorDefaults(count: number): EvaluatorFormData {
  return {
    id: `EVAL-NEW-${String(count + 1).padStart(3, "0")}`,
    fullName: "",
    email: "",
    phone: "",
    country: "Saudi Arabia",
    organization: "",
    evaluatorRole: "specialist",
    assignedTrackId: "video",
    weight: 60,
    notes: ""
  };
}

export function CommitteesView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const committees = useDemoStore((state) => state.committees);
  const evaluators = useDemoStore((state) => state.evaluators);
  const entries = useDemoStore((state) => state.entries);
  const evaluations = useDemoStore((state) => state.evaluations);
  const tracks = useDemoStore((state) => state.tracks);
  const activateCommittee = useDemoStore((state) => state.activateCommittee);
  const archiveCommittee = useDemoStore((state) => state.archiveCommittee);
  const duplicateCommittee = useDemoStore((state) => state.duplicateCommittee);
  const [selected, setSelected] = useState<string | null>(null);
  const editable = can(role, "manageCommittees");

  const rows = committees.map((committee) => {
    const track = tracks.find((item) => item.id === committee.trackId);
    const validation = validateCommitteeWeights(committee, evaluators);
    const assignedEntries = entries.filter((entry) => entry.trackId === committee.trackId && entry.filteringDecision === "qualified");
    const complete = assignedEntries.filter((entry) =>
      committee.members.every((member) =>
        evaluations.some((evaluation) => evaluation.entryId === entry.id && evaluation.evaluatorId === member.evaluatorId && evaluation.stage === "final" && evaluation.status === "submitted")
      )
    ).length;
    return {
      ...committee,
      trackName: track ? localized(language, track.name) : committee.trackId,
      validation,
      assignedEntries: assignedEntries.length,
      completedEntries: complete,
      progress: assignedEntries.length ? Math.round((complete / assignedEntries.length) * 100) : 0
    };
  });

  const columns: Array<Column<(typeof rows)[number]>> = [
    {
      key: "name",
      header: language === "ar" ? "اللجنة" : "Committee",
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{localized(language, row.name)}</p>
          <p className="text-xs text-slate-500">{row.trackName}</p>
        </div>
      )
    },
    {
      key: "members",
      header: language === "ar" ? "الأعضاء" : "Members",
      cell: (row) => `${row.members.length} · ${row.validation.totalWeight}%`
    },
    {
      key: "progress",
      header: t(language, "progress"),
      cell: (row) => (
        <div className="min-w-40">
          <Progress value={row.progress} />
          <p className="mt-1 text-xs text-slate-500">
            {row.completedEntries}/{row.assignedEntries}
          </p>
        </div>
      )
    },
    {
      key: "issues",
      header: language === "ar" ? "الملاحظات" : "Issues",
      cell: (row) =>
        row.validation.issues.length ? (
          <Badge tone="warning">
            <AlertTriangle className="me-1 h-3 w-3" />
            {row.validation.issues.length}
          </Badge>
        ) : (
          <Badge tone="success">{language === "ar" ? "سليم" : "Valid"}</Badge>
        )
    },
    {
      key: "status",
      header: t(language, "status"),
      cell: (row) => <StatusBadge group="committee" value={row.approvalStatus} language={language} />
    },
    {
      key: "actions",
      header: t(language, "actions"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setSelected(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="success" size="icon" disabled={!editable} onClick={() => activateCommittee(row.id)}>
            <Power className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={!editable} onClick={() => duplicateCommittee(row.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={!editable} onClick={() => archiveCommittee(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const selectedCommittee = committees.find((committee) => committee.id === selected);

  return (
    <div className="space-y-5">
      <DataTable rows={rows} columns={columns} />
      <Dialog open={Boolean(selectedCommittee)} onOpenChange={() => setSelected(null)} title={selectedCommittee?.name[language] ?? ""}>
        {selectedCommittee ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {selectedCommittee.members.map((member) => (
                <CommitteeMemberCard
                  key={member.evaluatorId}
                  member={member}
                  evaluator={evaluators.find((evaluator) => evaluator.id === member.evaluatorId)}
                  language={language}
                />
              ))}
            </div>
            <Card className="p-4">
              <p className="font-bold text-navy-900">{language === "ar" ? "ملاحظات التحقق" : "Validation issues"}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {validateCommitteeWeights(selectedCommittee, evaluators).issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
                {validateCommitteeWeights(selectedCommittee, evaluators).issues.length === 0 ? (
                  <li>{language === "ar" ? "لا توجد ملاحظات." : "No issues."}</li>
                ) : null}
              </ul>
            </Card>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function CriteriaView() {
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const criteria = useDemoStore((state) => state.criteria);
  const updateCriterion = useDemoStore((state) => state.updateCriterion);
  const restoreCriteriaDefaults = useDemoStore((state) => state.restoreCriteriaDefaults);
  const editable = can(role, "manageCriteria");
  const total = useMemo(() => criteria.filter((criterion) => criterion.active).reduce((sum, criterion) => sum + criterion.maxScore, 0), [criteria]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "المجموع الأقصى الحالي" : "Current maximum score"}</p>
          <p className="text-3xl font-bold text-navy-900">{total}</p>
        </div>
        <Button disabled={!editable} variant="secondary" onClick={restoreCriteriaDefaults}>
          {t(language, "restoreDefaults")}
        </Button>
      </div>
      <div className="grid gap-4">
        {criteria.map((criterion) => (
          <Card key={criterion.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{localized(language, criterion.name)}</CardTitle>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={criterion.active}
                    disabled={!editable}
                    onChange={(event) => updateCriterion(criterion.id, { active: event.target.checked })}
                  />
                  {language === "ar" ? "نشط" : "Active"}
                </label>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاسم العربي" : "Arabic name"}</Label>
                <Input
                  disabled={!editable}
                  value={criterion.name.ar}
                  onChange={(event) => updateCriterion(criterion.id, { name: { ...criterion.name, ar: event.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاسم الإنجليزي" : "English name"}</Label>
                <Input
                  disabled={!editable}
                  value={criterion.name.en}
                  onChange={(event) => updateCriterion(criterion.id, { name: { ...criterion.name, en: event.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الدرجة القصوى" : "Maximum score"}</Label>
                <Input
                  disabled={!editable}
                  type="number"
                  value={criterion.maxScore}
                  min={1}
                  max={30}
                  onChange={(event) => updateCriterion(criterion.id, { maxScore: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الترتيب" : "Display order"}</Label>
                <Input
                  disabled={!editable}
                  type="number"
                  value={criterion.order}
                  min={1}
                  onChange={(event) => updateCriterion(criterion.id, { order: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
                <Textarea
                  disabled={!editable}
                  value={criterion.description[language]}
                  onChange={(event) =>
                    updateCriterion(criterion.id, {
                      description: { ...criterion.description, [language]: event.target.value }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
