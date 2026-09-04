import { WbsItem, GlobalFilterState, PriorityLevel } from "../types";
import { getParentId } from "./wbsRollup";

/**
 * Returns the effective priority of a WbsItem, falling back to heuristics if not set.
 */
export const getItemPriority = (item: WbsItem): PriorityLevel => {
  if (item.priority) return item.priority;
  if (item.isCriticalPath) return "Critical";
  if (item.type === "Milestone") return "High";
  return "Medium";
};

/**
 * Evaluates whether an individual WbsItem directly matches the active global filters.
 */
export const doesItemMatchFilters = (
  item: WbsItem,
  filters: GlobalFilterState
): boolean => {
  if (filters.status && filters.status !== "ALL" && item.status !== filters.status) {
    return false;
  }

  if (filters.assigneeId && filters.assigneeId !== "ALL") {
    if (filters.assigneeId === "UNASSIGNED") {
      if (item.assignedStakeholderId) return false;
    } else if (item.assignedStakeholderId !== filters.assigneeId) {
      return false;
    }
  }

  if (filters.priority && filters.priority !== "ALL") {
    if (getItemPriority(item) !== filters.priority) {
      return false;
    }
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim().toLowerCase();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchCode = item.wbsCode.toLowerCase().includes(q);
    const matchDesc = item.description?.toLowerCase().includes(q);
    if (!matchTitle && !matchCode && !matchDesc) {
      return false;
    }
  }

  return true;
};

/**
 * Checks if any global filters are actively set (i.e. not "ALL" and non-empty search).
 */
export const isFilterActive = (filters: GlobalFilterState): boolean => {
  return (
    (filters.status !== undefined && filters.status !== "ALL") ||
    (filters.assigneeId !== undefined && filters.assigneeId !== "ALL") ||
    (filters.priority !== undefined && filters.priority !== "ALL") ||
    Boolean(filters.searchQuery && filters.searchQuery.trim().length > 0)
  );
};
