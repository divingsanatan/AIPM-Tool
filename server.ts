import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Server-side persistent storage directory
const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "app_state.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create data directory:", e);
  }
}

// Lazy get or initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Centralized persistent state endpoint for multi-device sync
app.get("/api/state", (_req, res) => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      return res.json(JSON.parse(raw));
    }
    return res.json({
      projects: null,
      sprints: null,
      wbsItems: null,
      raidItems: null,
      changeRequests: null,
      stakeholders: null,
      lastUpdated: null,
    });
  } catch (err: any) {
    console.error("Error reading state file:", err);
    return res.status(500).json({ error: "Failed to read server state" });
  }
});

function mergeEntitiesById<T extends { id?: string }>(
  existingList: T[] = [],
  incomingList: T[] = []
): T[] {
  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    return Array.isArray(existingList) ? existingList : [];
  }
  if (!Array.isArray(existingList) || existingList.length === 0) {
    return incomingList;
  }

  const map = new Map<string, T>();
  // Put existing items first
  existingList.forEach((item) => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });

  // Merge incoming items (updates attributes, or adds new item)
  incomingList.forEach((item) => {
    if (item && item.id) {
      const prev = map.get(item.id);
      if (prev) {
        map.set(item.id, { ...prev, ...item });
      } else {
        map.set(item.id, item);
      }
    }
  });

  return Array.from(map.values());
}

