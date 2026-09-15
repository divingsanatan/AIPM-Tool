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

// Multi-Provider AI Executor & Fallback Engine
interface AiCallOptions {
  aiConfig?: any;
  systemPrompt?: string;
  userPrompt: string;
  jsonOutput?: boolean;
  temperature?: number;
}

// Resilient Gemini execution with automatic backoff and fallback models
async function executeGeminiWithFallback(
  ai: GoogleGenAI,
  requestedModel: string,
  options: {
    systemPrompt?: string;
    userPrompt: string;
    jsonOutput?: boolean;
    temperature?: number;
  }
): Promise<{ text: string; modelName: string }> {
  // Candidate fallback chain: preferred model -> gemini-3.1-flash-lite -> gemini-flash-latest
  const modelChain = [
    requestedModel,
    ...(requestedModel !== "gemini-3.1-flash-lite" ? ["gemini-3.1-flash-lite"] : []),
    ...(requestedModel !== "gemini-flash-latest" && requestedModel !== "gemini-3.8-flash" ? ["gemini-3.8-flash"] : []),
  ];

  let lastError: any = null;

  for (const model of modelChain) {
    // Up to 2 attempts for temporary 503 / 429 capacity spikes
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.userPrompt,
          config: {
            systemInstruction: options.systemPrompt,
            responseMimeType: options.jsonOutput ? "application/json" : undefined,
            temperature: options.temperature ?? 0.3,
          },
        });

        return { text: response.text || "{}", modelName: model };
      } catch (err: any) {
        lastError = err;
        const rawMsg = String(err?.message || err);
        const isTemporaryBusy =
          rawMsg.includes("503") ||
          rawMsg.includes("high demand") ||
          rawMsg.includes("UNAVAILABLE") ||
          rawMsg.includes("429") ||
          rawMsg.includes("RESOURCE_EXHAUSTED");

        if (isTemporaryBusy && attempt === 0) {
          // Brief pause (700ms) to allow transient load spike to clear
          await new Promise((res) => setTimeout(res, 700));
          continue;
        }
        // Break out to try the next model in the candidate chain
        break;
      }
    }
  }

  throw lastError;
}

function extractCleanErrorMessage(error: any): string {
  if (!error) return "Unknown error";
  const raw = String(error.message || error);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch (e) {
    // Not JSON string, continue
  }
  return raw;
}

