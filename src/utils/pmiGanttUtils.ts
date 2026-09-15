import { WbsItem } from "../types";

export type PmiDependencyType = "FS" | "SS" | "FF" | "SF";

export interface PmiDependency {
  predecessorId: string;
  successorId: string;
  type: PmiDependencyType;
  lagDays: number;
}

export interface CpmActivityMetrics {
  id: string;
  wbsCode: string;
  title: string;
  durationDays: number;
  earlyStart: number; // relative day offset from project start
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number; // Slack in days
  freeFloat: number;
  isCritical: boolean;
}

export interface CpmResult {
  activities: Record<string, CpmActivityMetrics>;
  criticalPathIds: Set<string>;
  totalProjectDurationDays: number;
  earliestDate: Date;
  latestDate: Date;
}

/**
 * Normalizes dependency string array from WbsItem.
 * Format examples:
 * - "wbs-1-1" -> { predecessorId: "wbs-1-1", type: "FS", lagDays: 0 }
 * - "wbs-1-1:SS" -> { predecessorId: "wbs-1-1", type: "SS", lagDays: 0 }
 * - "wbs-1-1:FS:2" -> { predecessorId: "wbs-1-1", type: "FS", lagDays: 2 }
 */
export function parseItemDependencies(item: WbsItem): PmiDependency[] {
  if (!item.dependencies || item.dependencies.length === 0) {
    return [];
  }

  return item.dependencies
    .map((depStr) => {
      if (!depStr) return null;
      const parts = depStr.split(":");
      const predecessorId = parts[0]?.trim();
      if (!predecessorId) return null;

      const rawType = (parts[1]?.trim().toUpperCase() || "FS") as PmiDependencyType;
      const type: PmiDependencyType = ["FS", "SS", "FF", "SF"].includes(rawType) ? rawType : "FS";
      const lagDays = parts[2] ? parseInt(parts[2].replace("+", ""), 10) || 0 : 0;

      return {
        predecessorId,
        successorId: item.id,
        type,
        lagDays,
      };
    })
    .filter((d): d is PmiDependency => d !== null);
}

/**
 * Default PMI dependencies mapping for seed items if not explicitly customized.
 * Guarantees a realistic, rich PMI network across milestones and sprints.
 */
export const DEFAULT_PMI_DEPENDENCIES: Record<string, string[]> = {
  // Sprint 1 (Flutter)
  "wbs-1-1-2": ["wbs-1-1-1:FS"],
  "wbs-1-2-1": ["wbs-1-1-1:SS", "wbs-1-1-2:FS"],
  "wbs-1": ["wbs-1-1:FF", "wbs-1-2:FF"],
  // Sprint 2 (Flutter)
  "wbs-2-1": ["wbs-1:FS"],
  "wbs-2-1-1": ["wbs-1-2-1:FS"],
  "wbs-2-1-1-1": ["wbs-2-1-1:FS"],
  "wbs-2-1-1-1-1": ["wbs-2-1-1-1:FS"],
  "wbs-2-1-1-1-2": ["wbs-2-1-1-1-1:FS"],
  "wbs-2-2-1": ["wbs-2-1-1-1-1:FS"],
  "wbs-2": ["wbs-2-1:FF", "wbs-2-2:FF"],
  // Sprint 3
  "wbs-3-1-1": ["wbs-2-1-1-1-2:FS"],
  "wbs-3-1-2": ["wbs-3-1-1:FS"],
  "wbs-3": ["wbs-3-1:FF"],
  // Sprint 4
  "wbs-4-1-1": ["wbs-3-1-2:FS"],
  "wbs-4-1-2": ["wbs-4-1-1:SS:+3"],
  "wbs-4": ["wbs-4-1:FF"],
  // Angular project
  "wbs-ang-1-2": ["wbs-ang-1-1:FS"],
  "wbs-ang-2-1": ["wbs-ang-1-2:FS"],
};

/**
 * Resolves all effective dependencies for a given list of WbsItems.
 */
