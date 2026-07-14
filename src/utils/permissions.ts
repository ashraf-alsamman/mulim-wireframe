import type { RoleId } from "@/types/demo";

type Permission =
  | "manageAll"
  | "manageTracks"
  | "manageEvaluators"
  | "manageCommittees"
  | "manageCriteria"
  | "filterEntries"
  | "submitInitialEvaluation"
  | "submitFinalEvaluation"
  | "approveResults"
  | "manageWinners"
  | "editSettings"
  | "viewReports";

const rolePermissions: Record<RoleId, Permission[]> = {
  admin: [
    "manageAll",
    "manageTracks",
    "manageEvaluators",
    "manageCommittees",
    "manageCriteria",
    "filterEntries",
    "submitInitialEvaluation",
    "submitFinalEvaluation",
    "approveResults",
    "manageWinners",
    "editSettings",
    "viewReports"
  ],
  committeesSupervisor: ["manageCommittees", "filterEntries", "submitFinalEvaluation", "viewReports"],
  trackSupervisor: ["manageTracks", "filterEntries", "viewReports"],
  specialistEvaluator: ["submitInitialEvaluation"],
  previousWinnerEvaluator: ["submitFinalEvaluation"],
  securitiesEvaluator: ["submitFinalEvaluation"],
  approvalMember: ["approveResults", "viewReports"],
  viewer: ["viewReports"]
};

export function can(role: RoleId, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  return permissions.includes("manageAll") || permissions.includes(permission);
}

export function isReadOnly(role: RoleId): boolean {
  return role === "viewer";
}
