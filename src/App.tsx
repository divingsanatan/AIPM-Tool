import React, { useState, useMemo, useEffect } from "react";
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
  Project,
  Sprint,
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
import { loadProjects, saveProjects, loadActiveProjectId, saveActiveProjectId } from "./data/projectsData";
import { loadSprints, saveSprints } from "./data/sprintsData";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { CreateSprintModal } from "./components/CreateSprintModal";
import { DeleteSprintModal } from "./components/DeleteSprintModal";
import { DeleteProjectModal } from "./components/DeleteProjectModal";
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
import { SyncModal } from "./components/SyncModal";
import {
  fetchServerState,
  pushServerState,
  mergeProjects,
  mergeSprints,
} from "./utils/cloudSync";
import { CheckCircle2, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Multi-Project and Multi-Sprint Architecture
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [sprints, setSprints] = useState<Sprint[]>(() => loadSprints());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => loadActiveProjectId() || "all");
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
  const [targetSprintProjectId, setTargetSprintProjectId] = useState<string | undefined>(undefined);
  const [sprintToEdit, setSprintToEdit] = useState<Sprint | null>(null);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(initialProjectSettings);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>(() => calculateWbsHierarchyRollups(initialWbsItems, initialStakeholders).rolledUpItems);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const [raidItems, setRaidItems] = useState<RaidItem[]>(initialRaidItems);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(initialChangeRequests);
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments);
  const [raciEntries, setRaciEntries] = useState<RaciMatrixEntry[]>(initialRaciEntries);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>(() => loadStatusConfigs());

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Centralized Server Sync: automatically checks and merges cloud projects on mount
  useEffect(() => {
    let isMounted = true;
    async function initServerSync() {
      try {
        const serverState = await fetchServerState();
        if (!isMounted || !serverState) return;

        if (serverState.projects && serverState.projects.length > 0) {
          setProjects((prev) => {
            const merged = mergeProjects(prev, serverState.projects!);
            saveProjects(merged);
            return merged;
          });
        } else {
          // Push initial local projects to server so other devices can pull them
          const localProjects = loadProjects();
          const localSprints = loadSprints();
          pushServerState({
            projects: localProjects,
            sprints: localSprints,
            wbsItems,
            raidItems,
            changeRequests,
            stakeholders,
          });
        }

        if (serverState.sprints && serverState.sprints.length > 0) {
          setSprints((prev) => {
            const merged = mergeSprints(prev, serverState.sprints!);
            saveSprints(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn("Server sync check failed:", err);
      }
    }
    initServerSync();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyMergedData = (merged: {
    projects?: Project[];
    sprints?: Sprint[];
    wbsItems?: WbsItem[];
    raidItems?: RaidItem[];
    changeRequests?: ChangeRequest[];
  }) => {
    if (merged.projects) {
      setProjects(merged.projects);
      saveProjects(merged.projects);
    }
    if (merged.sprints) {
      setSprints(merged.sprints);
      saveSprints(merged.sprints);
    }
    if (merged.wbsItems) {
      setWbsItems(merged.wbsItems);
    }
    if (merged.raidItems) {
      setRaidItems(merged.raidItems);
    }
    if (merged.changeRequests) {
      setChangeRequests(merged.changeRequests);
    }
  };

  // Multi-Project Switching Handlers
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  const handleSelectProject = (projId: string) => {
    setActiveProjectId(projId);
    saveActiveProjectId(projId);
    setSelectedSprintId(null);
    const selected = projects.find((p) => p.id === projId);
    if (projId === "all") {
      showToast("Switched to Workspace View: Viewing all projects & sprints");
    } else {
      showToast(`Switched to: ${selected?.name || "Project"} (${selected?.projectCode || ""})`);
    }
  };

  const handleSelectSprint = (sprintId: string | null) => {
    setSelectedSprintId(sprintId);
    if (sprintId) {
      const spr = sprints.find((s) => s.id === sprintId);
      if (spr?.projectId && spr.projectId !== activeProjectId) {
        setActiveProjectId(spr.projectId);
        saveActiveProjectId(spr.projectId);
      }
      showToast(`Focused Sprint: ${spr?.name || "Sprint"}`);
    }
  };

  const handleAddNewProject = (newProj: Project) => {
    setProjects((prev) => {
      const next = [newProj, ...prev];
      saveProjects(next);
      pushServerState({ projects: next, sprints });
      return next;
    });
    setActiveProjectId(newProj.id);
    saveActiveProjectId(newProj.id);
    setSelectedSprintId(null);
    showToast(`Created new project: ${newProj.name}. Active workspace updated.`);
  };

  const handleOpenEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsCreateProjectModalOpen(true);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    const oldProject = projects.find((p) => p.id === updatedProject.id);
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === updatedProject.id ? updatedProject : p));
      saveProjects(next);
      pushServerState({ projects: next, sprints });
      return next;
    });

    // If project name changed, sync associated sprints & work items
    if (oldProject && oldProject.name !== updatedProject.name) {
      setSprints((prev) => {
        const next = prev.map((s) =>
          s.projectId === updatedProject.id || s.projectGroup === oldProject.name
            ? { ...s, projectGroup: updatedProject.name, projectId: updatedProject.id }
            : s
        );
        saveSprints(next);
        return next;
      });

      setWbsItems((prev) => {
        const updated = prev.map((item) =>
          item.projectId === updatedProject.id || item.projectName === oldProject.name
            ? { ...item, projectName: updatedProject.name, projectId: updatedProject.id }
            : item
        );
        return calculateWbsHierarchyRollups(updated, stakeholders).rolledUpItems;
      });
    }

    // If currently active, sync projectSettings
    if (activeProjectId === updatedProject.id) {
      setProjectSettings((prev) => ({
        ...prev,
        name: updatedProject.name,
        projectCode: updatedProject.projectCode,
        description: updatedProject.description,
        projectManager: updatedProject.projectManager,
        sponsor: updatedProject.sponsor,
        startDate: updatedProject.startDate,
        targetEndDate: updatedProject.targetEndDate,
        baselineBudget: updatedProject.baselineBudget,
        authorizedBudget: updatedProject.authorizedBudget,
        status: updatedProject.status,
        color: updatedProject.color,
      }));
    }

    setIsCreateProjectModalOpen(false);
    setProjectToEdit(null);
    showToast(`Updated project "${updatedProject.name}" details.`);
  };

  const handlePromptDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleConfirmDeleteProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const projectName = project?.name || "Project";

    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== projectId);
      saveProjects(next);
      pushServerState({ projects: next, sprints });
      return next;
    });

    // Remove or unlink associated sprints
    setSprints((prev) => {
      const next = prev.filter((s) => s.projectId !== projectId && s.projectGroup !== projectName);
      saveSprints(next);
      return next;
    });

    // Unlink work items associated with deleted project
    setWbsItems((prev) => {
      const updated = prev.map((item) =>
        item.projectId === projectId || item.projectName === projectName
          ? { ...item, projectId: undefined, projectName: undefined }
          : item
      );
      return calculateWbsHierarchyRollups(updated, stakeholders).rolledUpItems;
    });

    // Reset workspace scope if active project is deleted
    if (activeProjectId === projectId) {
      setActiveProjectId("all");
      saveActiveProjectId("all");
      setSelectedSprintId(null);
    }

    setProjectToDelete(null);
    if (projectToEdit?.id === projectId) {
      setIsCreateProjectModalOpen(false);
      setProjectToEdit(null);
    }

    showToast(`Project "${projectName}" and its delivery configuration have been deleted.`);
  };

  const handleAddNewSprint = (newSprint: Sprint) => {
    setSprints((prev) => {
      const next = [newSprint, ...prev];
      saveSprints(next);
      pushServerState({ projects, sprints: next });
      return next;
    });
    showToast(`Created sprint: ${newSprint.name} (${newSprint.projectGroup || "Project"})`);
  };

  const handleOpenEditSprint = (sprint: Sprint) => {
    setSprintToEdit(sprint);
    setTargetSprintProjectId(sprint.projectId);
    setIsCreateSprintModalOpen(true);
  };

  const handleUpdateSprint = (updatedSprint: Sprint) => {
    setSprints((prev) => {
      const next = prev.map((s) => (s.id === updatedSprint.id ? updatedSprint : s));
      saveSprints(next);
      pushServerState({ projects, sprints: next });
      return next;
    });
    // Synchronize associated work items with new sprint and project details
    setWbsItems((prev) => {
      const updated = prev.map((item) =>
        item.sprintId === updatedSprint.id
          ? {
              ...item,
              sprintName: updatedSprint.name,
              projectId: updatedSprint.projectId,
              projectName: updatedSprint.projectGroup,
            }
          : item
      );
      return calculateWbsHierarchyRollups(updated, stakeholders).rolledUpItems;
    });
    setIsCreateSprintModalOpen(false);
    setSprintToEdit(null);
    showToast(`Updated sprint "${updatedSprint.name}" details.`);
  };

  const handlePromptDeleteSprint = (sprint: Sprint) => {
    setSprintToDelete(sprint);
  };

  const handleConfirmDeleteSprint = (sprintId: string) => {
    const sprintName = sprints.find((s) => s.id === sprintId)?.name || "Sprint";
    setSprints((prev) => {
      const next = prev.filter((s) => s.id !== sprintId);
      saveSprints(next);
      pushServerState({ projects, sprints: next });
      return next;
    });
    if (selectedSprintId === sprintId) {
      setSelectedSprintId(null);
    }
    // Detach work items from the deleted sprint
    setWbsItems((prev) => {
      const updated = prev.map((item) =>
        item.sprintId === sprintId
          ? { ...item, sprintId: undefined, sprintName: undefined }
          : item
      );
      return calculateWbsHierarchyRollups(updated, stakeholders).rolledUpItems;
    });
    setSprintToDelete(null);
    if (sprintToEdit?.id === sprintId) {
      setIsCreateSprintModalOpen(false);
      setSprintToEdit(null);
    }
    showToast(`Sprint "${sprintName}" has been deleted.`);
  };

  // Filter items by active project and optional selected sprint
  const filteredWbsItems = useMemo(() => {
    let items = wbsItems;
    if (activeProjectId !== "all") {
      items = items.filter((item) => {
        if (item.projectId) return item.projectId === activeProjectId;
        if (item.sprintId) {
          const itemSprint = sprints.find((s) => s.id === item.sprintId);
          if (itemSprint?.projectId) return itemSprint.projectId === activeProjectId;
        }
        // Default initial items to Flutter Project
        return activeProjectId === "proj-flutter";
      });
    }
    if (selectedSprintId) {
      items = items.filter((item) => item.sprintId === selectedSprintId);
    }
    return items;
  }, [wbsItems, activeProjectId, selectedSprintId, sprints]);

  // Automated WBS Hierarchy Roll-up (PMI 100% Rule, Time, Cost, RACI, Priority, Critical Path)
  const wbsRollupData = useMemo(() => {
    return calculateWbsHierarchyRollups(filteredWbsItems, stakeholders);
  }, [filteredWbsItems, stakeholders]);

  const rolledUpWbsItems = wbsRollupData.rolledUpItems;

  const filteredRaidItems = useMemo(() => {
    let items = raidItems;
    if (activeProjectId !== "all") {
      items = items.filter((r) => {
        if (r.projectId) return r.projectId === activeProjectId;
        if (r.sprintId) {
          const itemSprint = sprints.find((s) => s.id === r.sprintId);
          if (itemSprint?.projectId) return itemSprint.projectId === activeProjectId;
        }
        return activeProjectId === "proj-flutter";
      });
    }
    if (selectedSprintId) {
      if (selectedSprintId === "backlog") {
        items = items.filter((r) => {
          if (r.sprintId) return false;
          if (r.wbsItemId) {
            const wbs = wbsItems.find((w) => w.id === r.wbsItemId);
            if (wbs?.sprintId) return false;
          }
          return true;
        });
      } else {
        items = items.filter((r) => {
          if (r.sprintId) return r.sprintId === selectedSprintId;
          if (r.wbsItemId) {
            const wbs = wbsItems.find((w) => w.id === r.wbsItemId);
            if (wbs?.sprintId) return wbs.sprintId === selectedSprintId;
          }
          return false;
        });
      }
    }
    return items;
  }, [raidItems, activeProjectId, selectedSprintId, sprints, wbsItems]);

  const filteredStakeholders = useMemo(() => {
    if (activeProjectId === "all" && !selectedSprintId) {
      return stakeholders;
    }

    return stakeholders.filter((s) => {
      // 1. If sprint is selected:
      if (selectedSprintId) {
        if (s.sprintIds?.includes(selectedSprintId)) return true;
        const assignedInSprint = filteredWbsItems.some(
          (w) =>
            w.assignedStakeholderId === s.id ||
            w.assignedStakeholderIds?.includes(s.id) ||
            w.contributorStakeholderIds?.includes(s.id)
        );
        if (assignedInSprint) return true;
        const ownsRaidInSprint = filteredRaidItems.some((r) => r.ownerId === s.id);
        if (ownsRaidInSprint) return true;
        const hasRaciInSprint = raciEntries.some(
          (entry) =>
            filteredWbsItems.some((w) => w.id === entry.wbsItemId) &&
            Boolean(entry.assignments[s.id])
        );
        if (hasRaciInSprint) return true;
        return false;
      }

      // 2. If project is selected (no sprint specified):
      if (activeProjectId !== "all") {
        if (s.projectId === activeProjectId || s.projectIds?.includes(activeProjectId)) {
          return true;
        }
        const assignedInProject = filteredWbsItems.some(
          (w) =>
            w.assignedStakeholderId === s.id ||
            w.assignedStakeholderIds?.includes(s.id) ||
            w.contributorStakeholderIds?.includes(s.id)
        );
        if (assignedInProject) return true;
        const ownsRaidInProject = filteredRaidItems.some((r) => r.ownerId === s.id);
        if (ownsRaidInProject) return true;
        if (activeProjectId === "proj-flutter" && (s.id === "stk-1" || s.id === "stk-2" || s.id === "stk-4" || s.id === "stk-5" || s.id === "stk-6")) {
          return true;
        }
        return false;
      }

      return true;
    });
  }, [stakeholders, activeProjectId, selectedSprintId, filteredWbsItems, filteredRaidItems, raciEntries]);

  const filteredChangeRequests = useMemo(() => {
    let items = changeRequests;
    if (activeProjectId !== "all") {
      items = items.filter((cr) => {
        if (cr.projectId) return cr.projectId === activeProjectId;
        if (cr.sprintId) {
          const itemSprint = sprints.find((s) => s.id === cr.sprintId);
          if (itemSprint?.projectId) return itemSprint.projectId === activeProjectId;
        }
        return activeProjectId === "proj-flutter";
      });
    }
    if (selectedSprintId) {
      if (selectedSprintId === "backlog") {
        items = items.filter((cr) => {
          if (cr.sprintId) return false;
          if (cr.wbsItemId) {
            const wbs = wbsItems.find((w) => w.id === cr.wbsItemId);
            if (wbs?.sprintId) return false;
          }
          return true;
        });
      } else {
        items = items.filter((cr) => {
          if (cr.sprintId === selectedSprintId) return true;
          if (cr.wbsItemId) {
            const wbs = wbsItems.find((w) => w.id === cr.wbsItemId);
            if (wbs?.sprintId === selectedSprintId) return true;
          }
          return false;
        });
      }
    }
    return items;
  }, [changeRequests, activeProjectId, selectedSprintId, sprints, wbsItems]);

  const filteredSprints = useMemo(() => {
    if (activeProjectId === "all") return sprints;
    return sprints.filter((s) => s.projectId === activeProjectId);
  }, [sprints, activeProjectId]);

  const activeProject = useMemo(() => {
    if (activeProjectId === "all") return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const effectiveBudget = activeProject ? activeProject.authorizedBudget : projectSettings.authorizedBudget;

  // Dynamic EVM recalculation
  const evmMetrics = useMemo(() => {
    return calculateEvmMetrics(rolledUpWbsItems, stakeholders, effectiveBudget);
  }, [rolledUpWbsItems, stakeholders, effectiveBudget]);

  // Project-level items: Aggregates ALL sprints for activeProjectId or entire workspace
  // Ensures the Dashboard always adds up all sprints together when viewing a project
  const projectScopedWbsItems = useMemo(() => {
    let items = wbsItems;
    if (activeProjectId !== "all") {
      items = items.filter((item) => {
        if (item.projectId) return item.projectId === activeProjectId;
        if (item.sprintId) {
          const itemSprint = sprints.find((s) => s.id === item.sprintId);
          if (itemSprint?.projectId) return itemSprint.projectId === activeProjectId;
        }
        return activeProjectId === "proj-flutter";
      });
    }
    return items;
  }, [wbsItems, activeProjectId, sprints]);

  const projectScopedRolledUpWbsItems = useMemo(() => {
    return calculateWbsHierarchyRollups(projectScopedWbsItems, stakeholders).rolledUpItems;
  }, [projectScopedWbsItems, stakeholders]);

  const projectScopedEvmMetrics = useMemo(() => {
    return calculateEvmMetrics(projectScopedRolledUpWbsItems, stakeholders, effectiveBudget);
  }, [projectScopedRolledUpWbsItems, stakeholders, effectiveBudget]);

  const projectScopedRaidItems = useMemo(() => {
    let items = raidItems;
    if (activeProjectId !== "all") {
      items = items.filter((r) => {
        if (r.projectId) return r.projectId === activeProjectId;
        if (r.sprintId) {
          const itemSprint = sprints.find((s) => s.id === r.sprintId);
          if (itemSprint?.projectId) return itemSprint.projectId === activeProjectId;
        }
        return activeProjectId === "proj-flutter";
      });
    }
    return items;
  }, [raidItems, activeProjectId, sprints]);

  const projectScopedStakeholders = useMemo(() => {
    if (activeProjectId === "all") return stakeholders;
    return stakeholders.filter((s) => {
      if (s.projectId === activeProjectId || s.projectIds?.includes(activeProjectId)) return true;
      const assignedInProject = projectScopedWbsItems.some(
        (w) =>
          w.assignedStakeholderId === s.id ||
          w.assignedStakeholderIds?.includes(s.id) ||
          w.contributorStakeholderIds?.includes(s.id)
      );
      if (assignedInProject) return true;
      const ownsRaid = projectScopedRaidItems.some((r) => r.ownerId === s.id);
      if (ownsRaid) return true;
      return activeProjectId === "proj-flutter";
    });
  }, [stakeholders, activeProjectId, projectScopedWbsItems, projectScopedRaidItems]);

  const projectScopedChangeRequests = useMemo(() => {
    let items = changeRequests;
    if (activeProjectId !== "all") {
      items = items.filter((cr) => {
        if (cr.projectId) return cr.projectId === activeProjectId;
        if (cr.sprintId) {
          const itemSprint = sprints.find((s) => s.id === cr.sprintId);
          if (itemSprint?.projectId) return itemSprint.projectId === activeProjectId;
        }
        return activeProjectId === "proj-flutter";
      });
    }
    return items;
  }, [changeRequests, activeProjectId, sprints]);

  // High Density counts for badges
  const criticalRisksCount = filteredRaidItems.filter(
    (r) => r.category === "Risk" && (r.riskExposure || 0) >= 15 && r.status !== "Closed"
  ).length;

  const blockedWbsCount = rolledUpWbsItems.filter((i) => i.status === "Blocked").length;
  const pendingCrCount = changeRequests.filter(
    (c) => c.status === "Submitted" || c.status === "Under Review" || c.ccbStatus === "Pending CCB"
  ).length;

  // WBS CRUD - Intelligently recalculates and updates higher hierarchy across epics/milestones
  const handleAddWbsItem = (item: WbsItem) => {
    const itemWithProject: WbsItem = {
      ...item,
      projectId: item.projectId || (activeProjectId !== "all" ? activeProjectId : "proj-flutter"),
      projectName:
        item.projectName ||
        projects.find((p) => p.id === (item.projectId || (activeProjectId !== "all" ? activeProjectId : "proj-flutter")))?.name,
    };
    setWbsItems((prev) => {
      const next = [...prev, itemWithProject];
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

      {/* Left ClickUp Style Dual Dock and Hierarchy Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        sprints={sprints}
        activeProjectId={activeProjectId}
        selectedSprintId={selectedSprintId}
        onSelectProject={handleSelectProject}
        onSelectSprint={handleSelectSprint}
        onOpenCreateProject={() => setIsCreateProjectModalOpen(true)}
        onOpenCreateSprint={(projId) => {
          setSprintToEdit(null);
          setTargetSprintProjectId(projId || (activeProjectId !== "all" ? activeProjectId : projects[0]?.id));
          setIsCreateSprintModalOpen(true);
        }}
        onOpenEditSprint={handleOpenEditSprint}
        onDeleteSprint={handlePromptDeleteSprint}
        onOpenEditProject={handleOpenEditProject}
        onDeleteProject={handlePromptDeleteProject}
        onOpenCreateWorkItem={() => {
          setActiveTab("wbs");
        }}
        onOpenAiAssistant={() => {
          setActiveTab("documents");
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
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
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          projects={projects}
          sprints={sprints}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onOpenCreateProject={() => {
            setProjectToEdit(null);
            setIsCreateProjectModalOpen(true);
          }}
          onOpenCreateSprint={(projId) => {
            setSprintToEdit(null);
            setTargetSprintProjectId(projId || (activeProjectId !== "all" ? activeProjectId : projects[0]?.id));
            setIsCreateSprintModalOpen(true);
          }}
          onOpenEditProject={handleOpenEditProject}
          onPromptDeleteProject={handlePromptDeleteProject}
        />

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-5 md:p-6 space-y-6">
          {activeTab === "dashboard" && (
            <DashboardView
              wbsItems={projectScopedWbsItems}
              stakeholders={projectScopedStakeholders}
              raidItems={projectScopedRaidItems}
              changeRequests={projectScopedChangeRequests}
              evmMetrics={projectScopedEvmMetrics}
              statusConfigs={statusConfigs}
              onNavigateTab={setActiveTab}
              onGenerateReportClick={(type) => {
                setActiveTab("reports");
              }}
              projects={projects}
              sprints={sprints}
              activeProjectId={activeProjectId}
              selectedSprintId={selectedSprintId}
              onSelectProject={handleSelectProject}
              onSelectSprint={handleSelectSprint}
              onOpenEditSprint={handleOpenEditSprint}
              onDeleteSprint={handlePromptDeleteSprint}
              onOpenEditProject={handleOpenEditProject}
              onDeleteProject={handlePromptDeleteProject}
            />
          )}

          {activeTab === "wbs" && (
            <WbsView
              wbsItems={filteredWbsItems}
              stakeholders={filteredStakeholders}
              documents={documents}
              onAddWbsItem={handleAddWbsItem}
              onUpdateWbsItem={handleUpdateWbsItem}
              onDeleteWbsItem={handleDeleteWbsItem}
              onBatchAddWbsItems={handleBatchAddWbsItems}
              statusConfigs={statusConfigs}
              onUpdateStatusConfigs={handleUpdateStatusConfigs}
              onSyncAllTasks={handleSyncAllTasksWithStatusProgress}
              onApplyStatusProgressToTasks={handleApplyStatusProgressToTasks}
              projects={projects}
              sprints={filteredSprints}
              activeProjectId={activeProjectId}
              selectedSprintId={selectedSprintId}
              onAddNewProject={handleAddNewProject}
              onAddNewSprint={handleAddNewSprint}
              onSelectProject={handleSelectProject}
              onSelectSprint={handleSelectSprint}
            />
          )}

          {activeTab === "stakeholders" && (
            <StakeholdersView
              stakeholders={filteredStakeholders}
              wbsItems={filteredWbsItems}
              evmMetrics={evmMetrics}
              onAddStakeholder={handleAddStakeholder}
              onUpdateStakeholder={handleUpdateStakeholder}
              onDeleteStakeholder={handleDeleteStakeholder}
              activeProject={activeProject}
              selectedSprint={sprints.find((s) => s.id === selectedSprintId) || null}
              onClearSprint={() => handleSelectSprint(null)}
              totalOrgCount={stakeholders.length}
            />
          )}

          {activeTab === "raid" && (
            <RaidView
              raidItems={filteredRaidItems}
              allProjectRaidItems={projectScopedRaidItems}
              sprints={sprints}
              wbsItems={projectScopedWbsItems}
              stakeholders={filteredStakeholders}
              evmMetrics={evmMetrics}
              onAddRaidItem={handleAddRaidItem}
              onUpdateRaidItem={handleUpdateRaidItem}
              onDeleteRaidItem={handleDeleteRaidItem}
              onRequestRiskReport={() => setActiveTab("reports")}
              activeProject={activeProject}
              selectedSprint={sprints.find((s) => s.id === selectedSprintId) || null}
              onSelectSprint={setSelectedSprintId}
              onClearSprint={() => handleSelectSprint(null)}
            />
          )}

          {activeTab === "raci" && (
            <RaciView
              wbsItems={filteredWbsItems}
              stakeholders={filteredStakeholders}
              raciEntries={raciEntries}
              onUpdateRaciEntry={handleUpdateRaciEntry}
            />
          )}

          {activeTab === "change-management" && (
            <ChangeManagementView
              changeRequests={filteredChangeRequests}
              allProjectChangeRequests={projectScopedChangeRequests}
              stakeholders={filteredStakeholders}
              sprints={sprints}
              wbsItems={filteredWbsItems}
              projects={projects}
              activeProjectId={activeProjectId}
              selectedSprintId={selectedSprintId}
              onSelectSprint={setSelectedSprintId}
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
              wbsItems={filteredWbsItems}
              raidItems={filteredRaidItems}
              stakeholders={filteredStakeholders}
              changeRequests={filteredChangeRequests}
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
            <span className="text-slate-300">
              Project Context: {activeProject ? `${activeProject.name} (${activeProject.projectCode})` : "All Projects"}
            </span>
            <span>•</span>
            <span className="hidden sm:inline text-slate-400">Standard: PMBOK v7 / ANSI 99-001-2021</span>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-[#38BDF8] font-bold uppercase tracking-wider">
              {filteredSprints.length} Sprints • {filteredWbsItems.length} Work Items
            </span>
          </div>
        </footer>
      </main>

      {/* Global Project Creation & Edit Modal */}
      {isCreateProjectModalOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectModalOpen}
          onClose={() => {
            setIsCreateProjectModalOpen(false);
            setProjectToEdit(null);
          }}
          onSubmit={handleAddNewProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={(proj) => {
            setIsCreateProjectModalOpen(false);
            setProjectToEdit(null);
            setProjectToDelete(proj);
          }}
          projectToEdit={projectToEdit}
          stakeholders={stakeholders}
        />
      )}

      {/* Global Project Delete Confirmation Modal */}
      {projectToDelete && (
        <DeleteProjectModal
          isOpen={!!projectToDelete}
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onConfirmDelete={handleConfirmDeleteProject}
          associatedSprintsCount={sprints.filter((s) => s.projectId === projectToDelete.id || s.projectGroup === projectToDelete.name).length}
          associatedWbsCount={wbsItems.filter((w) => w.projectId === projectToDelete.id || w.projectName === projectToDelete.name).length}
        />
      )}

      {/* Global Sprint Creation & Edit Modal */}
      {isCreateSprintModalOpen && (
        <CreateSprintModal
          isOpen={isCreateSprintModalOpen}
          onClose={() => {
            setIsCreateSprintModalOpen(false);
            setSprintToEdit(null);
          }}
          onSubmit={handleAddNewSprint}
          onUpdateSprint={handleUpdateSprint}
          onDeleteSprint={(sprint) => {
            setIsCreateSprintModalOpen(false);
            setSprintToEdit(null);
            setSprintToDelete(sprint);
          }}
          sprintToEdit={sprintToEdit}
          projects={projects}
          defaultProjectId={targetSprintProjectId}
        />
      )}

      {/* Global Sprint Delete Confirmation Modal */}
      {sprintToDelete && (
        <DeleteSprintModal
          isOpen={!!sprintToDelete}
          sprint={sprintToDelete}
          onClose={() => setSprintToDelete(null)}
          onConfirmDelete={handleConfirmDeleteSprint}
          associatedWbsCount={wbsItems.filter((w) => w.sprintId === sprintToDelete.id).length}
        />
      )}

      {/* Multi-Device & Mobile Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        projects={projects}
        sprints={sprints}
        wbsItems={wbsItems}
        raidItems={raidItems}
        changeRequests={changeRequests}
        stakeholders={stakeholders}
        onApplyMergedData={handleApplyMergedData}
        showToast={showToast}
      />
    </div>
  );
}