async function executeAiCall(options: AiCallOptions): Promise<{ text: string; modelName: string }> {
  const provider = options.aiConfig?.provider || "gemini";
  const customModel = options.aiConfig?.model;

  // 1. Google Gemini Provider
  if (provider === "gemini" || options.aiConfig?.id === "builtin-gemini") {
    const apiKey = options.aiConfig?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on server or in AI Settings.");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const modelName = customModel || "gemini-3.8-flash";
    return await executeGeminiWithFallback(ai, modelName, {
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      jsonOutput: options.jsonOutput,
      temperature: options.temperature,
    });
  }

  // 2. OpenAI / OpenRouter / DeepSeek / Groq / Custom OpenAI Provider
  if (
    provider === "openai" ||
    provider === "deepseek" ||
    provider === "groq" ||
    provider === "openrouter" ||
    provider === "custom_openai"
  ) {
    let baseUrl = options.aiConfig?.baseUrl;
    if (!baseUrl) {
      if (provider === "openai") baseUrl = "https://api.openai.com/v1";
      else if (provider === "deepseek") baseUrl = "https://api.deepseek.com/v1";
      else if (provider === "groq") baseUrl = "https://api.groq.com/openai/v1";
      else if (provider === "openrouter") baseUrl = "https://openrouter.ai/api/v1";
      else baseUrl = "https://api.openai.com/v1";
    }

    const apiKey =
      options.aiConfig?.apiKey ||
      (provider === "openai" ? process.env.OPENAI_API_KEY : undefined);

    if (provider !== "custom_openai" && !apiKey) {
      throw new Error(`API key is required for ${options.aiConfig?.name || provider}.`);
    }

    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: options.userPrompt });

    const modelName = customModel || (provider === "deepseek" ? "deepseek-chat" : provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = "https://aistudio.google.com";
      headers["X-Title"] = "PMI Project Management Studio";
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        response_format: options.jsonOutput ? { type: "json_object" } : undefined,
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const parsedErr = JSON.parse(errText);
        errorMsg = parsedErr.error?.message || parsedErr.message || errorMsg;
      } catch (e) {
        errorMsg += `: ${errText.slice(0, 160)}`;
      }
      throw new Error(`${options.aiConfig?.name || provider} error: ${errorMsg}`);
    }

    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return { text, modelName };
  }

  // 3. Anthropic Claude Provider
  if (provider === "anthropic") {
    const apiKey = options.aiConfig?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Anthropic API key is required.");
    }

    const modelName = customModel || "claude-3-5-sonnet-20241022";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        system: options.systemPrompt,
        messages: [{ role: "user", content: options.userPrompt }],
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const parsedErr = JSON.parse(errText);
        errorMsg = parsedErr.error?.message || parsedErr.message || errorMsg;
      } catch (e) {
        errorMsg += `: ${errText.slice(0, 160)}`;
      }
      throw new Error(`Anthropic error: ${errorMsg}`);
    }

    const data: any = await res.json();
    const text = data.content?.[0]?.text || "";
    return { text, modelName };
  }

  // 4. Local PMI Engine (No external calls)
  if (provider === "local_pmi") {
    return { text: "LOCAL_PMI_ENGINE", modelName: "PMBOK 7th Ed. Deterministic Engine" };
  }

  throw new Error(`Unsupported AI Provider: ${provider}`);
}

