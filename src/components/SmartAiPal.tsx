import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Sparkles,
  Search,
  Upload,
  FileText,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  FolderGit2,
  Layers,
  Plus,
  Compass,
  MessageSquare,
  Bot,
  RefreshCw,
  Paperclip,
  Zap,
  Globe,
  Loader2,
  FileCode,
  ShieldAlert,
  Users,
  GitPullRequest,
  Check,
} from "lucide-react";
import {
  ActiveTab,
  Project,
  Sprint,
  WbsItem,
  RaidItem,
  ChangeRequest,
  Stakeholder,
  ProjectDocument,
  EvmMetrics,
} from "../types";

export type AiPalTab = "chat" | "search" | "add-doc";

interface SmartAiPalProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  wbsItems: WbsItem[];
  raidItems: RaidItem[];
  changeRequests: ChangeRequest[];
  stakeholders: Stakeholder[];
  documents: ProjectDocument[];
  evmMetrics: EvmMetrics;
  onExecuteAiAction: (action: any) => void;
  onAddDocument: (doc: ProjectDocument) => void;
  onBatchAddWbsItems?: (items: WbsItem[]) => void;
  showToast: (msg: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  scopeName: string;
  action?: any;
  relevantMetrics?: {
    cpi?: number;
    spi?: number;
    highlight?: string;
  };
}

