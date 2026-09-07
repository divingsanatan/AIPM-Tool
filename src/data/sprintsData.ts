import { Sprint } from "../types";

export const DEFAULT_SPRINTS: Sprint[] = [
  {
    id: "sprint-7",
    name: "Sprint 7 (7/27 - 8/9)",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    status: "Active",
    projectGroup: "Flutter Project",
    taskCount: 9,
  },
  {
    id: "sprint-6",
    name: "Sprint 6 (7/13 - 7/26)",
    startDate: "2026-07-13",
    endDate: "2026-07-26",
    status: "Completed",
    projectGroup: "Flutter Project",
    taskCount: 2,
  },
  {
    id: "sprint-1-flutter",
    name: "Sprint 1 (Mar 9 - Mar 23)",
    startDate: "2026-03-09",
    endDate: "2026-03-23",
    status: "Completed",
    projectGroup: "Flutter Project",
    taskCount: 6,
  },
  {
    id: "sprint-1-angular",
    name: "Sprint 1 (Mar 9 - Mar 23)",
    startDate: "2026-03-09",
    endDate: "2026-03-23",
    status: "Completed",
    projectGroup: "Angular Project",
    taskCount: 6,
  },
  {
    id: "sprint-2-angular",
    name: "Sprint 2 (Mar 24 - Apr 7)",
    startDate: "2026-03-24",
    endDate: "2026-04-07",
    status: "Completed",
    projectGroup: "Angular Project",
    taskCount: 4,
  },
  {
    id: "sprint-3-angular",
    name: "Sprint 3 (4/6 - 4/19)",
    startDate: "2026-04-06",
    endDate: "2026-04-19",
    status: "Completed",
    projectGroup: "Angular Project",
    taskCount: 3,
  },
  {
    id: "sprint-4-angular",
    name: "Sprint 4 (6/29 - 7/13)",
    startDate: "2026-06-29",
    endDate: "2026-07-13",
    status: "Completed",
    projectGroup: "Angular Project",
    taskCount: 8,
  },
  {
    id: "sprint-6-angular",
    name: "Sprint 6 (7/13 - 7/26)",
    startDate: "2026-07-13",
    endDate: "2026-07-26",
    status: "Completed",
    projectGroup: "Angular Project",
    taskCount: 2,
  },
  {
    id: "sprint-7-angular",
    name: "Sprint 7 (7/27 - 8/9)",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    status: "Active",
    projectGroup: "Angular Project",
    taskCount: 11,
  },
  {
    id: "sprint-8-angular",
    name: "Sprint 8 (8/10 - 8/23)",
    startDate: "2026-08-10",
    endDate: "2026-08-23",
    status: "Planned",
    projectGroup: "Angular Project",
    taskCount: 0,
  },
  {
    id: "sprint-core-1",
    name: "Sprint 7 (7/27 - 8/9)",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    status: "Active",
    projectGroup: "Core Banking Platform",
    taskCount: 14,
  },
];

const STORAGE_KEY = "pmi_sprints_registry_v1";

export function loadSprints(): Sprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed loading sprints from storage", err);
  }
  return DEFAULT_SPRINTS;
}

export function saveSprints(sprints: Sprint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints));
  } catch (err) {
    console.error("Failed saving sprints to storage", err);
  }
}