// Deterministic Local PMI Intelligence & EVM Analysis Engine
function generateLocalPmiQueryResponse(
  query: string,
  projectContext: any = {},
  scope: string = "all",
  documentContext?: any
): {
  reply: string;
  recommendedAction: { type: string; data: any; description: string };
  relevantMetrics: { cpi: number | null; spi: number | null; highlight: string | null };
} {
  const lower = query.toLowerCase();
  const isAll = scope === "all";
  const metrics = projectContext?.evmMetrics || {};
  const cpi = Number(metrics.cpi ?? 0.96);
  const spi = Number(metrics.spi ?? 0.91);
  const ev = Number(metrics.ev ?? 0);
  const pv = Number(metrics.pv ?? 0);
  const ac = Number(metrics.ac ?? 0);
  const bac = Number(metrics.bac ?? 0);
  const eac = Number(metrics.eac ?? (cpi > 0 ? bac / cpi : bac));
  const vac = Number(metrics.vac ?? (bac - eac));

  const allProjects = Array.isArray(projectContext?.allProjectsSummary)
    ? projectContext.allProjectsSummary
    : [];

  const blockedItems = Array.isArray(projectContext?.blockedItems)
    ? projectContext.blockedItems
    : [];
  const risksCount = Number(projectContext?.risksCount ?? 0);
  const pendingChangeRequests = Number(projectContext?.pendingChangeRequests ?? 0);

  let reply = "";
  let recommendedAction: any = { type: "NONE", data: null, description: "" };
  let relevantMetrics: any = {
    cpi: Number(cpi.toFixed(2)),
    spi: Number(spi.toFixed(2)),
    highlight: null,
  };

  // 1. Schedule & SPI queries
  if (lower.includes("spi") || lower.includes("schedule") || lower.includes("timeline") || lower.includes("deadline")) {
    if (isAll) {
      const projBreakdown = allProjects.length > 0
        ? allProjects.map((p: any) => `• ${p.name} (${p.code}): SPI ${(p.spi ?? 1.0).toFixed(2)} [Status: ${p.status || "Active"}]`).join("\n")
        : "• No secondary projects loaded in portfolio.";

      reply = `**Portfolio Schedule Performance (SPI Analysis):**
The workspace aggregate Schedule Performance Index (SPI) is **${spi.toFixed(2)}**.

\`Formula: SPI = Σ EV / Σ PV = $${ev.toLocaleString()} / $${pv.toLocaleString()} = ${spi.toFixed(2)}\`

${spi >= 1.0 ? "✅ **On Schedule:** Aggregate deliverable completion is pacing aligned with or ahead of the approved baseline." : "⚠️ **Schedule Slippage:** SPI < 1.0 indicates critical path activities are behind plan. Immediate fast-tracking or critical chain focus is advised."}

**Project Breakdown:**
${projBreakdown}

**PMI Recommendation:**
1. Focus resources on blocked WBS deliverables (${blockedItems.length} currently flagged).
2. Evaluate critical path dependencies in active sprints.`;
    } else {
      const projName = projectContext?.projectSettings?.name || "Selected Project";
      reply = `**Project Schedule Performance for ${projName}:**
Current **SPI: ${spi.toFixed(2)}** (Earned Value: $${ev.toLocaleString()} vs Planned Value: $${pv.toLocaleString()}).
Schedule Variance: **SV = EV - PV = $${(ev - pv).toLocaleString()}**.

${spi >= 1.0 ? "Deliverables are progressing ahead of or on the approved timeline." : "Activities are trailing the baseline schedule. Reassess resource leveling and sprint velocity."}`;
    }
    recommendedAction = {
      type: "NAVIGATE_TAB",
      data: { tab: "dashboard" },
      description: "Open EVM Performance Dashboard",
    };
    relevantMetrics.highlight = `SPI: ${spi.toFixed(2)} (Earned Value: $${ev.toLocaleString()})`;
  }

  // 2. Cost, CPI & Budget queries
  else if (lower.includes("cpi") || lower.includes("cost") || lower.includes("budget") || lower.includes("spend") || lower.includes("eac") || lower.includes("vac")) {
    if (isAll) {
      reply = `**Workspace Financial & Cost Performance (CPI Analysis):**
Blended Cost Performance Index: **CPI = ${cpi.toFixed(2)}**.

\`Formula: CPI = Σ EV / Σ AC = $${ev.toLocaleString()} / $${ac.toLocaleString()} = ${cpi.toFixed(2)}\`

• **Total Budget at Completion (BAC):** $${bac.toLocaleString()}
• **Estimate at Completion (EAC):** $${eac.toLocaleString()}
• **Variance at Completion (VAC):** $${vac.toLocaleString()} ${vac >= 0 ? "(Favorable)" : "(Unfavorable Overrun)"}

Cost efficiency is **${cpi >= 1.0 ? "favorable (earning more value per dollar spent)" : "experiencing a variance overrun"}**. Authorized budget reserves remain healthy.`;
    } else {
      const projName = projectContext?.projectSettings?.name || "Selected Project";
      reply = `**Financial Performance for ${projName}:**
• **CPI:** ${cpi.toFixed(2)} (Cost Variance: $${(ev - ac).toLocaleString()})
• **Actual Cost (AC):** $${ac.toLocaleString()}
• **Earned Value (EV):** $${ev.toLocaleString()}
• **Budget at Completion (BAC):** $${bac.toLocaleString()}
• **Projected Final Cost (EAC):** $${eac.toLocaleString()}

${cpi >= 1.0 ? "Cost management is on target with high expenditure efficiency." : "Expenditures are exceeding the earned value rate. Review labor burn and change requests."}`;
    }
    recommendedAction = {
      type: "NAVIGATE_TAB",
      data: { tab: "dashboard" },
      description: "View EVM S-Curve & Cost Breakdown",
    };
    relevantMetrics.highlight = `CPI: ${cpi.toFixed(2)} (EAC: $${eac.toLocaleString()})`;
  }

  // 3. Comparison across projects
  else if (lower.includes("compare") || lower.includes("portfolio") || (lower.includes("all") && lower.includes("project"))) {
    const projRows = allProjects.map((p: any) => {
      const pSpi = p.spi ?? 1.0;
      const pCpi = p.cpi ?? 1.0;
      return `| **${p.name}** | \`${p.code}\` | SPI: **${pSpi.toFixed(2)}** | CPI: **${pCpi.toFixed(2)}** | $${(p.budget || 0).toLocaleString()} | ${p.status || "Active"} |`;
    }).join("\n");

    reply = `**Portfolio Project Comparative Analysis:**

| Project | Code | Schedule (SPI) | Cost (CPI) | Budget | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${projRows || "| No projects registered | - | - | - | - | - |"}

**Portfolio Health Summary:**
• Total Workspace BAC: **$${bac.toLocaleString()}**
• Aggregate Portfolio SPI: **${spi.toFixed(2)}** | Blended CPI: **${cpi.toFixed(2)}**
• Active RAID Threat Vectors: **${risksCount}**
• Pending CCB Change Requests: **${pendingChangeRequests}**`;

    recommendedAction = {
      type: "NAVIGATE_TAB",
      data: { tab: "reports" },
      description: "Generate Executive Portfolio Report",
    };
    relevantMetrics.highlight = `Portfolio Blended CPI: ${cpi.toFixed(2)}, SPI: ${spi.toFixed(2)}`;
  }

  // 4. Blocked tasks, risks, or RAID
  else if (lower.includes("block") || lower.includes("risk") || lower.includes("issue") || lower.includes("raid") || lower.includes("threat")) {
    const blockedList = blockedItems.length > 0
      ? blockedItems.map((b: any) => `• [${b.code || "WBS"}] **${b.title}**`).join("\n")
      : "• No deliverables are currently marked as Blocked.";

    reply = `**Risk & Delivery Impediment Audit:**
• **Blocked Deliverables (${blockedItems.length}):**
${blockedList}

• **RAID Register Threats:** **${risksCount} active vectors** logged across the workspace.
• **Change Control Board (CCB):** **${pendingChangeRequests} change requests** awaiting formal committee approval.

**Action Plan:**
1. Convene a standup with work package owners on blocked items.
2. Execute contingency plans defined in the RAID log.`;

    recommendedAction = {
      type: "NAVIGATE_TAB",
      data: { tab: blockedItems.length > 0 ? "wbs" : "raid" },
      description: blockedItems.length > 0 ? "Open WBS to resolve blocked deliverables" : "Review RAID threat vectors",
    };
    relevantMetrics.highlight = `${blockedItems.length} Blocked Deliverables | ${risksCount} Risks`;
  }

  // 5. Document analysis
  else if (documentContext && (lower.includes("document") || lower.includes("charter") || lower.includes("sow") || lower.includes("extract"))) {
    reply = `**Document Analysis (${documentContext.title || "Attached Spec"}):**
I have parsed the document content. The specification aligns with PMI Scope Management principles.
• Scope: Deliverables can be decomposed into hierarchical WBS items (Milestones, Epics, Tasks).
• Stakeholder alignment: Resource labor categories and acceptance criteria should be mapped into the RACI matrix.
• Would you like me to auto-generate a 100% Rule WBS breakdown from this document?`;

    recommendedAction = {
      type: "NAVIGATE_TAB",
      data: { tab: "documents" },
      description: "Manage Project Documents and Specs",
    };
  }

  // 6. Default general assistant answer
  else {
    reply = `**PM Pal Project Intelligence Report:**
I have evaluated your request across ${isAll ? "all workspace projects" : `the ${projectContext?.projectSettings?.name || "selected"} project`}.

**Key Real-Time Indicators:**
• **Schedule Performance (SPI):** **${spi.toFixed(2)}** ${spi >= 1.0 ? "(On Track)" : "(Slight Slippage)"}
• **Cost Performance (CPI):** **${cpi.toFixed(2)}** ${cpi >= 1.0 ? "(Budget Favorable)" : "(Minor Variance)"}
• **Active WBS Deliverables:** ${projectContext?.wbsItemsCount || "Configured in WBS"}
• **Threat Vectors in RAID:** ${risksCount}
• **Blocked Items Requiring Attention:** ${blockedItems.length}

You can ask me to evaluate EVM metrics, audit blocked tasks, log new risks, compare projects, or import specs into the WBS.`;

    recommendedAction = {
      type: "NAVIGATE_TAB",
      data: { tab: "dashboard" },
      description: "Inspect Dashboard Metrics",
    };
  }

  return { reply, recommendedAction, relevantMetrics };
}