export const SmartAiPal: React.FC<SmartAiPalProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  activeTab,
  setActiveTab,
  wbsItems,
  raidItems,
  changeRequests,
  stakeholders,
  documents,
  evmMetrics,
  onExecuteAiAction,
  onAddDocument,
  onBatchAddWbsItems,
  showToast,
}) => {
  // Expansion and active view states
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPalTab, setCurrentPalTab] = useState<AiPalTab>("chat");

  // Selected Scope: "all" or specific project ID
  const [targetScope, setTargetScope] = useState<string>("all");
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);

  // Search & Input state
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Hello! I am your PMI-Certified AI Pal. I can audit performance, search deliverables across projects, draft RAID risks, or parse project charters into WBS work items. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scopeName: "Global Workspace",
    },
  ]);

  // Document upload state inside AI Pal
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Project Charter");
  const [docContent, setDocContent] = useState("");
  const [docTargetProject, setDocTargetProject] = useState<string>(
    activeProjectId !== "all" ? activeProjectId : projects[0]?.id || "all"
  );
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync targetScope with activeProjectId on initial load if activeProjectId is specific
  useEffect(() => {
    if (activeProjectId && activeProjectId !== "all") {
      setDocTargetProject(activeProjectId);
    }
  }, [activeProjectId]);

  const activeProjectObj = useMemo(() => {
    return projects.find((p) => p.id === targetScope);
  }, [projects, targetScope]);

  const scopeDisplayName = useMemo(() => {
    if (targetScope === "all") return "All Projects (Workspace)";
    return activeProjectObj ? activeProjectObj.name : "Active Project";
  }, [targetScope, activeProjectObj]);

  // Prepare contextual data for the selected scope
  const scopedContextData = useMemo(() => {
    if (targetScope === "all") {
      const totalBac = projects.reduce((sum, p) => sum + (p.authorizedBudget || p.baselineBudget || 0), 0);
      return {
        scope: "all",
        totalProjects: projects.length,
        projectsSummary: projects.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.projectCode,
          status: p.status,
          budget: p.authorizedBudget || p.baselineBudget,
        })),
        evmMetrics: {
          ...evmMetrics,
          bac: totalBac,
        },
        wbsItemsCount: wbsItems.length,
        blockedItems: wbsItems
          .filter((i) => i.status === "Blocked")
          .map((i) => ({ code: i.wbsCode, title: i.title, projectId: i.projectId })),
        risksCount: raidItems.filter((r) => r.category === "Risk").length,
        stakeholdersCount: stakeholders.length,
        pendingChangeRequests: changeRequests.filter(
          (c) => c.status === "Submitted" || c.ccbStatus === "Pending CCB"
        ).length,
      };
    } else {
      const projWbs = wbsItems.filter((w) => w.projectId === targetScope);
      const projRaid = raidItems.filter((r) => r.projectId === targetScope);
      const projCr = changeRequests.filter((c) => c.projectId === targetScope);
      return {
        scope: targetScope,
        projectSettings: activeProjectObj || { name: "Selected Project" },
        evmMetrics,
        wbsItemsCount: projWbs.length,
        blockedItems: projWbs
          .filter((i) => i.status === "Blocked")
          .map((i) => ({ code: i.wbsCode, title: i.title })),
        risksCount: projRaid.filter((r) => r.category === "Risk").length,
        stakeholdersCount: stakeholders.length,
        pendingChangeRequests: projCr.filter(
          (c) => c.status === "Submitted" || c.ccbStatus === "Pending CCB"
        ).length,
      };
    }
  }, [targetScope, projects, activeProjectObj, evmMetrics, wbsItems, raidItems, stakeholders, changeRequests]);

  // Handle Query Submission
  const handleSendQuery = async (overridePrompt?: string) => {
    const queryToRun = (overridePrompt || inputText).trim();
    if (!queryToRun || isLoading) return;

    // Switch to chat tab if sending a prompt
    setCurrentPalTab("chat");
    setIsExpanded(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: queryToRun,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scopeName: scopeDisplayName,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToRun,
          projectContext: scopedContextData,
          scope: targetScope,
          documentContext: docContent ? { title: docTitle || "Attached Note", content: docContent.slice(0, 3000) } : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("PM Pal service request failed");
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.reply || "Analysis completed according to PMBOK principles.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scopeName: scopeDisplayName,
        action: data.recommendedAction,
        relevantMetrics: data.relevantMetrics,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: `Notice: ${err.message || "Could not reach PM Pal server."} Reverting to local project indicators: CPI ${evmMetrics.cpi?.toFixed(2) || "1.00"}, SPI ${evmMetrics.spi?.toFixed(2) || "1.00"}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          scopeName: scopeDisplayName,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick prompt recommendations based on scope
  const promptSuggestions = useMemo(() => {
    if (targetScope === "all") {
      return [
        "Compare progress and SPI across all projects",
        "Which project has the highest risk exposure?",
        "Total authorized budget vs actual spend in workspace",
        "Find all blocked deliverables across all projects",
      ];
    } else {
      return [
        `What is the current SPI & CPI for ${activeProjectObj?.name || "this project"}?`,
        "Identify blocked WBS deliverables and recommended mitigation",
        "Calculate EAC and variance at completion (VAC)",
        "Audit top risks in the RAID register",
      ];
    }
  }, [targetScope, activeProjectObj]);

  // Live Multi-Entity Search & Navigation
  const searchResults = useMemo(() => {
    const q = inputText.toLowerCase().trim();
    if (!q) return [];

    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: "wbs" | "raid" | "cr" | "stakeholder" | "document" | "tab" | "project";
      badge: string;
      projectId?: string;
      projectName?: string;
      targetTab: ActiveTab;
      rawItem?: any;
    }> = [];

    // 1. Navigation Tabs
    const tabs: Array<{ id: ActiveTab; name: string; desc: string }> = [
      { id: "dashboard", name: "Dashboard (EVM)", desc: "Performance index, charts & S-Curve" },
      { id: "wbs", name: "Work Breakdown Structure (WBS)", desc: "100% Rule hierarchical deliverables & Gantt" },
      { id: "raid", name: "RAID Register", desc: "Risks, Assumptions, Issues, Dependencies matrix" },
      { id: "raci", name: "RACI Matrix", desc: "Responsible, Accountable, Consulted, Informed chart" },
      { id: "change-management", name: "Change Control Board", desc: "Scope & budget change requests" },
      { id: "stakeholders", name: "Stakeholder Directory", desc: "Hourly cost rates and contacts" },
      { id: "documents", name: "Project Documents", desc: "Charters, SOWs, and architectural specifications" },
      { id: "reports", name: "Executive Reports", desc: "PMI status reports and AI audits" },
    ];

    tabs.forEach((tab) => {
      if (tab.name.toLowerCase().includes(q) || tab.desc.toLowerCase().includes(q) || tab.id.toLowerCase().includes(q)) {
        results.push({
          id: `tab-${tab.id}`,
          title: tab.name,
          subtitle: tab.desc,
          type: "tab",
          badge: "View",
          targetTab: tab.id,
        });
      }
    });

    // 2. Projects (if searching for a project to switch to)
    projects.forEach((proj) => {
      if (proj.name.toLowerCase().includes(q) || proj.projectCode.toLowerCase().includes(q)) {
        results.push({
          id: `proj-${proj.id}`,
          title: proj.name,
          subtitle: `Code: ${proj.projectCode} • Status: ${proj.status}`,
          type: "project",
          badge: "Project",
          projectId: proj.id,
          projectName: proj.name,
          targetTab: activeTab,
        });
      }
    });

    // Filter scope helper
    const matchesScope = (itemProjectId?: string) => {
      if (targetScope === "all") return true;
      return itemProjectId === targetScope;
    };

    // 3. WBS Items
    wbsItems.forEach((wbs) => {
      if (!matchesScope(wbs.projectId)) return;
      const proj = projects.find((p) => p.id === wbs.projectId);
      const assignee = stakeholders.find((s) => s.id === wbs.assignedStakeholderId);
      if (
        wbs.wbsCode.toLowerCase().includes(q) ||
        wbs.title.toLowerCase().includes(q) ||
        (assignee && assignee.name.toLowerCase().includes(q)) ||
        (wbs.description && wbs.description.toLowerCase().includes(q))
      ) {
        results.push({
          id: `wbs-${wbs.id}`,
          title: `${wbs.wbsCode} ${wbs.title}`,
          subtitle: `${wbs.type} • Status: ${wbs.status} • Progress: ${wbs.progressPercent}%`,
          type: "wbs",
          badge: wbs.status,
          projectId: wbs.projectId,
          projectName: proj?.name || "Project",
          targetTab: "wbs",
          rawItem: wbs,
        });
      }
    });

    // 4. RAID Items
    raidItems.forEach((raid) => {
      if (!matchesScope(raid.projectId)) return;
      const proj = projects.find((p) => p.id === raid.projectId);
      if (
        raid.title.toLowerCase().includes(q) ||
        raid.category.toLowerCase().includes(q) ||
        (raid.description && raid.description.toLowerCase().includes(q)) ||
        (raid.mitigationStrategy && raid.mitigationStrategy.toLowerCase().includes(q))
      ) {
        results.push({
          id: `raid-${raid.id}`,
          title: raid.title,
          subtitle: `${raid.category} • Status: ${raid.status} • Exposure: ${raid.riskExposure || "N/A"}`,
          type: "raid",
          badge: raid.category,
          projectId: raid.projectId,
          projectName: proj?.name || "Project",
          targetTab: "raid",
          rawItem: raid,
        });
      }
    });

    // 5. Change Requests
    changeRequests.forEach((cr) => {
      if (!matchesScope(cr.projectId)) return;
      const proj = projects.find((p) => p.id === cr.projectId);
      if (
        cr.title.toLowerCase().includes(q) ||
        (cr.crNumber && cr.crNumber.toLowerCase().includes(q)) ||
        (cr.code && cr.code.toLowerCase().includes(q)) ||
        (cr.reason && cr.reason.toLowerCase().includes(q))
      ) {
        results.push({
          id: `cr-${cr.id}`,
          title: `${cr.code || cr.crNumber}: ${cr.title}`,
          subtitle: `CCB Status: ${cr.ccbStatus || cr.status} • Cost Impact: $${(cr.costImpact || 0).toLocaleString()}`,
          type: "cr",
          badge: "CR",
          projectId: cr.projectId,
          projectName: proj?.name || "Project",
          targetTab: "change-management",
          rawItem: cr,
        });
      }
    });

    // 6. Stakeholders
    stakeholders.forEach((sh) => {
      if (
        sh.name.toLowerCase().includes(q) ||
        sh.role.toLowerCase().includes(q) ||
        (sh.department && sh.department.toLowerCase().includes(q))
      ) {
        results.push({
          id: `sh-${sh.id}`,
          title: sh.name,
          subtitle: `${sh.role} • ${sh.department || "Core Team"} • $${sh.hourlyRate}/hr`,
          type: "stakeholder",
          badge: "Member",
          targetTab: "stakeholders",
          rawItem: sh,
        });
      }
    });

    // 7. Documents
    documents.forEach((doc) => {
      if (!matchesScope(doc.projectId)) return;
      const proj = projects.find((p) => p.id === doc.projectId);
      if (
        doc.title.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q)
      ) {
        results.push({
          id: `doc-${doc.id}`,
          title: doc.title,
          subtitle: `${doc.category} • Uploaded: ${doc.uploadDate}`,
          type: "document",
          badge: "Doc",
          projectId: doc.projectId,
          projectName: proj?.name || "Project",
          targetTab: "documents",
          rawItem: doc,
        });
      }
    });

    return results.slice(0, 15);
  }, [inputText, projects, targetScope, wbsItems, raidItems, changeRequests, stakeholders, documents, activeTab]);

  // Handle clicking a search result
  const handleSelectSearchResult = (result: any) => {
    if (result.type === "project" && result.projectId) {
      onSelectProject(result.projectId);
      showToast(`Switched active context to project: ${result.projectName}`);
    } else {
      if (result.projectId && result.projectId !== activeProjectId) {
        onSelectProject(result.projectId);
      }
      setActiveTab(result.targetTab);
      showToast(`Jumped to ${result.targetTab.toUpperCase()}: ${result.title}`);
    }
    setIsExpanded(false);
    setInputText("");
  };

  // Handle Document Upload via AI Pal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!docTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setDocTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setDocContent(content || "");
      showToast(`Attached ${file.name} (${Math.round(file.size / 1024)} KB)`);
    };
    reader.readAsText(file);
  };

  // Save Document to Project
  const handleSaveDocument = () => {
    if (!docTitle.trim()) {
      showToast("Please enter a document title");
      return;
    }

    const chosenProjId = docTargetProject === "all" ? projects[0]?.id || "proj-001" : docTargetProject;
    const targetProjectObj = projects.find((p) => p.id === chosenProjId);

    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      title: docTitle,
      category: docCategory,
      content: docContent || `Specification file uploaded for ${targetProjectObj?.name || "Project"}`,
      uploadDate: new Date().toISOString().split("T")[0],
      projectId: chosenProjId,
      projectName: targetProjectObj?.name || "Project",
      fileSize: `${Math.max(1, Math.round((docContent.length * 2) / 1024))} KB`,
      uploadedBy: "AI Pal Co-Pilot",
    };

    onAddDocument(newDoc);
    showToast(`Added document "${newDoc.title}" to ${targetProjectObj?.name || "Project"}`);
    setDocTitle("");
    setDocContent("");
    setCurrentPalTab("chat");
  };

  // Parse Document into WBS Deliverables using AI
  const handleParseDocumentToWbs = async () => {
    if (!docContent.trim()) {
      showToast("Please provide document content to parse into WBS");
      return;
    }

    setIsParsingDoc(true);
    try {
      const res = await fetch("/api/gemini/parse-wbs-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTitle: docTitle || "Project Specification",
          documentText: docContent,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to parse WBS document via AI");
      }

      const data = await res.json();
      const generatedItems = data.items || [];

      if (generatedItems.length === 0) {
        showToast("No WBS items could be parsed from this document.");
        return;
      }

      const chosenProjId = docTargetProject === "all" ? projects[0]?.id || "proj-001" : docTargetProject;
      const targetProj = projects.find((p) => p.id === chosenProjId);

      const todayStr = new Date().toISOString().split("T")[0];
      const dueStr = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

      // Map parsed items into standard WbsItem format
      const formattedItems: WbsItem[] = generatedItems.map((item: any, idx: number) => ({
        id: `wbs-parsed-${Date.now()}-${idx}`,
        wbsCode: item.wbsCode || `1.${idx + 1}`,
        title: item.title || `Deliverable ${idx + 1}`,
        type: item.type || "Task",
        status: item.status || "To Do",
        estimatedHours: item.estimatedHours || 40,
        actualHours: item.actualHours || 0,
        plannedBudget: item.plannedBudget || 5000,
        actualCost: item.actualCost || 0,
        progressPercent: item.progressPercent || 0,
        assignedStakeholderId: stakeholders[0]?.id || "sh-001",
        startDate: todayStr,
        dueDate: dueStr,
        description: item.description || `Generated from ${docTitle || "Document"}`,
        projectId: chosenProjId,
        projectName: targetProj?.name || "Project",
        parentId: null,
      }));

      if (onBatchAddWbsItems) {
        onBatchAddWbsItems(formattedItems);
      }

      // Also save document as parsed
      const newDoc: ProjectDocument = {
        id: `doc-${Date.now()}`,
        title: docTitle || "Parsed Project Specification",
        category: docCategory,
        content: docContent,
        uploadDate: new Date().toISOString().split("T")[0],
        projectId: chosenProjId,
        projectName: targetProj?.name || "Project",
        parsedIntoWbs: true,
        fileSize: `${Math.max(1, Math.round((docContent.length * 2) / 1024))} KB`,
      };
      onAddDocument(newDoc);

      showToast(`Successfully extracted ${formattedItems.length} WBS deliverables into ${targetProj?.name || "Project"}!`);
      setActiveTab("wbs");
      if (chosenProjId !== activeProjectId) {
        onSelectProject(chosenProjId);
      }
      setDocTitle("");
      setDocContent("");
      setIsExpanded(false);
    } catch (err: any) {
      showToast(`WBS parsing error: ${err.message || "Failed to decompose document"}`);
    } finally {
      setIsParsingDoc(false);
    }
  };

  // Ask AI Pal about the attached document
  const handleAskAboutDoc = () => {
    if (!docContent.trim()) {
      showToast("Please provide or attach document content first");
      return;
    }
    const prompt = `Please audit this ${docCategory} ("${docTitle || "Untitled"}"): summarize key deliverables, assess scope risks, and suggest 3 high-priority WBS tasks or RAID risks.`;
    handleSendQuery(prompt);
  };

  return (
    <>
      {/* Floating Bottom AI Pal Dock (Positioned relative to main content area across all screen sizes) */}
      <div
        id="smart-ai-pal-container"
        className="absolute bottom-2 sm:bottom-3.5 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[98%] max-w-[calc(100%-0.75rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl transition-all duration-200 select-none pointer-events-auto"
      >
        {/* Expanded Pal Drawer Panel */}
        {isExpanded && (
          <div
            id="smart-ai-pal-drawer"
            className="mb-2.5 bg-[#090E1A]/95 border border-[#232F48] rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 max-h-[calc(100vh-7.5rem)] sm:max-h-[580px]"
          >
            {/* Drawer Header */}
            <div className="px-3.5 sm:px-5 py-3 border-b border-[#1E293B] bg-[#070B14]/90 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                      PM Pal
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/15 text-sky-300 rounded border border-sky-500/30 font-mono hidden sm:inline">
                      PMBOK v7 Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Intelligent assistant for single or cross-project actions
                  </p>
                </div>
              </div>

              {/* Scope Selector in Header */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
                    className="flex items-center gap-1.5 text-xs bg-[#121A2D] hover:bg-[#18233C] text-slate-200 border border-[#23314F] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Change target project scope"
                  >
                    {targetScope === "all" ? (
                      <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <FolderGit2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                    <span className="max-w-[110px] sm:max-w-[160px] truncate font-medium text-[11px]">
                      {targetScope === "all" ? "All Projects" : activeProjectObj?.name || "Project"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {/* Scope Dropdown Menu in Header */}
                  {isScopeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setIsScopeDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-64 max-w-[85vw] bg-[#0B1120] border border-[#263554] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1A253E] flex items-center justify-between">
                          <span>Target Scope</span>
                          <span className="text-slate-500">Query / Action</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetScope("all");
                            setIsScopeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#151F36] cursor-pointer ${
                            targetScope === "all" ? "text-sky-300 font-semibold bg-sky-500/10" : "text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                            <span>All Projects (Workspace)</span>
                          </div>
                          {targetScope === "all" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </button>

                        <div className="my-1 border-t border-[#1A253E]" />

                        <div className="max-h-48 overflow-y-auto">
                          {projects.map((proj) => (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => {
                                setTargetScope(proj.id);
                                setDocTargetProject(proj.id);
                                setIsScopeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#151F36] cursor-pointer ${
                                targetScope === proj.id ? "text-sky-300 font-semibold bg-sky-500/10" : "text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <FolderGit2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate">{proj.name}</span>
                              </div>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono shrink-0">
                                {proj.projectCode}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Close/Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#172238] transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center border-b border-[#1E293B] bg-[#070D1A] px-2.5 sm:px-5 py-1.5 gap-1.5 sm:gap-2 text-xs overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setCurrentPalTab("chat")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 text-xs ${
                  currentPalTab === "chat"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Ask AI & Do Stuff</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPalTab("search")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 text-xs ${
                  currentPalTab === "search"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Search & Navigate</span>
                {searchResults.length > 0 && inputText.trim() && (
                  <span className="text-[10px] bg-sky-500/30 text-sky-200 px-1.5 py-0.2 rounded-full font-mono shrink-0">
                    {searchResults.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentPalTab("add-doc")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 text-xs ${
                  currentPalTab === "add-doc"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Add Document</span>
                {docContent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
            </div>

            {/* Tab Body 1: Chat & Co-Pilot */}
            {currentPalTab === "chat" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[380px] sm:max-h-[420px] select-text">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {msg.sender === "user" ? "You" : "PM Pal"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {msg.timestamp}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                        {msg.scopeName}
                      </span>
                    </div>

                    <div
                      className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md ${
                        msg.sender === "user"
                          ? "bg-sky-600 text-white rounded-br-xs"
                          : "bg-[#0F172A] border border-[#232F48] text-slate-200 rounded-bl-xs"
                      }`}
                    >
                      {msg.relevantMetrics?.highlight && (
                        <div className="mb-2 p-2 rounded-lg bg-[#070D1A] border border-sky-500/30 text-sky-300 font-mono text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                          <span>{msg.relevantMetrics.highlight}</span>
                        </div>
                      )}

                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Interactive Proposed Action ("Do Stufff") */}
                      {msg.action && msg.action.type !== "NONE" && (
                        <div className="mt-3 pt-2.5 border-t border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#080E1D] p-2.5 rounded-xl border border-sky-500/20">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                                PROPOSED ACTION
                              </span>
                              <span className="text-white font-semibold text-[11px]">
                                {msg.action.description || msg.action.type}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Click to execute this change on your project state.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onExecuteAiAction(msg.action);
                              showToast(`Executed action: ${msg.action.description || msg.action.type}`);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-[11px] rounded-lg flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Apply Action</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic px-2 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>PM Pal is analyzing project metrics and PMI formulas...</span>
                  </div>
                )}

                {/* Contextual Quick Suggestion Prompts */}
                <div className="pt-2">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                    Suggested Inquiries for {scopeDisplayName}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {promptSuggestions.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuery(prompt)}
                        className="text-[11px] bg-[#111A2E] hover:bg-[#1A2642] text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-[#22314E] transition-colors cursor-pointer text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Body 2: Search & Navigate Across Project(s) */}
            {currentPalTab === "search" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px] sm:max-h-[420px]">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>
                    Searching in: <strong className="text-white">{scopeDisplayName}</strong>
                  </span>
                  <span className="text-[11px]">Type in the input bar below to filter results</span>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full text-left p-2.5 bg-[#0F172A] hover:bg-[#18233C] border border-[#232F48] hover:border-sky-500/40 rounded-xl transition-all flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#19243C] flex items-center justify-center text-slate-300 group-hover:text-sky-400 group-hover:bg-sky-500/15 shrink-0">
                            {res.type === "wbs" && <CheckCircle2 className="w-4 h-4" />}
                            {res.type === "raid" && <ShieldAlert className="w-4 h-4" />}
                            {res.type === "cr" && <GitPullRequest className="w-4 h-4" />}
                            {res.type === "stakeholder" && <Users className="w-4 h-4" />}
                            {res.type === "document" && <FileText className="w-4 h-4" />}
                            {res.type === "tab" && <Compass className="w-4 h-4 text-amber-400" />}
                            {res.type === "project" && <FolderGit2 className="w-4 h-4 text-indigo-400" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-white group-hover:text-sky-300 truncate">
                                {res.title}
                              </h4>
                              {res.projectName && targetScope === "all" && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono shrink-0">
                                  {res.projectName}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {res.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            {res.badge}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs">
                      {inputText.trim()
                        ? `No items found matching "${inputText}" in ${scopeDisplayName}.`
                        : "Type keywords in the bar below to instantly search deliverables, risks, change requests, team members, and tabs across projects."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Body 3: Add Document & Parse WBS */}
            {currentPalTab === "add-doc" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[380px] sm:max-h-[420px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Document Title */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g. Core Banking System Architecture Charter"
                      className="w-full bg-[#0D1527] border border-[#232F48] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Target Project */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Attach To Project
                    </label>
                    <select
                      value={docTargetProject}
                      onChange={(e) => setDocTargetProject(e.target.value)}
                      className="w-full bg-[#0D1527] border border-[#232F48] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.projectCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Document Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Project Charter", "SOW", "Requirements", "Architecture", "WBS Specification", "Meeting Notes"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setDocCategory(cat)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          docCategory === cat
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/50 font-semibold"
                            : "bg-[#0D1527] text-slate-400 border-[#232F48] hover:text-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Drop Area */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.docx,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#263554] hover:border-sky-500/50 bg-[#0A101E] rounded-xl p-3.5 text-center cursor-pointer transition-colors group"
                  >
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-400 mx-auto mb-1" />
                    <p className="text-xs font-medium text-slate-300">
                      Click to upload project document file (.txt, .md, .pdf, .json)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Or paste document text below to parse or audit
                    </p>
                  </div>
                </div>

                {/* Content Paste Area */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Document Content / Paste Area
                  </label>
                  <textarea
                    rows={4}
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Paste project charter, requirements specifications, SOW, or sprint stories here..."
                    className="w-full bg-[#0D1527] border border-[#232F48] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!docContent.trim() || isParsingDoc}
                    onClick={handleParseDocumentToWbs}
                    className="flex-1 min-w-[160px] bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    {isParsingDoc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Parse into WBS Deliverables</span>
                  </button>

                  <button
                    type="button"
                    disabled={!docContent.trim()}
                    onClick={handleAskAboutDoc}
                    className="bg-[#16233B] hover:bg-[#1E2F50] text-sky-300 border border-sky-500/30 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Audit with AI Pal</span>
                  </button>

                  <button
                    type="button"
                    disabled={!docTitle.trim()}
                    onClick={handleSaveDocument}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save to Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Input Dock Bar (Always visible at bottom) */}
        <div className="bg-[#0B111E]/95 border border-[#232F48] shadow-2xl rounded-2xl px-1.5 sm:px-2 md:px-2.5 py-2 sm:py-2.5 md:py-3 backdrop-blur-xl flex items-center gap-1 sm:gap-1.5 md:gap-2 text-white min-h-[54px] sm:min-h-[62px]">
          {/* AI Pal Avatar with Pulse & Expand Toggle */}
          <button
            type="button"
            id="smart-ai-pal-avatar-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 border border-sky-500/40 text-sky-300 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-xs"
            title={isExpanded ? "Collapse PM Pal" : "Open PM Pal Workspace"}
          >
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden sm:inline font-bold">PM Pal</span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
          </button>

          {/* Quick Scope Selector Pill */}
          <div className="relative shrink-0">
            <button
              type="button"
              id="smart-ai-pal-scope-pill"
              onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
              className="flex items-center gap-1 bg-[#121A2D] hover:bg-[#1A253E] border border-[#23314F] text-slate-300 text-xs sm:text-[13px] font-medium px-1.5 sm:px-2 py-2 sm:py-2.5 rounded-xl transition-colors cursor-pointer max-w-[85px] xs:max-w-[120px] sm:max-w-[155px] md:max-w-[185px] truncate shrink-0"
              title="Click to switch scope: single project or all projects"
            >
              {targetScope === "all" ? (
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <FolderGit2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              )}
              <span className="truncate">
                {targetScope === "all" ? "All Projects" : activeProjectObj?.projectCode || "Project"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Scope Dropdown Menu from Dock Pill (Opens upward above dock) */}
            {isScopeDropdownOpen && !isExpanded && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsScopeDropdownOpen(false)}
                />
                <div className="absolute left-0 bottom-full mb-2.5 w-64 max-w-[85vw] bg-[#0B1120] border border-[#263554] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1A253E] flex items-center justify-between">
                    <span>Target Scope</span>
                    <span className="text-slate-500">Query / Action</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetScope("all");
                      setIsScopeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#151F36] cursor-pointer ${
                      targetScope === "all" ? "text-sky-300 font-semibold bg-sky-500/10" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      <span>All Projects (Workspace)</span>
                    </div>
                    {targetScope === "all" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>

                  <div className="my-1 border-t border-[#1A253E]" />

                  <div className="max-h-48 overflow-y-auto">
                    {projects.map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          setTargetScope(proj.id);
                          setDocTargetProject(proj.id);
                          setIsScopeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#151F36] cursor-pointer ${
                          targetScope === proj.id ? "text-sky-300 font-semibold bg-sky-500/10" : "text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FolderGit2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{proj.name}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono shrink-0">
                          {proj.projectCode}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Main Input Field */}
          <div className="relative flex-1 min-w-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center w-full"
            >
              <input
                id="smart-ai-pal-input"
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (!isExpanded && e.target.value.trim().length > 1) {
                    setIsExpanded(true);
                  }
                }}
                onFocus={() => {
                  if (!isExpanded) setIsExpanded(true);
                }}
                placeholder={
                  targetScope === "all"
                    ? 'Ask AI or type to search across all projects...'
                    : `Ask about ${activeProjectObj?.name || activeProjectObj?.projectCode || "project"} or search...`
                }
                className="w-full bg-[#050811] border border-[#1E293B] focus:border-sky-500 rounded-xl py-2 sm:py-2.5 md:py-3 pl-2.5 sm:pl-3 pr-7 sm:pr-8 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner truncate leading-normal"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="absolute right-2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Quick Add Doc Button */}
          <button
            type="button"
            id="smart-ai-pal-quick-add-doc-btn"
            onClick={() => {
              setCurrentPalTab("add-doc");
              setIsExpanded(true);
            }}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Attach or upload document"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Send / Search Action Button */}
          <button
            type="button"
            id="smart-ai-pal-submit-btn"
            disabled={isLoading || !inputText.trim()}
            onClick={() => handleSendQuery()}
            className="bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-40 disabled:hover:bg-[#38BDF8] text-[#030712] px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm cursor-pointer shrink-0"
            title="Send query to PM Pal"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Ask</span>
          </button>
        </div>
      </div>
    </>
  );
};
