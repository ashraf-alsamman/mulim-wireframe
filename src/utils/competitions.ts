import type { CompetitionId, CompetitionSubcategory, Entry, Language, LocalizedText, Track, TrackId } from "@/types/demo";

export const competitionCategoryOrder: TrackId[] = ["drawing", "photography", "video", "writing"];

export const competitionSubcategories: Array<{
  id: CompetitionSubcategory;
  label: LocalizedText;
}> = [
  { id: "schools", label: { ar: "المدارس", en: "Schools" } },
  { id: "universities", label: { ar: "الجامعات", en: "Universities" } }
];

export type CompetitionSummary = {
  id: CompetitionId;
  trackId: TrackId;
  subcategory: CompetitionSubcategory;
  name: LocalizedText;
  trackName: LocalizedText;
  subcategoryName: LocalizedText;
  description: LocalizedText;
  supervisorId: string;
  committeeId: string;
  status: Track["status"];
  currentStage: Track["currentStage"];
  entryCount: number;
  evaluatedEntries: number;
  qualifiedEntries: number;
  progress: number;
  entries: Entry[];
};

export function competitionId(trackId: TrackId, subcategory: CompetitionSubcategory): CompetitionId {
  return `${trackId}-${subcategory}`;
}

export function competitionName(track: Track, subcategory: CompetitionSubcategory): LocalizedText {
  const label = competitionSubcategories.find((item) => item.id === subcategory)?.label ?? competitionSubcategories[0].label;
  return {
    ar: `${track.name.ar} - ${label.ar}`,
    en: `${label.en} ${track.name.en}`
  };
}

export function getEntrySubcategory(entry: Entry): CompetitionSubcategory {
  if (entry.subcategory) {
    return entry.subcategory;
  }

  const category = entry.category.toLowerCase();
  if (category.includes("universit") || category.includes("جامع")) {
    return "universities";
  }
  if (category.includes("school") || category.includes("مدرس")) {
    return "schools";
  }

  const serial = Number(entry.id.slice(-3));
  return Number.isFinite(serial) && serial > 8 ? "universities" : "schools";
}

export function buildCompetitionSummaries(tracks: Track[], entries: Entry[]): CompetitionSummary[] {
  return competitionCategoryOrder.flatMap((trackId) => {
    const track = tracks.find((item) => item.id === trackId);
    if (!track) {
      return [];
    }

    return competitionSubcategories.map((subcategory) => {
      const competitionEntries = entries.filter(
        (entry) => entry.trackId === track.id && getEntrySubcategory(entry) === subcategory.id
      );
      const evaluatedEntries = competitionEntries.filter((entry) => entry.finalScore > 0 || entry.totalScore > 0).length;
      const qualifiedEntries = competitionEntries.filter((entry) => entry.filteringDecision === "qualified").length;

      return {
        id: competitionId(track.id, subcategory.id),
        trackId: track.id,
        subcategory: subcategory.id,
        name: competitionName(track, subcategory.id),
        trackName: track.name,
        subcategoryName: subcategory.label,
        description: track.description,
        supervisorId: track.supervisorId,
        committeeId: track.committeeId,
        status: track.status,
        currentStage: track.currentStage,
        entryCount: competitionEntries.length,
        evaluatedEntries,
        qualifiedEntries,
        progress: competitionEntries.length ? Math.round((evaluatedEntries / competitionEntries.length) * 100) : 0,
        entries: competitionEntries
      };
    });
  });
}

export function localizedCompetitionSubcategory(language: Language, subcategory: CompetitionSubcategory): string {
  return competitionSubcategories.find((item) => item.id === subcategory)?.label[language] ?? subcategory;
}
