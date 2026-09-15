import { WbsItem, Stakeholder, WorkItemStatus, StatusConfig } from "../types";
import { getProgressForStatus } from "./statusConfig";

/**
 * Default standard hourly rate in USD if no stakeholder is assigned or rate is 0.
 */
export const DEFAULT_HOURLY_RATE = 75;

/**
 * Resolves the effective hourly cost rate ($/hr) for a work item based on its assigned stakeholder(s).
 */
export function getStakeholderHourlyRate(
  item: Partial<WbsItem>,
  stakeholders?: Stakeholder[]
): number {
  if (!stakeholders || stakeholders.length === 0) {
    return DEFAULT_HOURLY_RATE;
  }

  // 1. Primary assignee
  const primaryId = item.assignedStakeholderId || (item.assignedStakeholderIds && item.assignedStakeholderIds[0]);
  if (primaryId) {
    const s = stakeholders.find((st) => st.id === primaryId);
    if (s && s.hourlyRate > 0) {
      return s.hourlyRate;
    }
  }

  // 2. Average of multiple assigned stakeholders if primary not found
  if (item.assignedStakeholderIds && item.assignedStakeholderIds.length > 0) {
    const rates: number[] = [];
    item.assignedStakeholderIds.forEach((id) => {
      const s = stakeholders.find((st) => st.id === id);
      if (s && s.hourlyRate > 0) rates.push(s.hourlyRate);
    });
    if (rates.length > 0) {
      return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }
  }

  return DEFAULT_HOURLY_RATE;
}

/**
 * Calculates Estimated Cost = Hourly Rate * Estimated Hours
 */
export function calculateItemEstimatedCost(
  item: Partial<WbsItem>,
  stakeholders?: Stakeholder[]
): number {
  const rate = getStakeholderHourlyRate(item, stakeholders);
  const hours = Number(item.estimatedHours) || 0;
  return Math.round(rate * hours);
}

/**
 * Calculates Actual Cost = Hourly Rate * Actual Hours
 */
export function calculateItemActualCost(
  item: Partial<WbsItem>,
  stakeholders?: Stakeholder[]
): number {
  const rate = getStakeholderHourlyRate(item, stakeholders);
  const hours = Number(item.actualHours) || 0;
  return Math.round(rate * hours);
}

/**
 * Formats a duration in seconds into a clean, human-readable string (e.g. "2d 4h", "18h 30m", "45 mins")
 */
