import { WbsItem, Stakeholder, RaciMatrixEntry, RaciRole } from "../types";
import { getParentId } from "./wbsRollup";

export interface InheritedRoleSource {
  role: RaciRole;
  childCode: string;
  childTitle: string;
}

export interface RolledUpRaciItem {
  wbsItemId: string;
  wbsCode: string;
  title: string;
  // Effective role displayed in the matrix
  assignments: Record<string, RaciRole | undefined>;
  // Explicit roles set directly on this item
  directAssignments: Record<string, RaciRole | undefined>;
  // Whether each stakeholder's role was inherited from child deliverables
  isInherited: Record<string, boolean>;
  // Provenance of inherited roles
  inheritedSources: Record<string, InheritedRoleSource[]>;
  // Diagnostics for PMI governance
  aCount: number;
  rCount: number;
  cCount: number;
  iCount: number;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface RaciRollupResult {
  itemsMap: Map<string, RolledUpRaciItem>;
  totalDirectRoles: number;
  totalInheritedRoles: number;
  itemsWithZeroA: number;
  itemsWithMultipleA: number;
  itemsWithZeroR: number;
  isPmiCompliant: boolean;
}

/**
 * Calculates hierarchical RACI roll-ups up the WBS tree.
 * Child task assignments roll up to parent Features, Epics, and Milestones.
 * Direct assignments on parent deliverables take precedence over inherited roles.
 */
export function calculateRaciHierarchyRollups(
  wbsItems: WbsItem[],
  raciEntries: RaciMatrixEntry[],
  stakeholders: Stakeholder[]
): RaciRollupResult {
  const directMap = new Map<string, Record<string, RaciRole | undefined>>();
  raciEntries.forEach((entry) => {
    directMap.set(entry.wbsItemId, { ...entry.assignments });
  });

  const childrenMap = new Map<string, string[]>();
  wbsItems.forEach((item) => {
    const pId = getParentId(item, wbsItems);
    if (pId) {
      const list = childrenMap.get(pId) || [];
      list.push(item.id);
      childrenMap.set(pId, list);
    }
  });

  const resultMap = new Map<string, RolledUpRaciItem>();
  const visiting = new Set<string>();

  function resolveItem(id: string): RolledUpRaciItem {
    if (resultMap.has(id)) {
      return resultMap.get(id)!;
    }

    const item = wbsItems.find((i) => i.id === id);
    const directAssigns = directMap.get(id) || {};
    const childIds = childrenMap.get(id) || [];

    if (!item) {
      const fallback: RolledUpRaciItem = {
        wbsItemId: id,
        wbsCode: "0.0",
        title: "Unknown",
        assignments: {},
        directAssignments: {},
        isInherited: {},
        inheritedSources: {},
        aCount: 0,
        rCount: 0,
        cCount: 0,
        iCount: 0,
        hasWarning: false,
      };
      resultMap.set(id, fallback);
      return fallback;
    }

    // Leaf item (no children)
    if (childIds.length === 0) {
      const effectiveAssignments: Record<string, RaciRole | undefined> = { ...directAssigns };
      const isInherited: Record<string, boolean> = {};

      // If stakeholder is assigned to do this work package and has no explicit RACI role, default to 'R' (Responsible)
      if (item.assignedStakeholderId && !effectiveAssignments[item.assignedStakeholderId]) {
        effectiveAssignments[item.assignedStakeholderId] = "R";
        isInherited[item.assignedStakeholderId] = false;
      }

      Object.keys(directAssigns).forEach((sId) => {
        isInherited[sId] = false;
      });

      const roles = Object.values(effectiveAssignments).filter(Boolean) as RaciRole[];
      const aCount = roles.filter((r) => r === "A").length;
      const rCount = roles.filter((r) => r === "R").length;
      const cCount = roles.filter((r) => r === "C").length;
      const iCount = roles.filter((r) => r === "I").length;

      let warningMessage: string | undefined;
      if (aCount === 0) warningMessage = "Must assign exactly 1 Accountable (A)";
      else if (aCount > 1) warningMessage = "Multiple Accountables (A) violates single-point rule";
      else if (rCount === 0) warningMessage = "Must assign at least 1 Responsible (R)";

      const leafResult: RolledUpRaciItem = {
        wbsItemId: id,
        wbsCode: item.wbsCode,
        title: item.title,
        assignments: effectiveAssignments,
        directAssignments: directAssigns,
        isInherited,
        inheritedSources: {},
        aCount,
        rCount,
        cCount,
        iCount,
        hasWarning: Boolean(warningMessage),
        warningMessage,
      };

      resultMap.set(id, leafResult);
      return leafResult;
    }

    // Parent item: cycle guard
    if (visiting.has(id)) {
      const fallback: RolledUpRaciItem = {
        wbsItemId: id,
        wbsCode: item.wbsCode,
        title: item.title,
        assignments: { ...directAssigns },
        directAssignments: directAssigns,
        isInherited: {},
        inheritedSources: {},
        aCount: 0,
        rCount: 0,
        cCount: 0,
        iCount: 0,
        hasWarning: false,
      };
      resultMap.set(id, fallback);
      return fallback;
    }

    visiting.add(id);

    // Recursively resolve all children first
    const resolvedChildren = childIds.map((cId) => resolveItem(cId));

    visiting.delete(id);

    const effectiveAssignments: Record<string, RaciRole | undefined> = { ...directAssigns };
    const isInherited: Record<string, boolean> = {};
    const inheritedSources: Record<string, InheritedRoleSource[]> = {};

    // Mark explicit roles
    Object.keys(directAssigns).forEach((sId) => {
      if (directAssigns[sId]) {
        isInherited[sId] = false;
      }
    });

    // Check if an 'A' is already explicitly assigned on the parent
    let hasExplicitA = Object.values(directAssigns).includes("A");

    // Roll up roles for each stakeholder from children
    stakeholders.forEach((s) => {
      // If already directly assigned on the parent, direct choice stands
      if (effectiveAssignments[s.id]) {
        return;
      }

      // Collect child assignments for this stakeholder
      const childRoles: { role: RaciRole; childCode: string; childTitle: string }[] = [];
      resolvedChildren.forEach((child) => {
        const cRole = child.assignments[s.id];
        if (cRole) {
          childRoles.push({
            role: cRole,
            childCode: child.wbsCode,
            childTitle: child.title,
          });
        }
      });

      if (childRoles.length === 0) return;

      // Determine the highest rolled-up role
      // Hierarchy priority: A > R > C > I
      const hasChildA = childRoles.some((cr) => cr.role === "A");
      const hasChildR = childRoles.some((cr) => cr.role === "R");
      const hasChildC = childRoles.some((cr) => cr.role === "C");
      const hasChildI = childRoles.some((cr) => cr.role === "I");

      let rolledRole: RaciRole | undefined;

      if (hasChildA) {
        // If parent does not yet have an Accountable, can inherit 'A'
        if (!hasExplicitA && !Object.values(effectiveAssignments).includes("A")) {
          rolledRole = "A";
        } else {
          // If parent already has an 'A', the child's accountable lead rolls up as 'R'
          rolledRole = "R";
        }
      } else if (hasChildR) {
        rolledRole = "R";
      } else if (hasChildC) {
        rolledRole = "C";
      } else if (hasChildI) {
        rolledRole = "I";
      }

      if (rolledRole) {
        effectiveAssignments[s.id] = rolledRole;
        isInherited[s.id] = true;
        inheritedSources[s.id] = childRoles;
      }
    });

    // Count roles
    const roles = Object.values(effectiveAssignments).filter(Boolean) as RaciRole[];
    const aCount = roles.filter((r) => r === "A").length;
    const rCount = roles.filter((r) => r === "R").length;
    const cCount = roles.filter((r) => r === "C").length;
    const iCount = roles.filter((r) => r === "I").length;

    let warningMessage: string | undefined;
    if (aCount === 0) warningMessage = "Must assign exactly 1 Accountable (A)";
    else if (aCount > 1) warningMessage = "Multiple Accountables (A) violates single-point rule";
    else if (rCount === 0) warningMessage = "Must assign at least 1 Responsible (R)";

    const parentResult: RolledUpRaciItem = {
      wbsItemId: id,
      wbsCode: item.wbsCode,
      title: item.title,
      assignments: effectiveAssignments,
      directAssignments: directAssigns,
      isInherited,
      inheritedSources,
      aCount,
      rCount,
      cCount,
      iCount,
      hasWarning: Boolean(warningMessage),
      warningMessage,
    };

    resultMap.set(id, parentResult);
    return parentResult;
  }

  // Resolve for all items
  wbsItems.forEach((item) => resolveItem(item.id));

  // Compute metrics
  let totalDirectRoles = 0;
  let totalInheritedRoles = 0;
  let itemsWithZeroA = 0;
  let itemsWithMultipleA = 0;
  let itemsWithZeroR = 0;

  resultMap.forEach((entry) => {
    Object.entries(entry.assignments).forEach(([sId, role]) => {
      if (role) {
        if (entry.isInherited[sId]) {
          totalInheritedRoles++;
        } else {
          totalDirectRoles++;
        }
      }
    });

    if (entry.aCount === 0) itemsWithZeroA++;
    if (entry.aCount > 1) itemsWithMultipleA++;
    if (entry.rCount === 0) itemsWithZeroR++;
  });

  const isPmiCompliant =
    itemsWithZeroA === 0 && itemsWithMultipleA === 0 && itemsWithZeroR === 0;

  return {
    itemsMap: resultMap,
    totalDirectRoles,
    totalInheritedRoles,
    itemsWithZeroA,
    itemsWithMultipleA,
    itemsWithZeroR,
    isPmiCompliant,
  };
}
