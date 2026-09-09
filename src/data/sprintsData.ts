import { Sprint } from "../types";

export const DEFAULT_SPRINTS: Sprint[] = [
  // Flutter Project Sprints (matching ClickUp screenshot)
  {
    id: "sprint-7-flutter",
    name: "Sprint 7 (7/27 - 8/9)",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    status: "Active",
    projectId: "proj-flutter",
    projectGroup: "Flutter Project",
    taskCount: 9,
    goal: "Real-time biometric payment authorization and push notification webhooks.",
  },
  {
    id: "sprint-6-flutter",
    name: "Sprint 6 (7/13 - 7/26)",
    startDate: "2026-07-13",
    endDate: "2026-07-26",
    status: "Completed",
    projectId: "proj-flutter",
    projectGroup: "Flutter Project",
    taskCount: 2,
    goal: "Mobile app security review, offline SQLite encryption, and QA sign-off.",
  },
  {
    id: "sprint-1-flutter",
    name: "Sprint 1 (Mar 9 - Mar 23)",
    startDate: "2026-03-09",
    endDate: "2026-03-23",
    status: "Completed",
    projectId: "proj-flutter",
    projectGroup: "Flutter Project",
    taskCount: 6,
    goal: "Flutter cross-platform shell, theme setup, CI/CD pipeline, and biometric authentication.",
  },
  {
    id: "sprint-2-flutter",
    name: "Sprint 2 (Mar 24 - Apr 7)",
    startDate: "2026-03-24",
    endDate: "2026-04-07",
    status: "Completed",
    projectId: "proj-flutter",
    projectGroup: "Flutter Project",
    taskCount: 5,
    goal: "Core banking account views, transaction history stream, and SQLite local storage engine.",
  },
  {
    id: "sprint-5-flutter",
    name: "Sprint 5 (4/27 - 5/10)",
    startDate: "2026-04-27",
    endDate: "2026-05-10",
    status: "Completed",
    projectId: "proj-flutter",
    projectGroup: "Flutter Project",
    taskCount: 14,
    goal: "Peer-to-peer quick transfers, QR payment generation, and receipt PDF rendering.",
  },

  // Angular Project Sprints (from ClickUp screenshot)
  {
    id: "sprint-1-angular",
    name: "Sprint 1 (Mar 9 - Mar 23)",
    startDate: "2026-03-09",
    endDate: "2026-03-23",
    status: "Completed",
    projectId: "proj-angular",
    projectGroup: "Angular Project",
    taskCount: 6,
    goal: "Angular 18 standalone components and Tailwind styling structure.",
  },
  {
    id: "sprint-2-angular",
    name: "Sprint 2 (Mar 24 - Apr 7)",
    startDate: "2026-03-24",
    endDate: "2026-04-07",
    status: "Completed",
    projectId: "proj-angular",
    projectGroup: "Angular Project",
    taskCount: 4,
    goal: "Treasury ledger views and high-volume data tables with virtual scroll.",
  },
  {
    id: "sprint-3-angular",
    name: "Sprint 3 (4/6 - 4/19)",
    startDate: "2026-04-06",
    endDate: "2026-04-19",
    status: "Completed",
    projectId: "proj-angular",
    projectGroup: "Angular Project",
    taskCount: 3,
    goal: "FX reconciliation and multi-currency exchange rate feeds.",
  },
  {
    id: "sprint-4-angular",
    name: "Sprint 4 (6/29 - 7/13)",
    startDate: "2026-06-29",
    endDate: "2026-07-13",
    status: "Completed",
    projectId: "proj-angular",
    projectGroup: "Angular Project",
    taskCount: 8,
    goal: "Settlement reporting export to Excel, PDF, and automated compliance.",
  },
  {
    id: "sprint-6-angular",
    name: "Sprint 6 (7/13 - 7/26)",
    startDate: "2026-07-13",
    endDate: "2026-07-26",
    status: "Completed",
    projectId: "proj-angular",
    projectGroup: "Angular Project",
    taskCount: 2,
    goal: "Security penetration testing and SOC2 Type II audit remediation.",
  },
  {
    id: "sprint-7-angular",
    name: "Sprint 7 (7/27 - 8/9)",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    status: "Active",
    projectId: "proj-angular",
    projectGroup: "Angular Project",
    taskCount: 7,
    goal: "Real-time WebSockets trade blotter and broker execution alerts.",
  },
];

const STORAGE_KEY = "pmi_sprints_registry_v1";

export function loadSprints(): Sprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-merge any missing default sprints into the cached list so tasks are never orphaned
        const existingIds = new Set(parsed.map((s: Sprint) => s.id));
        const missingDefaults = DEFAULT_SPRINTS.filter((d) => !existingIds.has(d.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          saveSprints(merged);
          return merged;
        }
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