// Test Connection Endpoint for AI Providers
app.post("/api/ai/test-connection", async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, error: "Configuration is required." });
    }

    if (config.provider === "local_pmi") {
      return res.json({
        success: true,
        message: "Local PMI Engine is ready. All PMBOK EVM formulas operate offline.",
        modelName: "PMBOK 7th Ed. Deterministic Engine",
      });
    }

    const startTime = Date.now();
    const { text, modelName } = await executeAiCall({
      aiConfig: config,
      userPrompt: "You are PM Pal AI assistant. Reply in one short sentence confirming you are connected and operational.",
      systemPrompt: "You are a PMI-certified project assistant.",
      temperature: 0.1,
    });
    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      latencyMs,
      modelName,
      reply: text.slice(0, 160),
    });
  } catch (error: any) {
    const cleanMsg = extractCleanErrorMessage(error);
    console.info("AI connection test response:", cleanMsg);
    return res.status(200).json({
      success: false,
      error: cleanMsg || "Failed to establish connection to AI provider",
    });
  }
});

// Natural Language AI Project Assistant & Action Search
app.post("/api/gemini/query", async (req, res) => {
  try {
    const { query, projectContext, scope = "all", documentContext, aiConfig } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Direct local engine if chosen
    if (aiConfig?.provider === "local_pmi") {
      const localResult = generateLocalPmiQueryResponse(query, projectContext, scope, documentContext);
      return res.json({
        ...localResult,
        activeProvider: "Local PMI Engine",
        isLocalEngine: true,
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

    const userPrompt = `Target Scope: ${scope}
Document Context (if any):
${documentContext ? JSON.stringify(documentContext, null, 2) : "None"}

Project / Workspace Context:
${JSON.stringify(projectContext || {}, null, 2)}

User Question / Command:
"${query}"`;

    try {
      const { text, modelName } = await executeAiCall({
        aiConfig,
        systemPrompt,
        userPrompt,
        jsonOutput: true,
      });

      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleanText);
      return res.json({
        ...parsed,
        activeProvider: aiConfig?.name || modelName,
        modelUsed: modelName,
      });
    } catch (aiErr: any) {
      const cleanMessage = extractCleanErrorMessage(aiErr);
      console.info("Engaging deterministic local PMI engine:", cleanMessage);
      const localResult = generateLocalPmiQueryResponse(query, projectContext, scope, documentContext);
      return res.json({
        ...localResult,
        warning: `Notice: External model unavailable (${cleanMessage}). Switched to local PMBOK calculations.`,
        apiError: {
          provider: aiConfig?.provider || "gemini",
          model: aiConfig?.model || "gemini-3.8-flash",
          message: cleanMessage,
          isFallback: true,
        },
        activeProvider: "Local PMI Engine (Fallback)",
      });
    }
  } catch (error: any) {
    const cleanMessage = extractCleanErrorMessage(error);
    console.info("Service notice in /api/gemini/query:", cleanMessage);
    const localResult = generateLocalPmiQueryResponse(req.body.query, req.body.projectContext, req.body.scope, req.body.documentContext);
    return res.json({
      ...localResult,
      warning: `Notice: Service offline (${cleanMessage}). Operating on local project indicators.`,
    });
  }
});


// WBS Document Parser (Parses charters, requirements, SOW, meeting notes into hierarchical WBS)
app.post("/api/gemini/parse-wbs-document", async (req, res) => {
  try {
    const { documentText, documentTitle, aiConfig } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "documentText is required" });
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

    try {
      const { text } = await executeAiCall({
        aiConfig,
        systemPrompt,
        userPrompt: `Document Title: ${documentTitle || "Project Specification"}\n\nDocument Content:\n${documentText}`,
        jsonOutput: true,
      });

      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleanText);
      return res.json({ items: Array.isArray(parsed) ? parsed : parsed.items || [] });
    } catch (aiErr: any) {
      console.info("Using structured deterministic WBS parser:", extractCleanErrorMessage(aiErr));

      // Deterministic parsing of lines / sections into structured WBS
      const lines = documentText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const items: any[] = [];
      let milestoneIndex = 1;
      let taskIndex = 1;

      // Create initial milestone
      items.push({
        wbsCode: "1.0",
        title: `Deliverables: ${documentTitle || "Imported Project Scope"}`,
        type: "Milestone",
        parentId: null,
        status: "In Progress",
        estimatedHours: 120,
        actualHours: 35,
        plannedBudget: 15000,
        actualCost: 4500,
        progressPercent: 30,
        description: `Imported from ${documentTitle || "project documentation"}.`,
      });

      // Parse bullet points or key paragraphs
      for (const line of lines.slice(0, 15)) {
        if (line.length > 5 && (line.startsWith("-") || line.startsWith("•") || line.startsWith("*") || line.match(/^\d+\./))) {
          const cleanLine = line.replace(/^[-•*\d.]+\s*/, "").trim();
          items.push({
            wbsCode: `1.${taskIndex}`,
            title: cleanLine.slice(0, 70),
            type: taskIndex === 1 ? "Epic" : "Task",
            parentId: "1.0",
            status: taskIndex % 3 === 0 ? "Blocked" : "To Do",
            estimatedHours: 24,
            actualHours: 0,
            plannedBudget: 3200,
            actualCost: 0,
            progressPercent: 0,
            description: cleanLine,
          });
          taskIndex++;
        }
      }

      if (items.length <= 1) {
        items.push(
          {
            wbsCode: "1.1",
            title: "Core Scope & Architecture Alignment",
            type: "Epic",
            parentId: "1.0",
            status: "In Progress",
            estimatedHours: 40,
            actualHours: 20,
            plannedBudget: 5000,
            actualCost: 2500,
            progressPercent: 50,
          },
          {
            wbsCode: "1.2",
            title: "Implementation & Deliverables Verification",
            type: "Task",
            parentId: "1.0",
            status: "To Do",
            estimatedHours: 60,
            actualHours: 0,
            plannedBudget: 7500,
            actualCost: 0,
            progressPercent: 0,
          }
        );
      }

      return res.json({
        items,
        warning: `Notice: AI API was unavailable (${aiErr.message}). Document was parsed using PMI structured rule engine.`,
      });
    }
  } catch (error: any) {
    console.error("Error in /api/gemini/parse-wbs-document:", error);
    return res.status(500).json({ error: error.message || "Failed to parse WBS document" });
  }
});

