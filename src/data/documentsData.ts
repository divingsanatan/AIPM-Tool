import { ProjectDocument } from "../types";
import { initialDocuments } from "./seedData";

const DOCUMENTS_STORAGE_KEY = "pmi_project_documents_v2";

export function loadDocuments(): ProjectDocument[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure legacy seed documents doc-1 and doc-2 are always tied to the seed demo project
        return parsed.map((doc: ProjectDocument) => {
          if (doc.id === "doc-1" || doc.id === "doc-2") {
            return {
              ...doc,
              projectId: doc.projectId || "proj-001",
              projectIds: doc.projectIds || ["proj-001", "proj-flutter"],
              projectName: doc.projectName || "OmniChannel Banking Platform Modernization",
            };
          }
          return doc;
        });
      }
    }
  } catch (err) {
    console.warn("Failed to load documents from localStorage:", err);
  }
  return initialDocuments;
}

export function saveDocuments(docs: ProjectDocument[]): void {
  try {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.warn("Failed to save documents to localStorage:", err);
  }
}