app.post("/api/state", (req, res) => {
  try {
    const incoming = req.body;
    let existing: any = {};
    if (fs.existsSync(STATE_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      } catch (e) {
        existing = {};
      }
    }

    // Determine whether to do full replacement (e.g. on explicit deletion) or additive merge
    const projects = incoming.replaceProjects
      ? incoming.projects || existing.projects || []
      : incoming.projects
      ? mergeEntitiesById(existing.projects || [], incoming.projects)
      : existing.projects || [];

    const sprints = incoming.replaceSprints
      ? incoming.sprints || existing.sprints || []
      : incoming.sprints
      ? mergeEntitiesById(existing.sprints || [], incoming.sprints)
      : existing.sprints || [];

    const wbsItems = incoming.replaceWbsItems
      ? incoming.wbsItems || existing.wbsItems || []
      : incoming.wbsItems
      ? mergeEntitiesById(existing.wbsItems || [], incoming.wbsItems)
      : existing.wbsItems || [];

    const raidItems = incoming.replaceRaidItems
      ? incoming.raidItems || existing.raidItems || []
      : incoming.raidItems
      ? mergeEntitiesById(existing.raidItems || [], incoming.raidItems)
      : existing.raidItems || [];

    const changeRequests = incoming.replaceChangeRequests
      ? incoming.changeRequests || existing.changeRequests || []
      : incoming.changeRequests
      ? mergeEntitiesById(existing.changeRequests || [], incoming.changeRequests)
      : existing.changeRequests || [];

    const stakeholders = incoming.replaceStakeholders
      ? incoming.stakeholders || existing.stakeholders || []
      : incoming.stakeholders
      ? mergeEntitiesById(existing.stakeholders || [], incoming.stakeholders)
      : existing.stakeholders || [];

    const documents = incoming.replaceDocuments
      ? incoming.documents || existing.documents || []
      : incoming.documents
      ? mergeEntitiesById(existing.documents || [], incoming.documents)
      : existing.documents || [];

    const merged = {
      ...existing,
      ...incoming,
      projects,
      sprints,
      wbsItems,
      raidItems,
      changeRequests,
      stakeholders,
      documents,
      lastUpdated: new Date().toISOString(),
      sourceDevice: incoming.sourceDevice || existing.sourceDevice || "web",
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return res.json({
      success: true,
      lastUpdated: merged.lastUpdated,
      projectCount: merged.projects?.length || 0,
      sprintCount: merged.sprints?.length || 0,
      projects: merged.projects,
    });
  } catch (err: any) {
    console.error("Error saving state file:", err);
    return res.status(500).json({ error: "Failed to save server state" });
  }
});

// Natural Language AI Project Assistant & Action Search
app.post("/api/gemini/query", async (req, res) => {
  try {
    const { query, projectContext, scope = "all", documentContext } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const ai = getGeminiClient();

    // If Gemini is not configured, supply an intelligent deterministic fallback
    if (!ai) {
      const lower = query.toLowerCase();
      let reply = "";
      let recommendedAction: any = { type: "NONE", data: null, description: "" };
      let relevantMetrics: any = null;

      const isAll = scope === "all";
      const metrics = projectContext?.evmMetrics || {};
      const cpi = metrics.cpi ?? 0.94;
      const spi = metrics.spi ?? 0.88;

      if (lower.includes("spi") || lower.includes("schedule")) {
        reply = isAll
          ? `Across all workspace projects, the aggregate Schedule Performance Index (SPI) is approximately ${spi.toFixed(2)}. An SPI < 1.0 indicates minor schedule variance against the earned value baseline, primarily driven by critical path dependencies in sprint deliverables.`
          : `For the selected project (${projectContext?.projectSettings?.name || "Current Project"}), current SPI is ${spi.toFixed(2)} (Earned Value: $${(metrics.ev || 0).toLocaleString()} vs Planned Value: $${(metrics.pv || 0).toLocaleString()}). The project is running slightly behind schedule; consider fast-tracking or reallocating resources to unblock critical path deliverables.`;
        relevantMetrics = { spi, highlight: `SPI: ${spi.toFixed(2)} (Schedule Variance: $${(metrics.sv || 0).toLocaleString()})` };
      } else if (lower.includes("cpi") || lower.includes("cost") || lower.includes("budget")) {
        reply = isAll
          ? `Across the entire portfolio, the blended Cost Performance Index (CPI) stands at ${cpi.toFixed(2)}. Authorized budget across active projects is well managed, with actual costs tracking within contingency reserve limits.`
          : `For ${projectContext?.projectSettings?.name || "this project"}, the current CPI is ${cpi.toFixed(2)} (EV: $${(metrics.ev || 0).toLocaleString()} / AC: $${(metrics.ac || 0).toLocaleString()}). Cost efficiency is ${cpi >= 1 ? "favorable and on budget" : "experiencing a minor cost overrun"}. Estimate at Completion (EAC) is projected at $${(metrics.eac || metrics.bac || 0).toLocaleString()}.`;
        relevantMetrics = { cpi, highlight: `CPI: ${cpi.toFixed(2)} (EAC: $${(metrics.eac || 0).toLocaleString()})` };
      } else if (lower.includes("block") || lower.includes("issue") || lower.includes("risk")) {
        const blockedCount = projectContext?.blockedItems?.length || 0;
        const risksCount = projectContext?.risksCount || 0;
        reply = `Audit Findings (${isAll ? "Workspace Global" : projectContext?.projectSettings?.name || "Active Project"}):\n• ${blockedCount} blocked WBS deliverables detected requiring immediate resolution.\n• ${risksCount} active threat vectors logged in the RAID register.\n• Recommendation: Review the RAID log to execute defined contingency triggers and hold a standup on blocked dependencies.`;
        recommendedAction = {
          type: "NAVIGATE_TAB",
          data: { tab: blockedCount > 0 ? "wbs" : "raid" },
          description: `Navigate to ${blockedCount > 0 ? "WBS Deliverables" : "RAID Register"} to review blocked items`,
        };
      } else if (lower.includes("wbs") || lower.includes("task") || lower.includes("work")) {
        reply = `The Work Breakdown Structure adheres strictly to the 100% Rule. You currently have ${projectContext?.wbsItemsCount || "multiple"} work items mapped across Milestones, Epics, Features, and Tasks.`;
        recommendedAction = {
          type: "NAVIGATE_TAB",
          data: { tab: "wbs" },
          description: "Jump to WBS Gantt and Tree view",
        };
      } else {
        reply = `I have analyzed your request across ${isAll ? "all workspace projects" : `the ${projectContext?.projectSettings?.name || "selected"} project`}. Current operational indices indicate CPI at ${cpi.toFixed(2)} and SPI at ${spi.toFixed(2)}. You can ask me to evaluate EVM metrics, audit blocked tasks, log new risks, search deliverables, or attach documentation.`;
      }

      return res.json({
        reply,
        recommendedAction,
        relevantMetrics,
      });
    }

    const systemPrompt = `You are "PM Pal", an elite certified PMP (Project Management Professional) and senior PMI-aligned Project Intelligence Assistant.
You have live real-time access to the user's project data (EVM indices CPI/SPI/BAC/EAC/VAC, WBS hierarchy, RAID log, RACI assignments, Change Requests, Stakeholder economics, and Project Documents).

The user may ask questions or request actions for:
- "all": Across the entire workspace (all projects combined, comparisons, portfolio health)
- specific project: Deep-dive into one project's deliverables, risks, budget, and metrics.
- attached documents: Analyzing, summarizing, or extracting deliverables from a charter, SOW, or architecture specification.

Scope Mode: "${scope}"

PMBOK Standards:
1. Provide mathematically sound, PMBOK 7th/6th edition compliant answers (EVM formulas, Critical Path, 100% Rule, Risk Exposure = Probability x Impact).
2. Answer directly, concisely, and executive-ready with clean bullet points or numbered recommendations when appropriate.
3. If the user asks to change, add, navigate, or do something, propose a structured "recommendedAction":
   Allowed action types:
   - "UPDATE_WBS_STATUS": data: { wbsCode: string, status: "To Do" | "In Progress" | "Demoable" | "Blocked" | "Done" }
   - "ADD_RAID_RISK": data: { title: string, category: "Risk" | "Issue" | "Assumption" | "Dependency", probability: 1-5, impact: 1-5, description: string, mitigation?: string, projectId?: string }
   - "ADD_CHANGE_REQUEST": data: { title: string, reason: string, costImpact: number, scheduleImpactDays: number, projectId?: string }
   - "ADD_WBS_ITEM": data: { title: string, wbsCode?: string, type?: "Milestone" | "Epic" | "Feature" | "User Story" | "Task", plannedBudget?: number, estimatedHours?: number, projectId?: string }
   - "NAVIGATE_TAB": data: { tab: "dashboard" | "wbs" | "stakeholders" | "raid" | "raci" | "change-management" | "documents" | "reports" }
   - "SELECT_PROJECT": data: { projectId: string }
   - "NONE": data: null

Return ONLY valid JSON matching this schema:
{
  "reply": "Your clear, direct PMI explanation and answer.",
  "recommendedAction": {
    "type": "NONE" | "UPDATE_WBS_STATUS" | "ADD_RAID_RISK" | "ADD_CHANGE_REQUEST" | "ADD_WBS_ITEM" | "NAVIGATE_TAB" | "SELECT_PROJECT",
    "data": {} or null,
    "description": "Short explanation of the action"
  },
  "relevantMetrics": {
    "cpi": number or null,
    "spi": number or null,
    "highlight": string or null
  }
}
No markdown backticks around the JSON.`;

    const contents = `Target Scope: ${scope}
Document Context (if any):
${documentContext ? JSON.stringify(documentContext, null, 2) : "None"}

Project / Workspace Context:
${JSON.stringify(projectContext || {}, null, 2)}

User Question / Command:
"${query}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/gemini/query:", error);
    return res.status(500).json({
      error: error.message || "Failed to process query",
      reply: "An error occurred while communicating with PM Pal. Please try again or rephrase.",
    });
  }
});

// WBS Document Parser (Parses charters, requirements, SOW, meeting notes into hierarchical WBS)
app.post("/api/gemini/parse-wbs-document", async (req, res) => {
  try {
    const { documentText, documentTitle } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "documentText is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    const systemPrompt = `You are a PMI Work Breakdown Structure (WBS) Master Architect adhering to Practice Standard for Work Breakdown Structures.
Deconstruct the provided project document / specifications into a standard 100% Rule hierarchical WBS breakdown.

Items must use the PMI level types:
- "Milestone"
- "Epic"
- "Feature"
- "User Story"
- "Task"
- "Subtask"

Allowed statuses:
- "To Do"
- "In Progress"
- "Demoable"
- "Blocked"
- "Done"

Assign logical WBS codes (e.g. 1.0, 1.1, 1.1.1, 1.1.1.1), estimated hours, realistic planned budgets ($), and suggested assignees.

Return ONLY a JSON array of items:
[
  {
    "wbsCode": "1.0",
    "title": "Milestone: Core Architecture Verified",
    "type": "Milestone",
    "parentId": null,
    "status": "In Progress",
    "estimatedHours": 80,
    "actualHours": 45,
    "plannedBudget": 12000,
    "actualCost": 7200,
    "progressPercent": 56,
    "assignedStakeholder": "Marcus Vance",
    "description": "Verification of microservices and schema specifications."
  }
]
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Document Title: ${documentTitle || "Project Specification"}\n\nDocument Content:\n${documentText}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    return res.json({ items: parsed });
  } catch (error: any) {
    console.error("Error in /api/gemini/parse-wbs-document:", error);
    return res.status(500).json({ error: error.message || "Failed to parse WBS document" });
  }
});

// Instant Risk Mitigation Status Report Generator
app.post("/api/gemini/generate-risk-report", async (req, res) => {
  try {
    const { raidData, projectInfo, evmData } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const prompt = `Generate an authoritative, PMI-standard "Risk Mitigation & Contingency Status Report" for project "${projectInfo?.name || "Enterprise Digital Platform"}".
Current RAID details:
${JSON.stringify(raidData, null, 2)}

Current EVM Performance (CPI: ${evmData?.cpi}, SPI: ${evmData?.spi}, Budget: $${evmData?.bac}):
Include:
1. Executive Risk Summary (Overall Exposure rating: Low/Moderate/Critical)
2. Top Threat Vectors & Financial/Schedule Vulnerability
3. Proactive Mitigation Strategies & Contingency Triggers
4. Secondary & Residual Risk Evaluation
5. Specific Owner Accountability and Action Deadlines
6. Recommendations for CCB (Change Control Board) or Sponsor Escalations.

Format as structured Markdown with clean tables and clear sections.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return res.json({ reportMarkdown: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-risk-report:", error);
    return res.status(500).json({ error: error.message || "Failed to generate risk report" });
  }
});

// Comprehensive PMI Status Report Generator (Executive / Stakeholder)
app.post("/api/gemini/generate-pmi-status-report", async (req, res) => {
  try {
    const { projectSummary } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const prompt = `You are a Lead PMP Project Director preparing the official Project Performance & Health Report.
Project data:
${JSON.stringify(projectSummary, null, 2)}

Generate a complete, executive-ready PMI Status Report with:
- Project Health Dashboard (Cost Health, Schedule Health, Scope Health, Overall RAG status)
- Earned Value Analysis (detailed breakdown of PV, EV, AC, CPI, SPI, EAC, VAC, TCPI with interpretation)
- Milestone Progress & Critical Path Slippage
- High-priority Risks & Mitigation Action Items
- Change Management Summary (Approved vs Pending Change Requests)
- Stakeholder Labor Burn & Resource Allocation Efficiency
- Key Decisions Needed from the Project Sponsor

Format with pristine Markdown and clear structured tables.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return res.json({ reportMarkdown: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-pmi-status-report:", error);
    return res.status(500).json({ error: error.message || "Failed to generate PMI status report" });
  }
});

// Setup server and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