export function resolveEffectiveDependencies(items: WbsItem[]): PmiDependency[] {
  const itemMap = new Map<string, WbsItem>(items.map((i) => [i.id, i]));
  const result: PmiDependency[] = [];

  items.forEach((item) => {
    // Check item's own dependencies first
    const explicitDeps = parseItemDependencies(item);
    if (explicitDeps.length > 0) {
      explicitDeps.forEach((dep) => {
        if (itemMap.has(dep.predecessorId)) {
          result.push(dep);
        }
      });
    } else if (DEFAULT_PMI_DEPENDENCIES[item.id]) {
      // Use standard default PMI network if none set
      DEFAULT_PMI_DEPENDENCIES[item.id].forEach((depStr) => {
        const parts = depStr.split(":");
        const predId = parts[0];
        const type = (parts[1] || "FS") as PmiDependencyType;
        const lagDays = parts[2] ? parseInt(parts[2], 10) || 0 : 0;
        if (itemMap.has(predId)) {
          result.push({
            predecessorId: predId,
            successorId: item.id,
            type,
            lagDays,
          });
        }
      });
    }
  });

  return result;
}

/**
 * Parses a Date from standard YYYY-MM-DD string safely.
 */
export function parseDate(dateStr?: string, fallback = new Date()): Date {
  if (!dateStr) return fallback;
  const parsed = new Date(dateStr + "T00:00:00");
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * Formats a Date to YYYY-MM-DD string.
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates duration in days (minimum 1 day).
 */
export function getDurationDays(startDateStr: string, dueDateStr: string): number {
  const start = parseDate(startDateStr);
  const end = parseDate(dueDateStr);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Performs Critical Path Method (CPM) Forward and Backward pass calculations.
 * Identifies total float (slack) and critical activities as per PMI standards.
 */
export function calculateCpm(items: WbsItem[]): CpmResult {
  if (!items || items.length === 0) {
    return {
      activities: {},
      criticalPathIds: new Set(),
      totalProjectDurationDays: 0,
      earliestDate: new Date(),
      latestDate: new Date(),
    };
  }

  // Find project start date
  let earliestDate = parseDate(items[0].startDate);
  let latestDate = parseDate(items[0].dueDate);

  items.forEach((item) => {
    const s = parseDate(item.startDate);
    const d = parseDate(item.dueDate);
    if (s < earliestDate) earliestDate = s;
    if (d > latestDate) latestDate = d;
  });

  const baseTime = earliestDate.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;

  const dependencies = resolveEffectiveDependencies(items);
  const itemMap = new Map<string, WbsItem>(items.map((i) => [i.id, i]));

  // Build predecessor and successor lookups
  const predecessorsOf = new Map<string, PmiDependency[]>();
  const successorsOf = new Map<string, PmiDependency[]>();

  items.forEach((item) => {
    predecessorsOf.set(item.id, []);
    successorsOf.set(item.id, []);
  });

  dependencies.forEach((dep) => {
    predecessorsOf.get(dep.successorId)?.push(dep);
    successorsOf.get(dep.predecessorId)?.push(dep);
  });

  // Calculate duration and initial planned start offset for each item
  const initialOffsets: Record<string, { startOffset: number; duration: number }> = {};
  items.forEach((item) => {
    const s = parseDate(item.startDate);
    const d = parseDate(item.dueDate);
    const startOffset = Math.max(0, Math.floor((s.getTime() - baseTime) / msPerDay));
    const duration = Math.max(item.type === "Milestone" ? 0 : 1, Math.ceil((d.getTime() - s.getTime()) / msPerDay));
    initialOffsets[item.id] = { startOffset, duration };
  });

  // 1. Forward Pass (ES & EF)
  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};

  // Simple topological sort or iterative relaxation
  items.forEach((item) => {
    es[item.id] = initialOffsets[item.id].startOffset;
    ef[item.id] = es[item.id] + initialOffsets[item.id].duration;
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 30) {
    changed = false;
    iterations++;

    items.forEach((item) => {
      const preds = predecessorsOf.get(item.id) || [];
      const duration = initialOffsets[item.id].duration;
      let calculatedEs = initialOffsets[item.id].startOffset;

      preds.forEach((dep) => {
        const predEf = ef[dep.predecessorId] ?? 0;
        const predEs = es[dep.predecessorId] ?? 0;
        const lag = dep.lagDays || 0;

        if (dep.type === "FS") {
          calculatedEs = Math.max(calculatedEs, predEf + lag);
        } else if (dep.type === "SS") {
          calculatedEs = Math.max(calculatedEs, predEs + lag);
        } else if (dep.type === "FF") {
          const reqEf = predEf + lag;
          calculatedEs = Math.max(calculatedEs, reqEf - duration);
        } else if (dep.type === "SF") {
          const reqEf = predEs + lag;
          calculatedEs = Math.max(calculatedEs, reqEf - duration);
        }
      });

      if (calculatedEs !== es[item.id]) {
        es[item.id] = calculatedEs;
        ef[item.id] = calculatedEs + duration;
        changed = true;
      }
    });
  }

  // Find max EF (Project Finish)
  let maxProjectFinish = 0;
  items.forEach((item) => {
    if (ef[item.id] > maxProjectFinish) {
      maxProjectFinish = ef[item.id];
    }
  });

  // 2. Backward Pass (LS & LF)
  const lf: Record<string, number> = {};
  const ls: Record<string, number> = {};

  items.forEach((item) => {
    lf[item.id] = maxProjectFinish;
    ls[item.id] = lf[item.id] - initialOffsets[item.id].duration;
  });

  changed = true;
  iterations = 0;
  while (changed && iterations < 30) {
    changed = false;
    iterations++;

    // Iterate backwards
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const succs = successorsOf.get(item.id) || [];
      const duration = initialOffsets[item.id].duration;

      if (succs.length === 0) {
        // Ends at project finish
        continue;
      }

      let calculatedLf = maxProjectFinish;

      succs.forEach((dep) => {
        const succLs = ls[dep.successorId] ?? maxProjectFinish;
        const succLf = lf[dep.successorId] ?? maxProjectFinish;
        const lag = dep.lagDays || 0;

        if (dep.type === "FS") {
          calculatedLf = Math.min(calculatedLf, succLs - lag);
        } else if (dep.type === "SS") {
          const reqLs = succLs - lag;
          calculatedLf = Math.min(calculatedLf, reqLs + duration);
        } else if (dep.type === "FF") {
          calculatedLf = Math.min(calculatedLf, succLf - lag);
        } else if (dep.type === "SF") {
          const reqLs = succLf - lag;
          calculatedLf = Math.min(calculatedLf, reqLs + duration);
        }
      });

      if (calculatedLf !== lf[item.id]) {
        lf[item.id] = calculatedLf;
        ls[item.id] = calculatedLf - duration;
        changed = true;
      }
    }
  }

  // 3. Compute Total Float and Identify Critical Path
  const activities: Record<string, CpmActivityMetrics> = {};
  const criticalPathIds = new Set<string>();

  items.forEach((item) => {
    const earlyS = es[item.id];
    const earlyF = ef[item.id];
    const lateS = ls[item.id];
    const lateF = lf[item.id];
    const duration = initialOffsets[item.id].duration;

    const totalFloat = Math.max(0, lateS - earlyS);

    // Free float: min(succ ES) - EF
    const succs = successorsOf.get(item.id) || [];
    let freeFloat = totalFloat;
    if (succs.length > 0) {
      let minSuccEs = maxProjectFinish;
      succs.forEach((s) => {
        const sEs = es[s.successorId] ?? maxProjectFinish;
        if (sEs < minSuccEs) minSuccEs = sEs;
      });
      freeFloat = Math.max(0, minSuccEs - earlyF);
    }

    // A task is critical if float <= 0 or manually tagged isCriticalPath
    const isCritical = totalFloat <= 0 || Boolean(item.isCriticalPath);

    if (isCritical) {
      criticalPathIds.add(item.id);
    }

    activities[item.id] = {
      id: item.id,
      wbsCode: item.wbsCode,
      title: item.title,
      durationDays: duration,
      earlyStart: earlyS,
      earlyFinish: earlyF,
      lateStart: lateS,
      lateFinish: lateF,
      totalFloat,
      freeFloat,
      isCritical,
    };
  });

  return {
    activities,
    criticalPathIds,
    totalProjectDurationDays: maxProjectFinish,
    earliestDate,
    latestDate,
  };
}

/**
 * Computes SVG path string connecting predecessor Gantt bar to successor Gantt bar
 * according to PMI Precedence Diagramming Method (PDM).
 */
export function buildPmiDependencyPath(
  predBox: { x: number; y: number; width: number; height: number },
  succBox: { x: number; y: number; width: number; height: number },
  type: PmiDependencyType = "FS"
): { path: string; arrowX: number; arrowY: number; arrowDir: "right" | "left" | "down" } {
  const pMidY = predBox.y + predBox.height / 2;
  const sMidY = succBox.y + succBox.height / 2;

  const pLeft = predBox.x;
  const pRight = predBox.x + Math.max(predBox.width, 12);
  const sLeft = succBox.x;
  const sRight = succBox.x + Math.max(succBox.width, 12);

  if (type === "FS") {
    // Finish-to-Start: Predecessor Finish (right) -> Successor Start (left)
    const startX = pRight;
    const startY = pMidY;
    const endX = sLeft;
    const endY = sMidY;

    if (endX >= startX + 16) {
      // Direct S-curve
      const midX = (startX + endX) / 2;
      return {
        path: `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 3} ${endY}`,
        arrowX: endX,
        arrowY: endY,
        arrowDir: "right",
      };
    } else {
      // Loop around (successor starts earlier or overlaps)
      const offset = 12;
      const cornerX = startX + offset;
      const loopY = startY < endY ? startY + 14 : startY - 14;
      const backX = Math.min(sLeft - 14, startX - 20);
      return {
        path: `M ${startX} ${startY} L ${cornerX} ${startY} L ${cornerX} ${loopY} L ${backX} ${loopY} L ${backX} ${endY} L ${endX - 3} ${endY}`,
        arrowX: endX,
        arrowY: endY,
        arrowDir: "right",
      };
    }
  }

  if (type === "SS") {
    // Start-to-Start: Predecessor Start (left) -> Successor Start (left)
    const startX = pLeft;
    const startY = pMidY;
    const endX = sLeft;
    const endY = sMidY;
    const minLeft = Math.min(startX, endX) - 14;

    return {
      path: `M ${startX} ${startY} L ${minLeft} ${startY} L ${minLeft} ${endY} L ${endX - 3} ${endY}`,
      arrowX: endX,
      arrowY: endY,
      arrowDir: "right",
    };
  }

  if (type === "FF") {
    // Finish-to-Finish: Predecessor Finish (right) -> Successor Finish (right)
    const startX = pRight;
    const startY = pMidY;
    const endX = sRight;
    const endY = sMidY;
    const maxRight = Math.max(startX, endX) + 16;

    return {
      path: `M ${startX} ${startY} L ${maxRight} ${startY} L ${maxRight} ${endY} L ${endX + 3} ${endY}`,
      arrowX: endX,
      arrowY: endY,
      arrowDir: "left",
    };
  }

  // SF: Start-to-Finish
  const startX = pLeft;
  const startY = pMidY;
  const endX = sRight;
  const endY = sMidY;
  const leftX = startX - 12;
  const rightX = endX + 12;

  return {
    path: `M ${startX} ${startY} L ${leftX} ${startY} L ${leftX} ${sMidY - 12} L ${rightX} ${sMidY - 12} L ${rightX} ${endY} L ${endX + 3} ${endY}`,
    arrowX: endX,
    arrowY: endY,
    arrowDir: "left",
  };
}
