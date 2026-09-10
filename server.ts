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

    const merged = {
      ...existing,
      ...incoming,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return res.json({
      success: true,
      lastUpdated: merged.lastUpdated,
      projectCount: merged.projects?.length || 0,
      sprintCount: merged.sprints?.length || 0,
    });
  } catch (err: any) {
    console.error("Error saving state file:", err);
    return res.status(500).json({ error: "Failed to save server state" });
  }
});

// Natural Language AI Project Assistant & Action Search
app.post("/api/gemini/query", async (req, res) => {
  try {
    const { query, projectContext } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured.",
        reply: "Gemini API key is not configured in environment. Please set GEMINI_API_KEY in the Secrets panel.",
      });
    }

    const systemPrompt = `You are a certified PMP (Project Management Professional) and senior PMI-aligned Project Intelligence Assistant.
You have access to the user's live project dataset which follows PMBOK 7th/6th edition standards (EVM metrics, WBS hierarchy, RAID log, RACI matrix, Change Management log, and Stakeholder hourly cost economics).

When answering the user's questions:
1. Provide mathematically sound and PMBOK-compliant insights (CPI = EV/AC, SPI = EV/PV, EAC, CV, SV, Critical Path analysis, Risk Exposure = Probability x Impact).
2. Directly answer their question in an executive, clear, actionable tone.
3. If the user asks to update, modify, or filter the project (e.g. "Mark task WBS-1.2 Done", "Add high risk for latency", "Filter to blocked tasks", "Add change request for cloud migration"), you can propose an action object in your JSON response alongside your answer.

Return ONLY a JSON object with this exact structure:
{
  "reply": "Your clear, direct PMI explanation and answer with bullet points if helpful.",
  "recommendedAction": {
    "type": "NONE" | "UPDATE_WBS_STATUS" | "ADD_RISK" | "ADD_CHANGE_REQUEST" | "SET_FILTER",
    "payload": {} or null,
    "description": "Brief summary of the proposed action executed or suggested"
  },
  "relevantMetrics": {
    "cpi": number or null,
    "spi": number or null,
    "highlight": string or null
  }
}
Always adhere strictly to JSON without markdown fences.`;

    const contents = `Project Context:
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
      reply: "An error occurred while communicating with Gemini. Please verify your query or try again.",
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
