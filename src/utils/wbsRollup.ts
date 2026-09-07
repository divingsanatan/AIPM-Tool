import { WbsItem, WbsType, WorkItemStatus, PriorityLevel, Stakeholder } from "../types";

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

/**
 * Determines whether an item is assigned to a milestone, feature, or higher hierarchy.
 * Returns true if the item is a Milestone itself, or if any of its ancestors is a Milestone, Epic, or Feature.
 * Returns false for unassigned backlog work items.
 */
export function isAssignedToHierarchy(item: WbsItem, allItems: WbsItem[]): boolean {
  if (item.type === "Milestone") return true;

  let currentParentId = getParentId(item, allItems);
  if (!currentParentId) return false;

  const visited = new Set<string>([item.id]);
  while (currentParentId) {
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    const parent = allItems.find((i) => i.id === currentParentId);
    if (!parent) return false;

    if (parent.type === "Milestone" || parent.type === "Epic" || parent.type === "Feature") {
      return true;
    }

    currentParentId = getParentId(parent, allItems);
  }

  return false;
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
export function calculateWbsHierarchyRollups(
  items: WbsItem[],
  stakeholders?: Stakeholder[]
): WbsRollupResult {
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

  const priorityRank: Record<string, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  const rankToPriority: Record<number, PriorityLevel> = {
    4: "Critical",
    3: "High",
    2: "Medium",
    1: "Low",
  };

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
      let leafActualCost = Number(raw.actualCost) || 0;
      const leafActualHours = Number(raw.actualHours) || 0;
      if (leafActualCost === 0 && leafActualHours > 0 && raw.assignedStakeholderId && stakeholders) {
        const s = stakeholders.find((st) => st.id === raw.assignedStakeholderId);
        if (s && s.hourlyRate > 0) {
          leafActualCost = Math.round(leafActualHours * s.hourlyRate);
        }
      }
      const leafEstimatedHours = Number(raw.estimatedHours) || 0;
      const leafPlannedBudget = Number(raw.plannedBudget) || 0;
      const leafProgressPercent = Math.min(100, Math.max(0, Number(raw.progressPercent) || 0));
      const leafEarnedValue = Math.round(leafPlannedBudget * (leafProgressPercent / 100));
      const leafCostVariance = leafEarnedValue - leafActualCost;
      const leafRemainingHours = Math.max(0, Math.round((leafEstimatedHours - leafActualHours) * 10) / 10);

      const initialContributors = Array.from(
        new Set([
          ...(raw.assignedStakeholderIds || []),
          ...(raw.assignedStakeholderId ? [raw.assignedStakeholderId] : []),
          ...(raw.contributorStakeholderIds || []),
        ])
      );

      const leafItem: WbsItem = {
        ...raw,
        assignedStakeholderId: raw.assignedStakeholderId || (raw.assignedStakeholderIds && raw.assignedStakeholderIds[0]) || undefined,
        assignedStakeholderIds: initialContributors,
        estimatedHours: leafEstimatedHours,
        plannedBudget: leafPlannedBudget,
        actualHours: leafActualHours,
        actualCost: leafActualCost,
        progressPercent: leafProgressPercent,
        earnedValue: leafEarnedValue,
        costVariance: leafCostVariance,
        remainingHours: leafRemainingHours,
        contributorStakeholderIds: initialContributors,
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

    // 100% Rule sums from children (Time & Cost)
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

    // Date range roll-up (Earliest start, latest due date)
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

    // Priority roll-up (highest severity among self and children)
    const rawPriority = (raw.priority || "Medium") as PriorityLevel;
    let highestRank = priorityRank[rawPriority] || 2;
    resolvedChildren.forEach((c) => {
      const childRank = priorityRank[c.priority || "Medium"] || 2;
      if (childRank > highestRank) {
        highestRank = childRank;
      }
    });
    const rolledPriority = rankToPriority[highestRank] || rawPriority;

    // Critical Path roll-up
    const rolledCriticalPath = Boolean(
      raw.isCriticalPath || resolvedChildren.some((c) => c.isCriticalPath)
    );

    // Contributor Stakeholders roll-up
    const contributorsSet = new Set<string>();
    if (raw.assignedStakeholderId) contributorsSet.add(raw.assignedStakeholderId);
    (raw.assignedStakeholderIds || []).forEach((sId) => contributorsSet.add(sId));
    (raw.contributorStakeholderIds || []).forEach((sId) => contributorsSet.add(sId));
    resolvedChildren.forEach((c) => {
      if (c.assignedStakeholderId) contributorsSet.add(c.assignedStakeholderId);
      (c.assignedStakeholderIds || []).forEach((sId) => contributorsSet.add(sId));
      (c.contributorStakeholderIds || []).forEach((sId) => contributorsSet.add(sId));
    });
    const contributorStakeholderIds = Array.from(contributorsSet);

    // EVM & Time values roll-up
    const rolledEarnedValue = Math.round(rolledPlannedBudget * (rolledProgress / 100));
    const rolledCostVariance = rolledEarnedValue - Math.round(rolledActualCost);
    const rolledRemainingHours = Math.max(
      0,
      Math.round((rolledEstimatedHours - rolledActualHours) * 10) / 10
    );

    // Status roll-up
    const allDone = resolvedChildren.length > 0 && resolvedChildren.every((c) => c.status === "Done");
    const anyActive = resolvedChildren.some(
      (c) =>
        c.status === "In Progress" ||
        c.status === "Demoable" ||
        (Number(c.progressPercent) || 0) > 0 ||
        c.status === "Done"
    );
    const allDemoableOrDone =
      resolvedChildren.length > 0 &&
      resolvedChildren.every((c) => c.status === "Demoable" || c.status === "Done") &&
      resolvedChildren.some((c) => c.status === "Demoable");
    const anyBlocked = resolvedChildren.some((c) => c.status === "Blocked");

    let rolledStatus: WorkItemStatus = raw.status;
    if (allDone) {
      rolledStatus = "Done";
      rolledProgress = 100;
    } else if (allDemoableOrDone) {
      rolledStatus = "Demoable";
    } else if (anyActive) {
      rolledStatus = "In Progress";
    } else if (anyBlocked) {
      rolledStatus = "Blocked";
    } else {
      rolledStatus = "To Do";
    }

    const parentItem: WbsItem = {
      ...raw,
      assignedStakeholderId:
        raw.assignedStakeholderId ||
        (raw.assignedStakeholderIds && raw.assignedStakeholderIds[0]) ||
        resolvedChildren[0]?.assignedStakeholderId,
      assignedStakeholderIds:
        raw.assignedStakeholderIds && raw.assignedStakeholderIds.length > 0
          ? raw.assignedStakeholderIds
          : contributorStakeholderIds,
      estimatedHours: Math.round(rolledEstimatedHours * 10) / 10,
      plannedBudget: Math.round(rolledPlannedBudget),
      actualHours: Math.round(rolledActualHours * 10) / 10,
      actualCost: Math.round(rolledActualCost),
      progressPercent: Math.min(100, Math.max(0, rolledProgress)),
      startDate: earliestStart || raw.startDate,
      dueDate: latestDue || raw.dueDate,
      status: rolledStatus,
      priority: rolledPriority,
      isCriticalPath: rolledCriticalPath,
      contributorStakeholderIds,
      earnedValue: rolledEarnedValue,
      costVariance: rolledCostVariance,
      remainingHours: rolledRemainingHours,
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
 * Suggests the logical PMI level for a new child work item in the WBS hierarchy:
 * Milestone -> Epic -> Feature -> User Story -> Task -> Subtask
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
      return "Subtask";
    case "Subtask":
    default:
      return "Subtask";
  }
}

/**
 * Returns a human-friendly label for the next child type down the hierarchy.
 * e.g., for Feature -> "Story", for Milestone -> "Epic".
 */
export function getChildTypeLabel(parentType: WbsType): string {
  const child = suggestChildType(parentType);
  return child === "User Story" ? "Story" : child;
}

/**
 * Returns a friendly name for a WBS Type (e.g. "User Story" -> "Story").
 */
export function getWbsTypeFriendlyName(type: WbsType): string {
  if (type === "User Story") return "Story";
  return type;
}

/**
 * Returns descriptive metadata and level rank for any WBS type.
 */
export function getHierarchyLevelInfo(type: WbsType) {
  switch (type) {
    case "Milestone":
      return {
        level: 1,
        label: "Milestone (Level 1: Project Phase / Delivery Gateway)",
        shortLabel: "Milestone",
        badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    case "Epic":
      return {
        level: 2,
        label: "Epic (Level 2: Major Strategic Deliverable)",
        shortLabel: "Epic",
        badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      };
    case "Feature":
      return {
        level: 3,
        label: "Feature (Level 3: Functional System Capability)",
        shortLabel: "Feature",
        badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      };
    case "User Story":
      return {
        level: 4,
        label: "Story (Level 4: User Story / Functional Slice)",
        shortLabel: "Story",
        badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      };
    case "Task":
      return {
        level: 5,
        label: "Task (Level 5: Work Breakdown Package)",
        shortLabel: "Task",
        badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      };
    case "Subtask":
    default:
      return {
        level: 6,
        label: "Subtask (Level 6: Granular Implementation Step)",
        shortLabel: "Subtask",
        badgeBg: "bg-slate-700/40 text-slate-300 border-slate-600/40",
      };
  }
}

/**
 * Smart nomenclature metadata for WBS types that saves space:
 * 3-letter acronyms or compact labels with distinctive dot colors.
 */
export function getCompactNomenclature(type: WbsType) {
  switch (type) {
    case "Milestone":
      return {
        acronym: "MLS",
        code: "M",
        symbol: "◆",
        microTag: "◆ M",
        short: "Milestone",
        level: 1,
        color: "text-amber-300",
        dotColor: "bg-amber-400",
        bgColor: "bg-amber-500/20",
        borderColor: "border-amber-500/40",
        badgeBg: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
        fullTitle: "Milestone (Level 1: Project Phase / Gateway)",
      };
    case "Epic":
      return {
        acronym: "EPC",
        code: "E",
        symbol: "⚡",
        microTag: "⚡ E",
        short: "Epic",
        level: 2,
        color: "text-purple-300",
        dotColor: "bg-purple-400",
        bgColor: "bg-purple-500/20",
        borderColor: "border-purple-500/40",
        badgeBg: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
        fullTitle: "Epic (Level 2: Major Strategic Deliverable)",
      };
    case "Feature":
      return {
        acronym: "FTR",
        code: "F",
        symbol: "✦",
        microTag: "✦ F",
        short: "Feature",
        level: 3,
        color: "text-blue-300",
        dotColor: "bg-blue-400",
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/40",
        badgeBg: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
        fullTitle: "Feature (Level 3: Functional System Capability)",
      };
    case "User Story":
      return {
        acronym: "STR",
        code: "S",
        symbol: "📖",
        microTag: "📖 S",
        short: "Story",
        level: 4,
        color: "text-emerald-300",
        dotColor: "bg-emerald-400",
        bgColor: "bg-emerald-500/20",
        borderColor: "border-emerald-500/40",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        fullTitle: "Story (Level 4: User Story / Functional Slice)",
      };
    case "Task":
      return {
        acronym: "TSK",
        code: "T",
        symbol: "☑",
        microTag: "☑ T",
        short: "Task",
        level: 5,
        color: "text-cyan-300",
        dotColor: "bg-cyan-400",
        bgColor: "bg-cyan-500/20",
        borderColor: "border-cyan-500/40",
        badgeBg: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40",
        fullTitle: "Task (Level 5: Work Breakdown Package)",
      };
    case "Subtask":
    default:
      return {
        acronym: "SUB",
        code: "sub",
        symbol: "↳",
        microTag: "↳ sub",
        short: "Subtask",
        level: 6,
        color: "text-slate-300",
        dotColor: "bg-slate-400",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700/60",
        badgeBg: "bg-slate-800 text-slate-400 border border-slate-700/60",
        fullTitle: "Subtask (Level 6: Granular Implementation Step)",
      };
  }
}

/**
 * Resolves all assigned stakeholders for a work item, supporting both
 * multiple assignees (assignedStakeholderIds), primary assignee (assignedStakeholderId),
 * and contributor list (contributorStakeholderIds).
 */
export function getItemAssignees(item: WbsItem, stakeholders: Stakeholder[]): Stakeholder[] {
  const ids: string[] = [];

  if (item.assignedStakeholderIds && item.assignedStakeholderIds.length > 0) {
    for (const id of item.assignedStakeholderIds) {
      if (id && !ids.includes(id)) ids.push(id);
    }
  }

  if (item.assignedStakeholderId && !ids.includes(item.assignedStakeholderId)) {
    ids.unshift(item.assignedStakeholderId);
  }

  if (item.contributorStakeholderIds && item.contributorStakeholderIds.length > 0) {
    for (const id of item.contributorStakeholderIds) {
      if (id && !ids.includes(id)) ids.push(id);
    }
  }

  return ids
    .map((id) => stakeholders.find((s) => s.id === id))
    .filter((s): s is Stakeholder => Boolean(s));
}

