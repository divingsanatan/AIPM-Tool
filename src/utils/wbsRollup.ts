import { WbsItem, WbsType, WorkItemStatus } from "../types";

/**
 * Resolves the parent ID of a WBS item by explicit parentId or by WBS code dot-hierarchy.
 */
export function getParentId(item: WbsItem, allItems: WbsItem[]): string | null {
  // 1. Direct parentId check if valid
  if (item.parentId && allItems.some((i) => i.id === item.parentId && i.id !== item.id)) {
    return item.parentId;
  }

  // 2. Derive parent from WBS code (e.g., "2.1.1.1" -> "2.1.1", "2.1" -> "2.0")
  const code = (item.wbsCode || "").trim();
  if (!code) return null;

  const parts = code.split(".");
  // Top-level milestone like "1.0" or "1"
  if (parts.length <= 1 || (parts.length === 2 && parts[1] === "0")) {
    return null;
  }

  // Look for direct code parent
  const parentCodeCandidate1 = parts.slice(0, -1).join(".");
  const parent1 = allItems.find((i) => i.id !== item.id && i.wbsCode === parentCodeCandidate1);
  if (parent1) return parent1.id;

  // If two parts like "2.1", parent might be "2.0"
  if (parts.length === 2) {
    const parentCodeCandidate2 = `${parts[0]}.0`;
    const parent2 = allItems.find((i) => i.id !== item.id && i.wbsCode === parentCodeCandidate2);
    if (parent2) return parent2.id;
  }

  return null;
}

export interface WbsRollupResult {
  rolledUpItems: WbsItem[];
  parentItemIds: Set<string>;
  leafItemIds: Set<string>;
  childrenMap: Map<string, string[]>; // parentId -> childIds
  parentMap: Map<string, string>; // childId -> parentId
  summaryStats: {
    totalRolledUpHours: number;
    totalRolledUpBudget: number;
    totalActualHours: number;
    totalActualCost: number;
    lowestWorkItemsCount: number;
    summaryItemsCount: number;
  };
}

/**
 * Calculates automated PMI 100% Rule roll-ups for all parent work items.
 * Lowest work items (leaves) retain direct user entries.
 * Parent items automatically sum and roll up estimated hours, planned budgets,
 * actual hours, actual costs, weighted progress, and timeline boundaries.
 */