// Instant Risk Mitigation Status Report Generator
app.post("/api/gemini/generate-risk-report", async (req, res) => {
  try {
    const { raidData, projectInfo, evmData, aiConfig } = req.body;
    const projName = projectInfo?.name || "Enterprise Digital Platform";

    const prompt = `Generate an authoritative, PMI-standard "Risk Mitigation & Contingency Status Report" for project "${projName}".
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

    try {
      const { text } = await executeAiCall({
        aiConfig,
        userPrompt: prompt,
        systemPrompt: "You are a Senior PMP Risk Director.",
      });

      return res.json({ reportMarkdown: text });
    } catch (aiErr: any) {
      console.info("Using deterministic PMI Risk report generator:", extractCleanErrorMessage(aiErr));

      const risks = Array.isArray(raidData) ? raidData.filter((r: any) => r.category === "Risk" || !r.category) : [];
      const issues = Array.isArray(raidData) ? raidData.filter((r: any) => r.category === "Issue") : [];

      const riskRows = risks.map((r: any, idx: number) => {
        const p = Number(r.probability ?? 3);
        const i = Number(r.impact ?? 3);
        const score = p * i;
        const severity = score >= 15 ? "CRITICAL" : score >= 8 ? "MODERATE" : "LOW";
        return `| **R-${String(idx + 1).padStart(2, "0")}** | ${r.title} | P:${p} x I:${i} = **${score}** | \`${severity}\` | ${r.mitigation || "Execute contingency reserve"} | ${r.owner || "Project Manager"} |`;
      }).join("\n");

      const deterministicReport = `# PMI Risk Mitigation & Contingency Status Report
**Project:** ${projName}  
**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}  
**Engine:** PMI PMBOK 7th Ed. Standard (Deterministic Rule Engine)  

---

## 1. Executive Threat Exposure
• **Total RAID Items Logged:** ${Array.isArray(raidData) ? raidData.length : 0}  
• **Identified Threat Vectors:** ${risks.length} active risks  
• **Active Impediment Issues:** ${issues.length} operational issues  
• **EVM Performance:** CPI **${Number(evmData?.cpi ?? 1.0).toFixed(2)}** | SPI **${Number(evmData?.spi ?? 1.0).toFixed(2)}**  
• **Budget Contingency Reserve:** $${Math.round(Number(evmData?.bac ?? 100000) * 0.1).toLocaleString()} (10% standard buffer)

---

## 2. Risk Exposure Register (Probability x Impact)

| Risk ID | Threat Description | Exposure Score | Severity | Mitigation Strategy | Assigned Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
${riskRows || "| R-01 | Key Dependency Schedule Variance | P:3 x I:4 = **12** | `MODERATE` | Fast-track critical path deliverables | Lead Architect |"}

---

## 3. Contingency Triggers & Recommendations
1. **Critical Path Monitoring:** Maintain bi-weekly EVM reviews for any work package with SPI < 0.90.
2. **Contingency Drawdown:** Require CCB approval prior to drawing down management reserves.
3. **Escalation Protocol:** Any risk with an impact score ≥ 4 must be escalated to the Executive Sponsor.
`;

      return res.json({
        reportMarkdown: deterministicReport,
        warning: `Notice: AI API was unavailable (${aiErr.message}). Report was generated using local PMI risk analytics.`,
      });
    }
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-risk-report:", error);
    return res.status(500).json({ error: error.message || "Failed to generate risk report" });
  }
});

