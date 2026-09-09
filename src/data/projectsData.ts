import { Project } from "../types";

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-flutter",
    name: "Flutter Project",
    projectCode: "FLT-2026",
    projectManager: "Sarah Jenkins, PMP",
    sponsor: "David Harrison, EVP Digital Channels",
    startDate: "2026-03-01",
    targetEndDate: "2026-10-31",
    baselineBudget: 150000,
    authorizedBudget: 150000,
    status: "Active",
    color: "#818CF8", // Indigo / purple like ClickUp
    description: "Next-gen cross-platform mobile trading and customer digital experience app.",
  },
  {
    id: "proj-angular",
    name: "Angular Project",
    projectCode: "ANG-2026",
    projectManager: "Marcus Vance",
    sponsor: "Elena Rostova",
    startDate: "2026-03-01",
    targetEndDate: "2026-11-30",
    baselineBudget: 180000,
    authorizedBudget: 180000,
    status: "Active",
    color: "#EC4899", // Rose / pink
    description: "High-throughput treasury management and back-office settlement portal.",
  },
  {
    id: "proj-001",
    name: "OmniChannel Banking Platform Modernization",
    projectCode: "OBP-2026",
    projectManager: "Sarah Jenkins, PMP",
    sponsor: "David Harrison, EVP Digital Channels",
    startDate: "2026-02-01",
    targetEndDate: "2026-11-30",
    baselineBudget: 380000,
    authorizedBudget: 380000,
    status: "Active",
    color: "#38BDF8", // Sky blue
    description: "Core banking platform modernization with ISO-20022 message streaming.",
  },
];

const STORAGE_KEY = "pmi_projects_registry_v1";
const ACTIVE_PROJECT_KEY = "pmi_active_project_id_v1";

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed loading projects from storage", err);
  }
  return DEFAULT_PROJECTS;
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error("Failed saving projects to storage", err);
  }
}

export function loadActiveProjectId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved) return saved;
  } catch (err) {
    // ignore
  }
  return "all"; // Default to "all" (Portfolio View) or "proj-flutter"
}

export function saveActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch (err) {
    // ignore
  }
}