export function formatDurationCompact(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 60) {
    return "< 1 min";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
  }
  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hrs`;
  }
  return `${minutes} mins`;
}

export const formatDurationSeconds = formatDurationCompact;

/**
 * Formats seconds into precise decimal hours (e.g. 1.25 hrs)
 */
export function formatSecondsToDecimalHours(totalSeconds: number): number {
  if (!totalSeconds || totalSeconds <= 0) return 0;
  return Math.round((totalSeconds / 3600) * 100) / 100;
}

/**
 * Calculates current total seconds spent in "Blocked" status for an item,
 * including active elapsed time if the item is currently in "Blocked" status.
 */
export function getTotalBlockedSeconds(item: WbsItem, now = Date.now()): number {
  let total = item.totalBlockedDurationSeconds || 0;
  if (item.status === "Blocked" && item.blockedStartedAt) {
    const start = new Date(item.blockedStartedAt).getTime();
    if (!isNaN(start) && start <= now) {
      total += Math.floor((now - start) / 1000);
    }
  }
  return Math.max(0, total);
}

/**
 * Calculates current total seconds spent in active work ("In Progress"),
 * including active elapsed time if currently "In Progress".
 */
export function getTotalActiveWorkSeconds(item: WbsItem, now = Date.now()): number {
  let total = item.activeWorkSeconds || 0;
  if (item.status === "In Progress" && item.inProgressStartedAt) {
    const start = new Date(item.inProgressStartedAt).getTime();
    if (!isNaN(start) && start <= now) {
      total += Math.floor((now - start) / 1000);
    }
  }
  return Math.max(0, total);
}

export const getActiveWorkSeconds = getTotalActiveWorkSeconds;

/**
 * Intelligent State & Timer Transition Engine:
 * - When entering "In Progress": starts / resumes the active working timer.
 * - When entering "Blocked" or "On Hold": PAUSES active working timer, starts blocked/on-hold timer.
 * - When leaving "Blocked" or "On Hold": stops and accumulates blocked/on-hold duration.
 * - When moving to "Demoable" or "Done": stops active working timer, computes actualHours,
 *   and calculates actualCost = hourlyRate * actualHours.
 * - Automatically updates progress percentage based on status rules.
 */
export function transitionWorkItemStatus(
  item: WbsItem,
  nextStatus: WorkItemStatus,
  arg3?: StatusConfig[] | Stakeholder[],
  arg4?: Stakeholder[] | StatusConfig[]
): WbsItem {
  let statusConfigs: StatusConfig[] | undefined;
  let stakeholders: Stakeholder[] | undefined;

  // Gracefully handle either argument order (statusConfigs, stakeholders) or (stakeholders, statusConfigs)
  if (Array.isArray(arg3) && arg3.length > 0) {
    if ("dotColor" in arg3[0] || "progressPercent" in arg3[0] || "key" in arg3[0]) {
      statusConfigs = arg3 as StatusConfig[];
    } else {
      stakeholders = arg3 as Stakeholder[];
    }
  }
  if (Array.isArray(arg4) && arg4.length > 0) {
    if ("dotColor" in arg4[0] || "progressPercent" in arg4[0] || "key" in arg4[0]) {
      statusConfigs = arg4 as StatusConfig[];
    } else {
      stakeholders = arg4 as Stakeholder[];
    }
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const currentStatus = item.status;

  if (currentStatus === nextStatus) {
    return item;
  }

  let activeWorkSeconds = item.activeWorkSeconds || 0;
  let totalBlockedSeconds = item.totalBlockedDurationSeconds || 0;
  let totalOnHoldSeconds = item.totalOnHoldDurationSeconds || 0;
  let inProgressStartedAt = item.inProgressStartedAt;
  let blockedStartedAt = item.blockedStartedAt;
  let onHoldStartedAt = item.onHoldStartedAt;

  // 1. Finalize timers leaving current status
  if (currentStatus === "In Progress" && inProgressStartedAt) {
    const start = new Date(inProgressStartedAt).getTime();
    if (!isNaN(start) && start <= now) {
      activeWorkSeconds += Math.floor((now - start) / 1000);
    }
    inProgressStartedAt = undefined;
  } else if (currentStatus === "Blocked" && blockedStartedAt) {
    const start = new Date(blockedStartedAt).getTime();
    if (!isNaN(start) && start <= now) {
      totalBlockedSeconds += Math.floor((now - start) / 1000);
    }
    blockedStartedAt = undefined;
  } else if ((currentStatus === "On Hold" || currentStatus === "Hold") && onHoldStartedAt) {
    const start = new Date(onHoldStartedAt).getTime();
    if (!isNaN(start) && start <= now) {
      totalOnHoldSeconds += Math.floor((now - start) / 1000);
    }
    onHoldStartedAt = undefined;
  }

  // 2. Initialize timer for next status
  if (nextStatus === "In Progress") {
    inProgressStartedAt = nowIso;
  } else if (nextStatus === "Blocked") {
    blockedStartedAt = nowIso;
    // Active work timer is paused
    inProgressStartedAt = undefined;
  } else if (nextStatus === "On Hold" || nextStatus === "Hold") {
    onHoldStartedAt = nowIso;
    // Active work timer is paused
    inProgressStartedAt = undefined;
  } else if (nextStatus === "Demoable" || nextStatus === "Done") {
    // Work reached demoable or done: timer stopped
    inProgressStartedAt = undefined;
  }

  // 3. Compute Actual Hours & Actual Cost
  const hourlyRate = getStakeholderHourlyRate(item, stakeholders);
  let actualHours = item.actualHours || 0;

  // If transitioning to Demoable or Done, calculate actualHours from active work time
  if (nextStatus === "Demoable" || nextStatus === "Done") {
    if (activeWorkSeconds > 0) {
      actualHours = Math.round((activeWorkSeconds / 3600) * 100) / 100;
    } else if (actualHours === 0) {
      // If toggled without running timer (e.g. quick demo / user testing),
      // default actual hours to estimated hours or a realistic value (at least 1h)
      actualHours = Math.max(1, Number(item.estimatedHours) || 8);
      activeWorkSeconds = Math.round(actualHours * 3600);
    }
  }

  const actualCost = Math.round(hourlyRate * actualHours);
  const plannedBudget = Math.round(hourlyRate * (Number(item.estimatedHours) || 0));

  // 4. Auto-calculated progress % from status rules
  const progressPercent = getProgressForStatus(nextStatus, statusConfigs);

  return {
    ...item,
    status: nextStatus,
    progressPercent,
    actualHours,
    actualCost,
    plannedBudget,
    activeWorkSeconds,
    inProgressStartedAt,
    blockedStartedAt,
    totalBlockedDurationSeconds: totalBlockedSeconds,
    onHoldStartedAt,
    totalOnHoldDurationSeconds: totalOnHoldSeconds,
    lastStatusChangeAt: nowIso,
  };
}
