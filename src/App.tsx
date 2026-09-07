import React, { useState, useMemo } from "react";
import {
  WbsItem,
  Stakeholder,
  RaidItem,
  ChangeRequest,
  ProjectDocument,
  RaciMatrixEntry,
  ActiveTab,
  ProjectSettings,
  StatusConfig,
} from "./types";
import {
  initialProjectSettings,
  initialStakeholders,
  initialWbsItems,
  initialRaidItems,
  initialChangeRequests,
  initialDocuments,
  initialRaciEntries,
} from "./data/seedData";
import { calculateEvmMetrics } from "./utils/pmiCalculations";
import { calculateWbsHierarchyRollups } from "./utils/wbsRollup";
import {
  loadStatusConfigs,
  saveStatusConfigs,
  getProgressForStatus,
} from "./utils/statusConfig";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { WbsView } from "./components/WbsView";
import { StakeholdersView } from "./components/StakeholdersView";
import { RaidView } from "./components/RaidView";
import { RaciView } from "./components/RaciView";
import { ChangeManagementView } from "./components/ChangeManagementView";
import { DocumentsView } from "./components/DocumentsView";
import { ReportsView } from "./components/ReportsView";
import { CheckCircle2, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(initialProjectSettings);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>(() => calculateWbsHierarchyRollups(initialWbsItems, initialStakeholders).rolledUpItems);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const [raidItems, setRaidItems] = useState<RaidItem[]>(initialRaidItems);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(initialChangeRequests);
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments);
  const [raciEntries, setRaciEntries] = useState<RaciMatrixEntry[]>(initialRaciEntries);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>(() => loadStatusConfigs());

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Automated WBS Hierarchy Roll-up (PMI 100% Rule, Time, Cost, RACI, Priority, Critical Path)
  const wbsRollupData = useMemo(() => {
    return calculateWbsHierarchyRollups(wbsItems, stakeholders);
  }, [wbsItems, stakeholders]);

  const rolledUpWbsItems = wbsRollupData.rolledUpItems;

  // Dynamic EVM recalculation
  const evmMetrics = useMemo(() => {
    return calculateEvmMetrics(rolledUpWbsItems, stakeholders, projectSettings.authorizedBudget);
  }, [rolledUpWbsItems, stakeholders, projectSettings.authorizedBudget]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // High Density counts for badges
  const criticalRisksCount = raidItems.filter(
    (r) => r.category === "Risk" && (r.riskExposure || 0) >= 15 && r.status !== "Closed"
  ).length;

  const blockedWbsCount = rolledUpWbsItems.filter((i) => i.status === "Blocked").length;
  const pendingCrCount = changeRequests.filter(
    (c) => c.status === "Submitted" || c.status === "Under Review" || c.ccbStatus === "Pending CCB"
  ).length;

  // WBS CRUD - Intelligently recalculates and updates higher hierarchy across epics/milestones
  const handleAddWbsItem = (item: WbsItem) => {
    setWbsItems((prev) => {
      const next = [...prev, item];
      return calculateWbsHierarchyRollups(next, stakeholders).rolledUpItems;
    });
    showToast(`Added work item ${item.wbsCode}: Time and cost rolled up the hierarchy.`);
  };

  const handleUpdateWbsItem = (updated: WbsItem) => {
    setWbsItems((prev) => {
      const next = prev.map((item) => (item.id === updated.id ? updated : item));
      return calculateWbsHierarchyRollups(next, stakeholders).rolledUpItems;
    });
    showToast(`Updated ${updated.wbsCode}: Automated roll-up recalculated across hierarchy.`);
  };

  const handleDeleteWbsItem = (id: string) => {
    setWbsItems((prev) => {
      const next = prev.filter((i) => i.id !== id && i.parentId !== id);
      return calculateWbsHierarchyRollups(next, stakeholders).rolledUpItems;
    });
    showToast("WBS item and children deleted.");
  };

  const handleBatchAddWbsItems = (newItems: WbsItem[]) => {
    setWbsItems((prev) => {
      const next = [...prev, ...newItems];
      return calculateWbsHierarchyRollups(next, stakeholders).rolledUpItems;
    });
    showToast(`Imported ${newItems.length} work items into WBS.`);
  };

  // Status & Progress Rules Handlers
  const handleUpdateStatusConfigs = (newConfigs: StatusConfig[]) => {
    setStatusConfigs(newConfigs);
    saveStatusConfigs(newConfigs);
    showToast("Workflow status rules saved successfully.");
  };

  const handleApplyStatusProgressToTasks = (statusKey: string, newProgress: number) => {
    setWbsItems((prev) => {
      const updated = prev.map((item) =>
        item.status === statusKey ? { ...item, progressPercent: newProgress } : item
      );
      return calculateWbsHierarchyRollups(updated, stakeholders).rolledUpItems;
    });
    showToast(`Updated progress to ${newProgress}% for all tasks with status "${statusKey}".`);
  };

  const handleSyncAllTasksWithStatusProgress = () => {
    setWbsItems((prev) => {
      const updated = prev.map((item) => ({
        ...item,
        progressPercent: getProgressForStatus(item.status, statusConfigs),
      }));
      return calculateWbsHierarchyRollups(updated, stakeholders).rolledUpItems;
    });
    showToast("Synchronized progress percentages across all work items based on current workflow status rules.");
  };

  // Stakeholders CRUD
  const handleAddStakeholder = (s: Stakeholder) => {
    setStakeholders((prev) => [...prev, s]);
    showToast(`Added stakeholder: ${s.name} at $${s.hourlyRate}/hr`);
  };

  const handleUpdateStakeholder = (updated: Stakeholder) => {
    const updatedStakeholders = stakeholders.map((s) => (s.id === updated.id ? updated : s));
    setStakeholders(updatedStakeholders);

    // Update any WBS items assigned to this stakeholder so their actualCost is synced
    setWbsItems((prev) => {
      const updatedItems = prev.map((item) => {
        if (item.assignedStakeholderId === updated.id) {
          const cost = item.actualHours * updated.hourlyRate;
          return { ...item, actualCost: cost };
        }
        return item;
      });
      return calculateWbsHierarchyRollups(updatedItems, updatedStakeholders).rolledUpItems;
    });

    showToast(`Updated ${updated.name}'s rate to $${updated.hourlyRate}/hr. Recalculated EVM CPI/SPI.`);
  };

  const handleDeleteStakeholder = (id: string) => {
    setStakeholders((prev) => prev.filter((s) => s.id !== id));
    showToast("Stakeholder removed from project register.");
  };

  // RAID CRUD
  const handleAddRaidItem = (item: RaidItem) => {
    setRaidItems((prev) => [item, ...prev]);
    showToast(`Logged new ${item.category}: ${item.title}`);
  };

  const handleUpdateRaidItem = (updated: RaidItem) => {
    setRaidItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    showToast(`Updated ${updated.category}: ${updated.title}`);
  };

  const handleDeleteRaidItem = (id: string) => {
    setRaidItems((prev) => prev.filter((item) => item.id !== id));
    showToast("RAID item deleted.");
  };

  // RACI Update
  const handleUpdateRaciEntry = (updated: RaciMatrixEntry) => {
    setRaciEntries((prev) => {
      const idx = prev.findIndex((e) => e.wbsItemId === updated.wbsItemId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    showToast("Updated RACI matrix: Hierarchy roles recalculated up the deliverables.");
  };

  // Change Management CRUD
  const handleAddChangeRequest = (cr: ChangeRequest) => {
    setChangeRequests((prev) => [cr, ...prev]);
    showToast(`Submitted Change Request: ${cr.code || cr.crNumber}`);
  };

  const handleUpdateChangeRequest = (updated: ChangeRequest) => {
    setChangeRequests((prev) => prev.map((cr) => (cr.id === updated.id ? updated : cr)));

    if (updated.status === "Approved" || updated.ccbStatus === "Approved") {
      const delta = updated.costImpact || updated.costImpactDollars || 0;
      setProjectSettings((prev) => ({
        ...prev,
        authorizedBudget: prev.authorizedBudget + delta,
      }));
      showToast(`CR ${updated.code || updated.crNumber} Approved! Authorized Budget adjusted by +$${delta.toLocaleString()}`);
    } else {
      showToast(`Updated Change Request ${updated.code || updated.crNumber} status to ${updated.status || updated.ccbStatus}`);
    }
  };

  const handleDeleteChangeRequest = (id: string) => {
    setChangeRequests((prev) => prev.filter((cr) => cr.id !== id));
    showToast("Change Request deleted.");
  };

  // Documents CRUD
  const handleAddDocument = (doc: ProjectDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    showToast(`Added document: ${doc.title}`);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast("Document deleted.");
  };

  const handleTriggerWbsImportFromDoc = (doc: ProjectDocument) => {
    setActiveTab("wbs");
    showToast(`Switched to WBS. Ready to deconstruct "${doc.title}".`);
  };

  // Execute AI action from NLP Search
  const handleExecuteAiAction = (action: any) => {
    if (!action || action.type === "NONE") return;

    if (action.type === "UPDATE_WBS_STATUS" && action.data?.wbsCode) {
      const item = wbsItems.find((i) => i.wbsCode === action.data.wbsCode);
      if (item) {
        handleUpdateWbsItem({
          ...item,
          status: action.data.status || "In Progress",
          progressPercent: action.data.status === "Done" ? 100 : item.progressPercent,
        });
        showToast(`AI Action Applied: ${item.wbsCode} set to ${action.data.status}`);
      }
    } else if (action.type === "ADD_RAID_RISK" && action.data?.title) {
      const newRisk: RaidItem = {
        id: `raid-ai-${Date.now()}`,
        category: "Risk",
        title: action.data.title,
        description: action.data.description || "Identified via AI project audit",
        probability: action.data.probability || 3,
        impact: action.data.impact || 3,
        riskExposure: (action.data.probability || 3) * (action.data.impact || 3),
        mitigationStrategy: action.data.mitigation || "Mitigation plan under evaluation",
        status: "Identified",
        ownerId: stakeholders[0]?.id || "",
        dateRaised: new Date().toISOString().split("T")[0],
        targetResolutionDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
      };
      handleAddRaidItem(newRisk);
      showToast(`AI Action Applied: Added Risk "${newRisk.title}"`);
    } else if (action.type === "NAVIGATE_TAB" && action.data?.tab) {
      setActiveTab(action.data.tab as ActiveTab);
    } else {
      showToast(`AI recommendation noted: ${action.description || "Review completed"}`);
    }
  };

  // Shared project context for Gemini NLP queries
  const projectContextData = useMemo(() => {
    return {
      projectSettings,
      evmMetrics,
      wbsItemsCount: wbsItems.length,
      blockedItems: wbsItems.filter((i) => i.status === "Blocked").map((i) => ({ code: i.wbsCode, title: i.title })),
      risksCount: raidItems.filter((r) => r.category === "Risk").length,
      stakeholdersCount: stakeholders.length,
      totalCostIncurred: evmMetrics.ac,
      pendingChangeRequests: changeRequests.filter((c) => c.status === "Submitted" || c.ccbStatus === "Pending CCB").length,
    };
  }, [projectSettings, evmMetrics, wbsItems, raidItems, stakeholders, changeRequests]);

  return (
    <div className="flex h-screen w-full bg-[#030712] text-[#F8FAFC] font-sans overflow-hidden select-text">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 right-6 z-50 flex items-center gap-3 bg-[#0B0F19] border border-[#1E293B] text-[#F8FAFC] px-4 py-2.5 rounded-lg shadow-2xl animate-in slide-in-from-bottom-3 duration-200 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#94A3B8] hover:text-white p-0.5 rounded ml-2 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Left High Density Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectSettings={projectSettings}
        evmMetrics={evmMetrics}
        criticalRisksCount={criticalRisksCount}
        blockedWbsCount={blockedWbsCount}
        pendingCrCount={pendingCrCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#030712]">
        {/* Top Header with AI Query Input and Period info */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          projectSettings={projectSettings}
          evmMetrics={evmMetrics}
          onExecuteAiAction={handleExecuteAiAction}
          projectContextData={projectContextData}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onUploadDocsClick={() => setActiveTab("documents")}
        />

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-5 md:p-6 space-y-6">
          {activeTab === "dashboard" && (
            <DashboardView
              wbsItems={wbsItems}
              stakeholders={stakeholders}
              raidItems={raidItems}
              changeRequests={changeRequests}
              evmMetrics={evmMetrics}
              statusConfigs={statusConfigs}
              onNavigateTab={setActiveTab}
              onGenerateReportClick={(type) => {
                setActiveTab("reports");
              }}
            />
          )}

          {activeTab === "wbs" && (
            <WbsView
              wbsItems={wbsItems}
              stakeholders={stakeholders}
              documents={documents}
              onAddWbsItem={handleAddWbsItem}
              onUpdateWbsItem={handleUpdateWbsItem}
              onDeleteWbsItem={handleDeleteWbsItem}
              onBatchAddWbsItems={handleBatchAddWbsItems}
              statusConfigs={statusConfigs}
              onUpdateStatusConfigs={handleUpdateStatusConfigs}
              onSyncAllTasks={handleSyncAllTasksWithStatusProgress}
              onApplyStatusProgressToTasks={handleApplyStatusProgressToTasks}
            />
          )}

          {activeTab === "stakeholders" && (
            <StakeholdersView
              stakeholders={stakeholders}
              wbsItems={wbsItems}
              evmMetrics={evmMetrics}
              onAddStakeholder={handleAddStakeholder}
              onUpdateStakeholder={handleUpdateStakeholder}
              onDeleteStakeholder={handleDeleteStakeholder}
            />
          )}

          {activeTab === "raid" && (
            <RaidView
              raidItems={raidItems}
              stakeholders={stakeholders}
              evmMetrics={evmMetrics}
              onAddRaidItem={handleAddRaidItem}
              onUpdateRaidItem={handleUpdateRaidItem}
              onDeleteRaidItem={handleDeleteRaidItem}
              onRequestRiskReport={() => setActiveTab("reports")}
            />
          )}

          {activeTab === "raci" && (
            <RaciView
              wbsItems={wbsItems}
              stakeholders={stakeholders}
              raciEntries={raciEntries}
              onUpdateRaciEntry={handleUpdateRaciEntry}
            />
          )}

          {activeTab === "change-management" && (
            <ChangeManagementView
              changeRequests={changeRequests}
              stakeholders={stakeholders}
              onAddChangeRequest={handleAddChangeRequest}
              onUpdateChangeRequest={handleUpdateChangeRequest}
              onDeleteChangeRequest={handleDeleteChangeRequest}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsView
              documents={documents}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onTriggerWbsImportFromDoc={handleTriggerWbsImportFromDoc}
            />
          )}

          {activeTab === "reports" && (
            <ReportsView
              wbsItems={wbsItems}
              raidItems={raidItems}
              stakeholders={stakeholders}
              changeRequests={changeRequests}
              evmMetrics={evmMetrics}
            />
          )}
        </div>

        {/* High Density Footer */}
        <footer className="h-8 bg-[#060913] border-t border-[#1E293B] flex items-center px-4 sm:px-6 justify-between text-[10px] text-[#94A3B8] shrink-0 font-mono">
          <div className="flex items-center space-x-2 sm:space-x-4 truncate">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              PMI Core Online
            </span>
            <span>•</span>
            <span className="text-slate-300">Live Governance Sync: Active</span>
            <span>•</span>
            <span className="hidden sm:inline text-slate-400">Standard: PMBOK v7 / ANSI 99-001-2021</span>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-[#38BDF8] font-bold uppercase tracking-wider">Telemetry Nominal</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