export function calculateWbsHierarchyRollups(items: WbsItem[]): WbsRollupResult {
  const itemMap = new Map<string, WbsItem>();
  items.forEach((item) => {
    itemMap.set(item.id, { ...item });
  });

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  // Establish relationships
  items.forEach((item) => {
    const pId = getParentId(item, items);
    if (pId && itemMap.has(pId)) {
      parentMap.set(item.id, pId);
      const currentChildren = childrenMap.get(pId) || [];
      currentChildren.push(item.id);
      childrenMap.set(pId, currentChildren);
    }
  });

  const parentItemIds = new Set<string>();
  const leafItemIds = new Set<string>();

  items.forEach((item) => {
    const children = childrenMap.get(item.id);
    if (children && children.length > 0) {
      parentItemIds.add(item.id);
    } else {
      leafItemIds.add(item.id);
    }
  });

  // Post-order / depth-first roll-up computation
  const memo = new Map<string, WbsItem>();
  const visiting = new Set<string>(); // cycle prevention

  function rollUpItem(id: string): WbsItem {
    if (memo.has(id)) {
      return memo.get(id)!;
    }

    const raw = itemMap.get(id);
    if (!raw) {
      const fallback: WbsItem = {
        id,
        wbsCode: "0.0",
        title: "Unknown",
        type: "Task",
        status: "To Do",
        estimatedHours: 0,
        actualHours: 0,
        plannedBudget: 0,
        actualCost: 0,
        progressPercent: 0,
        startDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
      };
      return fallback;
    }

    const childIds = childrenMap.get(id);

    // If it is a leaf item (lowest work item), direct entry is respected
    if (!childIds || childIds.length === 0) {
      const leafItem: WbsItem = {
        ...raw,
        estimatedHours: Number(raw.estimatedHours) || 0,
        plannedBudget: Number(raw.plannedBudget) || 0,
        actualHours: Number(raw.actualHours) || 0,
        actualCost: Number(raw.actualCost) || 0,
        progressPercent: Math.min(100, Math.max(0, Number(raw.progressPercent) || 0)),
        isRolledUp: false,
        childCount: 0,
      };
      memo.set(id, leafItem);
      return leafItem;
    }

    // Cycle detection guard
    if (visiting.has(id)) {
      memo.set(id, raw);
      return raw;
    }

    visiting.add(id);

    // Recursively resolve all children first
    const resolvedChildren = childIds.map((cId) => rollUpItem(cId));

    visiting.delete(id);

    // 100% Rule sums from children
    const rolledEstimatedHours = resolvedChildren.reduce(
      (sum, c) => sum + (Number(c.estimatedHours) || 0),
      0
    );
    const rolledPlannedBudget = resolvedChildren.reduce(
      (sum, c) => sum + (Number(c.plannedBudget) || 0),
      0
    );
    const rolledActualHours = resolvedChildren.reduce(
      (sum, c) => sum + (Number(c.actualHours) || 0),
      0
    );
    const rolledActualCost = resolvedChildren.reduce(
      (sum, c) => sum + (Number(c.actualCost) || 0),
      0
    );

    // Weighted progress roll-up based on budget, or hours, or simple average
    let rolledProgress = 0;
    if (rolledPlannedBudget > 0) {
      const weightedSum = resolvedChildren.reduce(
        (sum, c) => sum + (c.progressPercent || 0) * (c.plannedBudget || 0),
        0
      );
      rolledProgress = Math.round(weightedSum / rolledPlannedBudget);
    } else if (rolledEstimatedHours > 0) {
      const weightedSum = resolvedChildren.reduce(
        (sum, c) => sum + (c.progressPercent || 0) * (c.estimatedHours || 0),
        0
      );
      rolledProgress = Math.round(weightedSum / rolledEstimatedHours);
    } else if (resolvedChildren.length > 0) {
      const avg =
        resolvedChildren.reduce((sum, c) => sum + (c.progressPercent || 0), 0) /
        resolvedChildren.length;
      rolledProgress = Math.round(avg);
    }

    // Date range roll-up
    let earliestStart = raw.startDate;
    let latestDue = raw.dueDate;

    resolvedChildren.forEach((c) => {
      if (c.startDate) {
        if (!earliestStart || c.startDate < earliestStart) {
          earliestStart = c.startDate;
        }
      }
      if (c.dueDate) {
        if (!latestDue || c.dueDate > latestDue) {
          latestDue = c.dueDate;
        }
      }
    });

    // Status roll-up
    const allDone = resolvedChildren.every((c) => c.status === "Done");
    const anyBlocked = resolvedChildren.some((c) => c.status === "Blocked");
    const anyActive = resolvedChildren.some(
      (c) => c.status === "In Progress" || c.status === "Demoable" || c.progressPercent > 0
    );

    let rolledStatus: WorkItemStatus = raw.status;
    if (allDone) {
      rolledStatus = "Done";
      rolledProgress = 100;
    } else if (anyBlocked && raw.status !== "In Progress") {
      rolledStatus = "Blocked";
    } else if (anyActive && raw.status === "To Do") {
      rolledStatus = "In Progress";
    }

    const parentItem: WbsItem = {
      ...raw,
      estimatedHours: Math.round(rolledEstimatedHours * 10) / 10,
      plannedBudget: Math.round(rolledPlannedBudget),
      actualHours: Math.round(rolledActualHours * 10) / 10,
      actualCost: Math.round(rolledActualCost),
      progressPercent: Math.min(100, Math.max(0, rolledProgress)),
      startDate: earliestStart || raw.startDate,
      dueDate: latestDue || raw.dueDate,
      status: rolledStatus,
      isRolledUp: true,
      childCount: resolvedChildren.length,
    };

    memo.set(id, parentItem);
    return parentItem;
  }

  // Execute roll-ups for all items
  const rolledUpItems = items.map((item) => rollUpItem(item.id));

  // Compute overall summary stats (from leaf items to avoid double counting)
  let totalRolledUpHours = 0;
  let totalRolledUpBudget = 0;
  let totalActualHours = 0;
  let totalActualCost = 0;

  rolledUpItems.forEach((item) => {
    if (leafItemIds.has(item.id)) {
      totalRolledUpHours += item.estimatedHours || 0;
      totalRolledUpBudget += item.plannedBudget || 0;
      totalActualHours += item.actualHours || 0;
      totalActualCost += item.actualCost || 0;
    }
  });

  return {
    rolledUpItems,
    parentItemIds,
    leafItemIds,
    childrenMap,
    parentMap,
    summaryStats: {
      totalRolledUpHours: Math.round(totalRolledUpHours),
      totalRolledUpBudget: Math.round(totalRolledUpBudget),
      totalActualHours: Math.round(totalActualHours),
      totalActualCost: Math.round(totalActualCost),
      lowestWorkItemsCount: leafItemIds.size,
      summaryItemsCount: parentItemIds.size,
    },
  };
}

/**
 * Automatically suggests the next child WBS code for a parent.
 * E.g., for "2.1.1", if children "2.1.1.1" exists, returns "2.1.1.2".
 * For "1.0", returns "1.1" or "1.2".
 */
export function generateNextWbsChildCode(parent: WbsItem, allItems: WbsItem[]): string {
  const pCode = (parent.wbsCode || "").trim();
  const children = allItems.filter((i) => {
    const derivedParent = getParentId(i, allItems);
    return derivedParent === parent.id;
  });

  if (pCode.endsWith(".0")) {
    // Parent is a milestone like "1.0" or "2.0"
    const major = pCode.split(".")[0];
    const existingNums = children
      .map((c) => {
        const parts = c.wbsCode.split(".");
        return parts.length >= 2 ? parseInt(parts[1], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);

    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${major}.${nextNum}`;
  }

  // Standard dot-subtask: e.g. "2.1.1" -> "2.1.1.1"
  const existingSubNums = children
    .map((c) => {
      if (!c.wbsCode.startsWith(`${pCode}.`)) return 0;
      const sub = c.wbsCode.slice(pCode.length + 1).split(".")[0];
      return parseInt(sub, 10);
    })
    .filter((n) => !isNaN(n) && n > 0);

  const nextSubNum = existingSubNums.length > 0 ? Math.max(...existingSubNums) + 1 : 1;
  return `${pCode}.${nextSubNum}`;
}

/**
 * Suggests the logical PMI level for a new child work item.
 */
export function suggestChildType(parentType: WbsType): WbsType {
  switch (parentType) {
    case "Milestone":
      return "Epic";
    case "Epic":
      return "Feature";
    case "Feature":
      return "User Story";
    case "User Story":
      return "Task";
    case "Task":
    case "Subtask":
    default:
      return "Subtask";
  }
}