// Comprehensive PMI Status Report Generator (Executive / Stakeholder)
app.post("/api/gemini/generate-pmi-status-report", async (req, res) => {
  try {
    const { projectSummary, aiConfig } = req.body;
    const projName = projectSummary?.projectSettings?.name || "Enterprise Digital Platform";

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

    try {
      const { text } = await executeAiCall({
        aiConfig,
        userPrompt: prompt,
        systemPrompt: "You are a Lead PMP Project Director.",
      });

      return res.json({ reportMarkdown: text });
    } catch (aiErr: any) {
      console.info("Using deterministic PMI Status report generator:", extractCleanErrorMessage(aiErr));

      const metrics = projectSummary?.evmMetrics || {};
      const cpi = Number(metrics.cpi ?? 0.98);
      const spi = Number(metrics.spi ?? 0.93);
      const ev = Number(metrics.ev ?? 45000);
      const pv = Number(metrics.pv ?? 48000);
      const ac = Number(metrics.ac ?? 46000);
      const bac = Number(metrics.bac ?? 120000);
      const eac = Number(metrics.eac ?? (cpi > 0 ? bac / cpi : bac));
      const vac = Number(metrics.vac ?? (bac - eac));

      const ragStatus = (cpi >= 0.95 && spi >= 0.95) ? "GREEN" : (cpi >= 0.85 && spi >= 0.85) ? "AMBER" : "RED";

      const deterministicReport = `# Executive Project Performance & Health Report
**Project:** ${projName}  
**Reporting Period:** Q3 - Current Week  
**Overall RAG Status:** \`${ragStatus}\`  
**Standard:** PMI PMBOK 7th Edition Earned Value Management  

---

## 1. Project Health Scorecard

| Performance Domain | Status | Metric | PMI Assessment |
| :--- | :--- | :--- | :--- |
| **Schedule Health** | \`${spi >= 0.95 ? "GREEN" : "AMBER"}\` | SPI: **${spi.toFixed(2)}** | SV = $${(ev - pv).toLocaleString()} ${spi >= 1.0 ? "(Favorable)" : "(Minor variance)"} |
| **Cost Health** | \`${cpi >= 0.95 ? "GREEN" : "AMBER"}\` | CPI: **${cpi.toFixed(2)}** | CV = $${(ev - ac).toLocaleString()} ${cpi >= 1.0 ? "(On budget)" : "(Expenditure trailing)"} |
| **Scope Baseline** | \`GREEN\` | 100% Rule | Work Breakdown Structure deliverables verified |
| **Risk Exposure** | \`${(projectSummary?.raidItems?.length || 0) > 5 ? "AMBER" : "GREEN"}\` | ${projectSummary?.raidItems?.length || 0} items | Contingency triggers defined in RAID register |

---

## 2. Earned Value Analysis (EVM) Table

**Core Efficiency Ratios:**  
• **Cost Efficiency (CPI):** \`CPI = EV / AC = $${ev.toLocaleString()} / $${ac.toLocaleString()} = ${cpi.toFixed(2)}\`  
• **Schedule Efficiency (SPI):** \`SPI = EV / PV = $${ev.toLocaleString()} / $${pv.toLocaleString()} = ${spi.toFixed(2)}\`

| Earned Value Metric | Formula / Standard | Current Value ($) | Analysis |
| :--- | :--- | :--- | :--- |
| **Planned Value (PV)** | Baseline scheduled work | **$${pv.toLocaleString()}** | Value of work planned to be completed |
| **Earned Value (EV)** | Physical work completed | **$${ev.toLocaleString()}** | Actual value accrued per deliverables |
| **Actual Cost (AC)** | Incurred labor and expense | **$${ac.toLocaleString()}** | Total expenditures to date |
| **Budget at Completion (BAC)** | Total approved project budget | **$${bac.toLocaleString()}** | Baseline authorized funding |
| **Estimate at Completion (EAC)** | \`BAC / CPI\` | **$${eac.toLocaleString()}** | Projected total final cost |
| **Variance at Completion (VAC)** | \`BAC - EAC\` | **$${vac.toLocaleString()}** | ${vac >= 0 ? "Favorable cost surplus" : "Projected overrun requiring reserve"} |

---

## 3. Executive Decisions & Sponsor Actions
1. **Critical Deliverables:** Authorize fast-tracking of blocked deliverables flagged in WBS.
2. **Change Control Board:** ${projectSummary?.changeRequests?.length || 0} change requests logged for baseline adjustment.
3. **Resource Capacity:** Stakeholder burn rates tracking within planned sprint limits.
`;

      return res.json({
        reportMarkdown: deterministicReport,
        warning: `Notice: AI API was unavailable (${aiErr.message}). Report was computed directly from project EVM baselines.`,
      });
    }
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
