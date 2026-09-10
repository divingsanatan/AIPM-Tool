import { Project, Sprint, WbsItem, RaidItem, ChangeRequest, Stakeholder, ProjectDocument } from "../types";

export interface SyncPayload {
  projects?: Project[];
  sprints?: Sprint[];
  wbsItems?: WbsItem[];
  raidItems?: RaidItem[];
  changeRequests?: ChangeRequest[];
  stakeholders?: Stakeholder[];
  documents?: ProjectDocument[];
  lastUpdated?: string;
  sourceDevice?: string;
  replaceProjects?: boolean;
  replaceSprints?: boolean;
  replaceWbsItems?: boolean;
  replaceRaidItems?: boolean;
  replaceChangeRequests?: boolean;
  replaceStakeholders?: boolean;
  replaceDocuments?: boolean;
}

export interface ServerSyncResponse {
  success: boolean;
  lastUpdated: string;
  projectCount: number;
  sprintCount: number;
  projects?: Project[];
}

// Cross-tab broadcast channel
export const syncBroadcastChannel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("enterprise_pmi_sync")
    : null;

export function notifySyncChannel(payload?: Partial<SyncPayload>) {
  try {
    if (syncBroadcastChannel) {
      syncBroadcastChannel.postMessage({
        type: "STATE_UPDATED",
        timestamp: Date.now(),
        payload,
      });
    }
  } catch (e) {
    // Ignore channel errors
  }
}

/**
 * Fetch the centralized state from the backend server
 */
export async function fetchServerState(): Promise<SyncPayload | null> {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) {
      console.warn("Could not fetch server state: status", res.status);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Network error fetching server state:", err);
    return null;
  }
}

/**
 * Push local state to the backend server for all devices to sync
 */
export async function pushServerState(payload: SyncPayload): Promise<ServerSyncResponse | null> {
  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to push state: ${res.statusText}`);
    }
    const data: ServerSyncResponse = await res.json();
    return data;
  } catch (err) {
    console.error("Failed pushing state to server:", err);
    return null;
  }
}

/**
 * Merge two project arrays by ID, keeping unique items and updating existing
 */
export function mergeProjects(local: Project[], remote: Project[]): Project[] {
  const map = new Map<string, Project>();
  
  // Remote first
  remote.forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });
  
  // Local (preserves or updates)
  local.forEach((p) => {
    if (p && p.id) {
      // If local item exists, keep local if newer, or remote if it's already there
      if (!map.has(p.id)) {
        map.set(p.id, p);
      } else {
        // Merge attributes
        const existing = map.get(p.id)!;
        map.set(p.id, { ...existing, ...p });
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Merge sprints by ID
 */
export function mergeSprints(local: Sprint[], remote: Sprint[]): Sprint[] {
  const map = new Map<string, Sprint>();
  remote.forEach((s) => {
    if (s && s.id) map.set(s.id, s);
  });
  local.forEach((s) => {
    if (s && s.id) {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      } else {
        const existing = map.get(s.id)!;
        map.set(s.id, { ...existing, ...s });
      }
    }
  });
  return Array.from(map.values());
}

export function mergeGenericById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  remote.forEach((r) => {
    if (r && r.id) map.set(r.id, r);
  });
  local.forEach((l) => {
    if (l && l.id) {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      } else {
        const existing = map.get(l.id)!;
        map.set(l.id, { ...existing, ...l });
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Intelligent bidirectional sync: merges local and server state by ID.
 * If local has projects or items missing from server, it automatically pushes the merged state.
 * If server has projects or items missing locally, it returns them to update local storage.
 */
export async function syncBidirectional(
  local: SyncPayload,
  forcePush: boolean = false
): Promise<{
  merged: SyncPayload;
  hasChanges: boolean;
  serverUpdated: boolean;
  projectCount: number;
  sprintCount: number;
}> {
  const remote = await fetchServerState();
  if (!remote) {
    if (forcePush) {
      await pushServerState(local);
    }
    return {
      merged: local,
      hasChanges: false,
      serverUpdated: forcePush,
      projectCount: local.projects?.length || 0,
      sprintCount: local.sprints?.length || 0,
    };
  }

  const mergedProjects = mergeProjects(local.projects || [], remote.projects || []);
  const mergedSprints = mergeSprints(local.sprints || [], remote.sprints || []);
  const mergedWbs = mergeGenericById(local.wbsItems || [], remote.wbsItems || []);
  const mergedRaid = mergeGenericById(local.raidItems || [], remote.raidItems || []);
  const mergedCr = mergeGenericById(local.changeRequests || [], remote.changeRequests || []);
  const mergedStk = mergeGenericById(local.stakeholders || [], remote.stakeholders || []);
  const mergedDocs = mergeGenericById(local.documents || [], remote.documents || []);

  const merged: SyncPayload = {
    projects: mergedProjects,
    sprints: mergedSprints,
    wbsItems: mergedWbs,
    raidItems: mergedRaid,
    changeRequests: mergedCr,
    stakeholders: mergedStk,
    documents: mergedDocs,
    lastUpdated: new Date().toISOString(),
  };

  const remoteProjectIds = new Set((remote.projects || []).map((p) => p.id));
  const localHasNewProjects = (local.projects || []).some((p) => !remoteProjectIds.has(p.id));

  const remoteSprintIds = new Set((remote.sprints || []).map((s) => s.id));
  const localHasNewSprints = (local.sprints || []).some((s) => !remoteSprintIds.has(s.id));

  const localProjectIds = new Set((local.projects || []).map((p) => p.id));
  const remoteHasNewProjects = (remote.projects || []).some((p) => !localProjectIds.has(p.id));

  const localSprintIds = new Set((local.sprints || []).map((s) => s.id));
  const remoteHasNewSprints = (remote.sprints || []).some((s) => !localSprintIds.has(s.id));

  const hasChanges = localHasNewProjects || localHasNewSprints || remoteHasNewProjects || remoteHasNewSprints;

  let serverUpdated = false;
  // If local had items not yet on the server, or forcePush, persist merged state to server
  if (forcePush || localHasNewProjects || localHasNewSprints || !remote.projects || remote.projects.length === 0) {
    await pushServerState(merged);
    serverUpdated = true;
  }

  return {
    merged,
    hasChanges,
    serverUpdated,
    projectCount: mergedProjects.length,
    sprintCount: mergedSprints.length,
  };
}

/**
 * Export all current projects and workspace data as a downloadable JSON string
 */
export function exportWorkspaceJson(data: SyncPayload): string {
  return JSON.stringify(
    {
      version: "1.0",
      exportDate: new Date().toISOString(),
      ...data,
    },
    null,
    2
  );
}

/**
 * Parse and validate an imported JSON string
 */
export function parseImportWorkspaceJson(raw: string): SyncPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : undefined,
      sprints: Array.isArray(parsed.sprints) ? parsed.sprints : undefined,
      wbsItems: Array.isArray(parsed.wbsItems) ? parsed.wbsItems : undefined,
      raidItems: Array.isArray(parsed.raidItems) ? parsed.raidItems : undefined,
      changeRequests: Array.isArray(parsed.changeRequests) ? parsed.changeRequests : undefined,
      stakeholders: Array.isArray(parsed.stakeholders) ? parsed.stakeholders : undefined,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    console.error("Invalid JSON for workspace import", e);
    return null;
  }
}
