import { Project, Sprint, WbsItem, RaidItem, ChangeRequest, Stakeholder } from "../types";

export interface SyncPayload {
  projects?: Project[];
  sprints?: Sprint[];
  wbsItems?: WbsItem[];
  raidItems?: RaidItem[];
  changeRequests?: ChangeRequest[];
  stakeholders?: Stakeholder[];
  lastUpdated?: string;
  sourceDevice?: string;
}

export interface ServerSyncResponse {
  success: boolean;
  lastUpdated: string;
  projectCount: number;
  sprintCount: number;
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
