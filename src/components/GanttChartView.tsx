import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  WbsItem,
  Stakeholder,
  Project,
  Sprint,
  WorkItemStatus,
  WbsType,
} from "../types";
import {
  GanttChart,
  Flame,
  GitBranch,
  Calendar,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Filter,
  Search,
  Plus,
  X,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Info,
  Link2,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  FolderOpen,
  User,
  Sparkles,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import {
  PmiDependency,
  PmiDependencyType,
  calculateCpm,
  resolveEffectiveDependencies,
  parseDate,
  formatDate,
  buildPmiDependencyPath,
} from "../utils/pmiGanttUtils";
import { getStatusConfig } from "../utils/statusConfig";

interface GanttChartViewProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  projects?: Project[];
  sprints?: Sprint[];
  activeProjectId?: string;
  selectedSprintId?: string | null;
  onSelectProject?: (id: string) => void;
  onSelectSprint?: (sprintId: string | null) => void;
  onUpdateWbsItem: (item: WbsItem) => void;
  onOpenEditModal?: (item: WbsItem) => void;
  onOpenAddModal?: (parentId?: string | null, statusPreset?: WorkItemStatus) => void;
  initialHighlightCriticalPath?: boolean;
  initialShowDependencies?: boolean;
}

type ZoomLevel = "days" | "weeks" | "months";

export const GanttChartView: React.FC<GanttChartViewProps> = ({
  wbsItems,
  stakeholders,
  projects = [],
  sprints = [],
  activeProjectId,
  selectedSprintId = null,
  onSelectProject,
  onSelectSprint,
  onUpdateWbsItem,
  onOpenEditModal,
  onOpenAddModal,
  initialHighlightCriticalPath = true,
  initialShowDependencies = true,
}) => {
  // Visual Toggles (Core requirements)
  const [highlightCriticalPath, setHighlightCriticalPath] = useState<boolean>(initialHighlightCriticalPath);
  const [showDependencies, setShowDependencies] = useState<boolean>(initialShowDependencies);

  // Zoom and Layout State
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("weeks");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isActivityPaneCollapsed, setIsActivityPaneCollapsed] = useState(false);
  const [showPmiGuide, setShowPmiGuide] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Dependency Management Modal State
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);
  const [depModalTargetItem, setDepModalTargetItem] = useState<WbsItem | null>(null);
  const [selectedPredId, setSelectedPredId] = useState<string>("");
  const [selectedDepType, setSelectedDepType] = useState<PmiDependencyType>("FS");
  const [selectedLagDays, setSelectedLagDays] = useState<number>(0);

  // Expanded folders in hierarchy
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "wbs-1": true,
    "wbs-1-1": true,
    "wbs-1-2": true,
    "wbs-2": true,
    "wbs-2-1": true,
    "wbs-2-1-1": true,
    "wbs-2-2": true,
    "wbs-ang-1": true,
    "wbs-ang-1-1": true,
  });

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const leftTableRef = useRef<HTMLDivElement>(null);
  const ganttGridRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);
  const [isFullHeight, setIsFullHeight] = useState(false);

  // Synchronize vertical scrolling between left task list and right timeline canvas
  const handleLeftScroll = () => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    if (timelineContainerRef.current && leftTableRef.current) {
      timelineContainerRef.current.scrollTop = leftTableRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handleRightScroll = () => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    if (leftTableRef.current && timelineContainerRef.current) {
      leftTableRef.current.scrollTop = timelineContainerRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  // Stakeholder lookup map
  const stakeholderMap = useMemo(
    () => new Map(stakeholders.map((s) => [s.id, s])),
    [stakeholders]
  );

  // Filter items by project, sprint, search, and status
  const visibleItems = useMemo(() => {
    return wbsItems.filter((item) => {
      if (activeProjectId && activeProjectId !== "all") {
        if (item.projectId && item.projectId !== activeProjectId) {
          const matchingSprint = sprints.find((s) => s.id === item.sprintId);
          if (!matchingSprint || matchingSprint.projectId !== activeProjectId) {
            return false;
          }
        }
      }

      if (selectedSprintId && selectedSprintId !== "all") {
        if (item.sprintId && item.sprintId !== selectedSprintId) {
          return false;
        }
      }

      if (filterStatus !== "ALL" && item.status !== filterStatus) {
        return false;
      }

      if (filterType !== "ALL" && item.type !== filterType) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCode = item.wbsCode.toLowerCase().includes(q);
        const assignee = stakeholderMap.get(item.assignedStakeholderId || "");
        const matchAssignee = assignee && assignee.name.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [wbsItems, activeProjectId, selectedSprintId, filterStatus, filterType, searchQuery, sprints, stakeholderMap]);

  // Hierarchical item ordering
  const orderedItems = useMemo(() => {
    const itemMap = new Map(visibleItems.map((i) => [i.id, i]));
    const result: WbsItem[] = [];

    // Separate roots (parentId is null or parent not in current list)
    const roots = visibleItems.filter((i) => !i.parentId || !itemMap.has(i.parentId));

    // Sort roots by wbsCode
    roots.sort((a, b) => a.wbsCode.localeCompare(b.wbsCode, undefined, { numeric: true }));

    const traverse = (item: WbsItem) => {
      result.push(item);
      const isExpanded = expandedFolders[item.id] ?? true;
      if (isExpanded) {
        const children = visibleItems.filter((c) => c.parentId === item.id);
        children.sort((a, b) => a.wbsCode.localeCompare(b.wbsCode, undefined, { numeric: true }));
        children.forEach(traverse);
      }
    };

    roots.forEach(traverse);
    return result;
  }, [visibleItems, expandedFolders]);

  // Calculate CPM (Critical Path Method)
  const cpm = useMemo(() => {
    return calculateCpm(visibleItems);
  }, [visibleItems]);

  // Resolve dependencies
  const dependencies = useMemo(() => {
    return resolveEffectiveDependencies(visibleItems);
  }, [visibleItems]);

  // Predecessors map for fast UI display
  const predecessorsByItem = useMemo(() => {
    const map = new Map<string, PmiDependency[]>();
    dependencies.forEach((d) => {
      if (!map.has(d.successorId)) {
        map.set(d.successorId, []);
      }
      map.get(d.successorId)!.push(d);
    });
    return map;
  }, [dependencies]);

  // Timeline Boundaries
  const timelineDates = useMemo(() => {
    if (visibleItems.length === 0) {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 60);
      return { start: now, end, totalDays: 60 };
    }

    let minDate = parseDate(visibleItems[0].startDate);
    let maxDate = parseDate(visibleItems[0].dueDate);

    visibleItems.forEach((item) => {
      const s = parseDate(item.startDate);
      const d = parseDate(item.dueDate);
      if (s < minDate) minDate = s;
      if (d > maxDate) maxDate = d;
    });

    // Add padding (7 days before and 14 days after)
    const start = new Date(minDate);
    start.setDate(start.getDate() - 7);
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 14);

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(30, Math.ceil((end.getTime() - start.getTime()) / msPerDay));

    return { start, end, totalDays };
  }, [visibleItems]);

  // Pixel scaling based on zoom level
  const dayWidth = useMemo(() => {
    switch (zoomLevel) {
      case "days":
        return 40; // 40px per day
      case "weeks":
        return 18; // 18px per day (~126px per week)
      case "months":
        return 6; // 6px per day (~180px per month)
      default:
        return 18;
    }
  }, [zoomLevel]);

  const totalCanvasWidth = Math.max(1000, timelineDates.totalDays * dayWidth);
  const rowHeight = 44; // px per task row

  // Map item coordinates for SVG line rendering
  const itemCoordinates = useMemo(() => {
    const coords = new Map<string, { x: number; y: number; width: number; height: number }>();
    const startTime = timelineDates.start.getTime();
    const msPerDay = 1000 * 60 * 60 * 24;

    orderedItems.forEach((item, index) => {
      const s = parseDate(item.startDate);
      const d = parseDate(item.dueDate);
      const startDayOffset = Math.max(0, (s.getTime() - startTime) / msPerDay);
      const durationDays = Math.max(
        item.type === "Milestone" ? 0.3 : 1,
        (d.getTime() - s.getTime()) / msPerDay
      );

      const x = startDayOffset * dayWidth;
      const width = Math.max(item.type === "Milestone" ? 22 : 28, durationDays * dayWidth);
      const y = index * rowHeight + 8;
      const height = item.type === "Milestone" ? 22 : 26;

      coords.set(item.id, { x, y, width, height });
    });

    return coords;
  }, [orderedItems, timelineDates, dayWidth]);

  // Compute dependency link SVG paths
  const dependencyLinks = useMemo(() => {
    if (!showDependencies) return [];

    const links: Array<{
      id: string;
      predId: string;
      succId: string;
      type: PmiDependencyType;
      path: string;
      arrowX: number;
      arrowY: number;
      arrowDir: "right" | "left" | "down";
      isCriticalLink: boolean;
      predTitle: string;
      succTitle: string;
      predCode: string;
      succCode: string;
    }> = [];

    const itemMap = new Map(visibleItems.map((i) => [i.id, i]));

    dependencies.forEach((dep) => {
      const predBox = itemCoordinates.get(dep.predecessorId);
      const succBox = itemCoordinates.get(dep.successorId);
      const predItem = itemMap.get(dep.predecessorId);
      const succItem = itemMap.get(dep.successorId);

      if (predBox && succBox && predItem && succItem) {
        const { path, arrowX, arrowY, arrowDir } = buildPmiDependencyPath(
          predBox,
          succBox,
          dep.type
        );

        const isPredCritical = cpm.criticalPathIds.has(predItem.id);
        const isSuccCritical = cpm.criticalPathIds.has(succItem.id);
        const isCriticalLink = highlightCriticalPath && isPredCritical && isSuccCritical;

        links.push({
          id: `${dep.predecessorId}->${dep.successorId}:${dep.type}`,
          predId: dep.predecessorId,
          succId: dep.successorId,
          type: dep.type,
          path,
          arrowX,
          arrowY,
          arrowDir,
          isCriticalLink,
          predTitle: predItem.title,
          succTitle: succItem.title,
          predCode: predItem.wbsCode,
          succCode: succItem.wbsCode,
        });
      }
    });

    return links;
  }, [showDependencies, dependencies, itemCoordinates, visibleItems, cpm, highlightCriticalPath]);

  // Today indicator coordinate
  const todayX = useMemo(() => {
    const today = new Date();
    const startTime = timelineDates.start.getTime();
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = (today.getTime() - startTime) / msPerDay;
    if (diffDays < 0 || diffDays > timelineDates.totalDays) return null;
    return diffDays * dayWidth;
  }, [timelineDates, dayWidth]);

  // Timeline Header Intervals (Months & Days/Weeks)
  const timelineHeaders = useMemo(() => {
    const months: Array<{ label: string; startX: number; width: number }> = [];
    const subUnits: Array<{ label: string; startX: number; width: number; isWeekend?: boolean }> = [];

    const curr = new Date(timelineDates.start);
    let currentMonth = -1;
    let currentYear = -1;
    let monthStartX = 0;
    let monthWidth = 0;

    const msPerDay = 1000 * 60 * 60 * 24;
    const startTime = timelineDates.start.getTime();

    for (let day = 0; day < timelineDates.totalDays; day++) {
      const d = new Date(startTime + day * msPerDay);
      const x = day * dayWidth;
      const m = d.getMonth();
      const y = d.getFullYear();

      // Month Header tracking
      if (m !== currentMonth || y !== currentYear) {
        if (currentMonth !== -1) {
          months.push({
            label: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
              new Date(currentYear, currentMonth, 1)
            ),
            startX: monthStartX,
            width: monthWidth,
          });
        }
        currentMonth = m;
        currentYear = y;
        monthStartX = x;
        monthWidth = dayWidth;
      } else {
        monthWidth += dayWidth;
      }

      // Subunit Header tracking
      if (zoomLevel === "days") {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        subUnits.push({
          label: String(d.getDate()),
          startX: x,
          width: dayWidth,
          isWeekend,
        });
      } else if (zoomLevel === "weeks") {
        if (d.getDay() === 1 || day === 0) {
          // Monday or start
          subUnits.push({
            label: `W${getWeekNumber(d)}`,
            startX: x,
            width: dayWidth * 7,
          });
        }
      } else if (zoomLevel === "months") {
        // Just show major 1st and 15th intervals
        if (d.getDate() === 1 || d.getDate() === 15) {
          subUnits.push({
            label: String(d.getDate()),
            startX: x,
            width: dayWidth * 14,
          });
        }
      }
    }

    if (currentMonth !== -1) {
      months.push({
        label: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
          new Date(currentYear, currentMonth, 1)
        ),
        startX: monthStartX,
        width: monthWidth,
      });
    }

    return { months, subUnits };
  }, [timelineDates, dayWidth, zoomLevel]);

  function getWeekNumber(d: Date): number {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  // Scroll to Today or Project Start on mount
  useEffect(() => {
    if (timelineContainerRef.current) {
      if (todayX !== null && todayX > 200) {
        timelineContainerRef.current.scrollLeft = Math.max(0, todayX - 300);
      } else {
        timelineContainerRef.current.scrollLeft = 0;
      }
    }
  }, []);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  // Critical path statistics
  const criticalItemsCount = cpm.criticalPathIds.size;
  const blockedCriticalCount = visibleItems.filter(
    (i) => cpm.criticalPathIds.has(i.id) && i.status === "Blocked"
  ).length;

  // Handle adding new dependency to item
  const handleSaveDependency = () => {
    if (!depModalTargetItem || !selectedPredId) return;

    const currentDeps = depModalTargetItem.dependencies || [];
    const formattedDep =
      selectedDepType === "FS" && selectedLagDays === 0
        ? selectedPredId
        : `${selectedPredId}:${selectedDepType}${selectedLagDays !== 0 ? `:${selectedLagDays}` : ""}`;

    if (!currentDeps.some((d) => d.startsWith(selectedPredId))) {
      const updatedDeps = [...currentDeps, formattedDep];
      onUpdateWbsItem({
        ...depModalTargetItem,
        dependencies: updatedDeps,
      });
    }

    setIsDepModalOpen(false);
    setDepModalTargetItem(null);
    setSelectedPredId("");
  };

  const handleRemoveDependency = (targetItem: WbsItem, predIdToRemove: string) => {
    const currentDeps = targetItem.dependencies || [];
    const updated = currentDeps.filter((d) => !d.startsWith(predIdToRemove));
    onUpdateWbsItem({
      ...targetItem,
      dependencies: updated,
    });
  };

  return (
    <div className="flex flex-col bg-[#080B11] border border-[#1E293B] rounded-2xl text-slate-100 font-sans select-none shadow-2xl overflow-visible mb-6">
      {/* Top Banner: View Title & PMI CPM / Dependency Highlights */}
      <div className="px-5 py-3.5 border-b border-[#1E293B] bg-[#0A0E17] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <GanttChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Project Gantt Chart</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                PMI PMBOK 7th Ed.
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive timeline with Critical Path Method (CPM) and Precedence Diagramming (FS, SS, FF, SF)
            </p>
          </div>
        </div>

        {/* Action Controls & Visual Toggles (Core Requirement) */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Visual Toggle 1: Highlight Critical Path */}
          <button
            type="button"
            onClick={() => setHighlightCriticalPath(!highlightCriticalPath)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              highlightCriticalPath
                ? "bg-rose-950/80 text-rose-200 border-rose-500 ring-2 ring-rose-500/40 shadow-md shadow-rose-950/60"
                : "bg-[#141B2D] text-slate-400 border-[#2A3754] hover:text-slate-200 hover:border-slate-500"
            }`}
            title="Highlight activities with zero total float that govern the project finish date as per PMI CPM"
          >
            <Flame
              className={`w-4 h-4 ${
                highlightCriticalPath ? "text-rose-400 animate-pulse" : "text-slate-400"
              }`}
            />
            <span>Critical Path (CPM)</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                highlightCriticalPath ? "bg-rose-500/30 text-rose-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {criticalItemsCount}
            </span>
          </button>

          {/* Visual Toggle 2: Show Dependencies */}
          <button
            type="button"
            onClick={() => setShowDependencies(!showDependencies)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              showDependencies
                ? "bg-sky-950/80 text-sky-200 border-sky-500 ring-2 ring-sky-500/40 shadow-md shadow-sky-950/60"
                : "bg-[#141B2D] text-slate-400 border-[#2A3754] hover:text-slate-200 hover:border-slate-500"
            }`}
            title="Display interactive dependency lines and arrows (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish)"
          >
            <GitBranch
              className={`w-4 h-4 ${
                showDependencies ? "text-sky-400" : "text-slate-400"
              }`}
            />
            <span>Dependencies (PMI)</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                showDependencies ? "bg-sky-500/30 text-sky-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {dependencies.length}
            </span>
          </button>

          {/* Zoom Level Segmented Control */}
          <div className="flex items-center bg-[#141B2D] border border-[#2A3754] rounded-lg p-0.5 text-xs">
            {(["days", "weeks", "months"] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                  zoomLevel === z
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          {/* PMI Method Guide Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowPmiGuide(!showPmiGuide)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showPmiGuide
                ? "bg-indigo-900/60 border-indigo-500 text-indigo-200"
                : "bg-[#141B2D] border-[#2A3754] text-slate-400 hover:text-slate-200"
            }`}
            title="View PMI CPM & Precedence Diagramming Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Path KPI Banner (Shown when Highlight Critical Path is toggled ON) */}
      {highlightCriticalPath && (
        <div className="bg-gradient-to-r from-rose-950/40 via-[#161320] to-[#0A0E17] border-b border-rose-900/40 px-5 py-2.5 flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>CRITICAL PATH ACTIVE:</span>
            </div>
            <span className="text-slate-300">
              <strong className="text-white font-mono">{criticalItemsCount}</strong> tasks currently pacing the project finish date ({cpm.totalProjectDurationDays} total days).
            </span>
            <span className="bg-rose-900/40 text-rose-300 border border-rose-700/60 px-2 py-0.5 rounded font-mono text-[11px]">
              Total Float = 0 Days (Zero Slack)
            </span>
          </div>

          {blockedCriticalCount > 0 ? (
            <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded border border-rose-800/80 font-medium animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{blockedCriticalCount} Critical Path Task Blocked — Immediate Schedule Slippage!</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/40 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Critical Path On Track (SPI: 1.02)</span>
            </div>
          )}
        </div>
      )}

      {/* Filter and Scope Toolbar */}
      <div className="px-5 py-2.5 bg-[#0D121F] border-b border-[#1E293B] flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Project Scope Filter */}
          {projects.length > 0 && onSelectProject && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Project:</span>
              <select
                value={activeProjectId || "all"}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-[#141B2D] border border-[#2A3754] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sprint Filter */}
          {sprints.length > 0 && onSelectSprint && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Sprint:</span>
              <select
                value={selectedSprintId || "all"}
                onChange={(e) => onSelectSprint(e.target.value === "all" ? null : e.target.value)}
                className="bg-[#141B2D] border border-[#2A3754] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
              >
                <option value="all">All Sprints</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#141B2D] border border-[#2A3754] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Demoable">Demoable</option>
              <option value="Done">Done</option>
              <option value="To Do">To Do</option>
              <option value="Backlog">Backlog</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#141B2D] border border-[#2A3754] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All WBS Levels</option>
              <option value="Milestone">Milestones (◆)</option>
              <option value="Epic">Epics (⚡)</option>
              <option value="Feature">Features (✦)</option>
              <option value="User Story">User Stories (📖)</option>
              <option value="Task">Tasks (☑)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, WBS, owner..."
              className="w-48 sm:w-60 bg-[#141B2D] border border-[#2A3754] rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle Full Height View (Fit All Tasks vs Fixed Scroll Area) */}
          <button
            type="button"
            onClick={() => setIsFullHeight(!isFullHeight)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
              isFullHeight
                ? "bg-indigo-950/80 border-indigo-500 text-indigo-200"
                : "bg-[#141B2D] hover:bg-[#1D263E] border-[#2A3754] text-slate-300"
            }`}
            title={isFullHeight ? "Switch to Standard Viewport Height" : "Expand All Rows to Fit Page (Page Scroll Mode)"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isFullHeight ? "Standard View" : "Expand View"}</span>
          </button>

          {/* Toggle Activity Table Pane */}
          <button
            type="button"
            onClick={() => setIsActivityPaneCollapsed(!isActivityPaneCollapsed)}
            className="px-2.5 py-1 rounded-lg bg-[#141B2D] hover:bg-[#1D263E] border border-[#2A3754] text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            title={isActivityPaneCollapsed ? "Expand Activity Table" : "Collapse Activity Table"}
          >
            {isActivityPaneCollapsed ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Show Table</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Compact Table</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PMI Methodology Explainer Drawer (Toggleable) */}
      {showPmiGuide && (
        <div className="bg-[#0B101C] border-b border-[#24314E] px-5 py-3 text-xs text-slate-300 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              PMI Precedence Diagramming Method (PDM) & Critical Path Method (CPM) Standards
            </span>
            <button
              onClick={() => setShowPmiGuide(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-[#101728] border border-[#1E2C48]">
              <span className="font-bold text-sky-300 block mb-1">FS: Finish-to-Start</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The initiation of the successor activity depends upon the completion of the predecessor activity (most common PMI relationship).
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101728] border border-[#1E2C48]">
              <span className="font-bold text-indigo-300 block mb-1">SS: Start-to-Start</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The initiation of the successor activity depends upon the initiation of the predecessor activity (fast-tracking parallel work).
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101728] border border-[#1E2C48]">
              <span className="font-bold text-emerald-300 block mb-1">FF: Finish-to-Finish</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The completion of the successor activity depends upon the completion of the predecessor activity (synchronized closure).
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101728] border border-[#1E2C48]">
              <span className="font-bold text-rose-300 block mb-1">CPM: Critical Path</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The sequence of activities that represents the longest path through a project, determining the shortest possible project duration (Zero Total Float).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Split-View Gantt Body */}
      <div
        className={`flex border-t border-[#1E293B] bg-[#0A0E17] rounded-b-2xl relative overflow-hidden transition-all duration-300 ${
          isFullHeight
            ? "min-h-[750px] lg:min-h-[880px]"
            : "h-[540px] sm:h-[620px] lg:h-[700px]"
        }`}
      >
        {/* Left Side: WBS Task List / Activity Pane */}
        {!isActivityPaneCollapsed && (
          <div className="w-80 sm:w-96 border-r border-[#1E293B] bg-[#0A0E17] flex flex-col shrink-0 overflow-hidden">
            {/* Activity Table Header */}
            <div className="h-[60px] border-b border-[#1E293B] bg-[#0E1322] px-3 flex items-center justify-between text-xs font-semibold text-slate-300 shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Activity / Deliverable</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <span>Duration</span>
                <span>Float</span>
              </div>
            </div>

            {/* Activity Rows */}
            <div
              ref={leftTableRef}
              onScroll={handleLeftScroll}
              className={`flex-1 overflow-y-auto divide-y divide-[#182033]/60 ${
                isFullHeight ? "max-h-[85vh]" : ""
              }`}
            >
              {orderedItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No work items match current filter criteria.
                </div>
              ) : (
                orderedItems.map((item) => {
                  const hasChildren = visibleItems.some((c) => c.parentId === item.id);
                  const isExpanded = expandedFolders[item.id] ?? true;
                  const isCritical = cpm.criticalPathIds.has(item.id);
                  const cpmMetrics = cpm.activities[item.id];
                  const totalFloat = cpmMetrics?.totalFloat ?? (isCritical ? 0 : 4);
                  const isSelected = selectedItemId === item.id;
                  const itemPreds = predecessorsByItem.get(item.id) || [];

                  // Hierarchy indentation
                  const depth = (item.wbsCode.match(/\./g) || []).length;
                  const indentPx = Math.min(depth * 14, 56);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`h-[44px] px-3 flex items-center justify-between text-xs transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-indigo-950/50 border-l-2 border-indigo-400"
                          : highlightCriticalPath && isCritical
                          ? "bg-rose-950/20 hover:bg-rose-950/40 border-l-2 border-rose-500/80"
                          : "hover:bg-[#121829] border-l-2 border-transparent"
                      }`}
                      style={{ paddingLeft: `${12 + indentPx}px` }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFolder(item.id);
                            }}
                            className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4 text-center text-[10px] text-slate-500 font-mono">
                            {item.type === "Milestone" ? "◆" : "•"}
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {item.wbsCode}
                        </span>

                        <span
                          className={`truncate font-medium ${
                            item.type === "Milestone"
                              ? "font-bold text-amber-300"
                              : highlightCriticalPath && isCritical
                              ? "text-rose-200 font-semibold"
                              : "text-slate-200"
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </span>

                        {/* Critical Path Badge */}
                        {highlightCriticalPath && isCritical && (
                          <span
                            className="shrink-0 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono flex items-center gap-0.5"
                            title="Zero Float Critical Path Activity"
                          >
                            <Flame className="w-2.5 h-2.5 text-rose-400" />
                            CPM
                          </span>
                        )}

                        {/* Predecessors chips */}
                        {showDependencies && itemPreds.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1">
                            {itemPreds.map((p) => {
                              const pItem = visibleItems.find((vi) => vi.id === p.predecessorId);
                              return (
                                <span
                                  key={p.predecessorId}
                                  className="px-1 py-0.2 rounded text-[8.5px] font-mono bg-sky-950/80 text-sky-300 border border-sky-700/60"
                                  title={`Predecessor: ${pItem?.title || p.predecessorId} (${p.type})`}
                                >
                                  {pItem?.wbsCode || p.predecessorId}
                                  <span className="text-slate-400 ml-0.5">({p.type})</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right metadata (Duration & Float) */}
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="text-slate-400">
                          {item.type === "Milestone"
                            ? "0d"
                            : `${cpmMetrics?.durationDays || 1}d`}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isCritical
                              ? "bg-rose-950 text-rose-300 font-bold border border-rose-800/60"
                              : "text-slate-400 bg-slate-900/60"
                          }`}
                        >
                          {totalFloat}d
                        </span>

                        {/* Quick Add/Edit dependency button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDepModalTargetItem(item);
                            setSelectedPredId("");
                            setSelectedDepType("FS");
                            setSelectedLagDays(0);
                            setIsDepModalOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-200 transition-opacity"
                          title="Add / Configure Dependencies (FS, SS, FF, SF)"
                        >
                          <Link2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Side: Interactive Gantt Canvas */}
        <div
          ref={timelineContainerRef}
          onScroll={handleRightScroll}
          className={`flex-1 overflow-x-auto overflow-y-auto bg-[#07090F] relative ${
            isFullHeight ? "max-h-[85vh]" : ""
          }`}
        >
          <div
            style={{ width: `${totalCanvasWidth}px`, minHeight: "100%" }}
            className="relative flex flex-col"
          >
            {/* Timeline Header (Months & Days) */}
            <div className="sticky top-0 z-20 h-[60px] bg-[#0B0F19] border-b border-[#1E293B] shadow-sm shrink-0">
              {/* Top Row: Months */}
              <div className="h-[28px] border-b border-[#1E293B]/70 relative flex items-center">
                {timelineHeaders.months.map((m, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 border-r border-[#1E293B]/80 px-2.5 flex items-center text-[11px] font-bold text-slate-300 tracking-wider font-mono uppercase bg-[#0D1322]"
                    style={{ left: `${m.startX}px`, width: `${m.width}px` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Bottom Row: Days / Weeks */}
              <div className="h-[32px] relative flex items-center text-[10px] font-mono text-slate-400">
                {timelineHeaders.subUnits.map((u, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 border-r border-[#172033]/60 flex items-center justify-center ${
                      u.isWeekend ? "bg-[#0D101C]/50 text-slate-600" : ""
                    }`}
                    style={{ left: `${u.startX}px`, width: `${u.width}px` }}
                  >
                    {u.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas Body & Background Grid */}
            <div
              ref={ganttGridRef}
              className="relative flex-1"
              style={{ minHeight: `${orderedItems.length * rowHeight + 40}px` }}
            >
              {/* Vertical Date Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                {timelineHeaders.subUnits.map((u, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 border-r border-[#141B2D]/40 ${
                      u.isWeekend ? "bg-black/20" : ""
                    }`}
                    style={{ left: `${u.startX}px`, width: `${u.width}px` }}
                  />
                ))}
              </div>

              {/* Today's Marker Line */}
              {todayX !== null && (
                <div
                  className="absolute top-0 bottom-0 z-15 pointer-events-none border-l-2 border-dashed border-rose-500 flex flex-col items-center"
                  style={{ left: `${todayX}px` }}
                >
                  <span className="bg-rose-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-md mt-1 -translate-x-1/2">
                    Today
                  </span>
                </div>
              )}

              {/* SVG Layer for PMI Dependency Connection Lines */}
              {showDependencies && (
                <svg
                  className="absolute inset-0 pointer-events-none z-10 w-full h-full overflow-visible"
                  style={{ width: `${totalCanvasWidth}px`, height: `${orderedItems.length * rowHeight + 40}px` }}
                >
                  <defs>
                    {/* Standard Dependency Arrowhead */}
                    <marker
                      id="arrow-sky"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                    </marker>

                    {/* Critical Path Arrowhead (Crimson Glow) */}
                    <marker
                      id="arrow-rose"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill="#f43f5e" />
                    </marker>

                    {/* Reverse Arrowhead for FF / SF */}
                    <marker
                      id="arrow-sky-rev"
                      viewBox="0 0 10 10"
                      refX="2"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 10 1 L 0 5 L 10 9 z" fill="#38bdf8" />
                    </marker>

                    <marker
                      id="arrow-rose-rev"
                      viewBox="0 0 10 10"
                      refX="2"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 10 0.5 L 0 5 L 10 9.5 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {/* Render dependency lines */}
                  {dependencyLinks.map((link) => {
                    const isCritical = link.isCriticalLink;
                    const strokeColor = isCritical ? "#f43f5e" : "#38bdf8";
                    const strokeWidth = isCritical ? 2.5 : 1.5;
                    const markerId = isCritical
                      ? link.arrowDir === "left"
                        ? "url(#arrow-rose-rev)"
                        : "url(#arrow-rose)"
                      : link.arrowDir === "left"
                      ? "url(#arrow-sky-rev)"
                      : "url(#arrow-sky)";

                    return (
                      <g key={link.id} className="transition-opacity duration-200">
                        {/* Glow effect on critical path dependency */}
                        {isCritical && (
                          <path
                            d={link.path}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth={5}
                            strokeOpacity={0.25}
                            strokeLinecap="round"
                          />
                        )}

                        {/* Main Dependency Connector Line */}
                        <path
                          d={link.path}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={isCritical ? "6 3" : undefined}
                          markerEnd={markerId}
                          strokeLinecap="round"
                          className="pointer-events-stroke hover:stroke-white cursor-pointer"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Task Row Bands & Gantt Bars */}
              {orderedItems.map((item, index) => {
                const box = itemCoordinates.get(item.id);
                if (!box) return null;

                const isCritical = cpm.criticalPathIds.has(item.id);
                const isSelected = selectedItemId === item.id;
                const statusConf = getStatusConfig(item.status);
                const assignee = stakeholderMap.get(item.assignedStakeholderId || "");

                // Dim non-critical items when Critical Path toggle is active
                const isDimmed = highlightCriticalPath && !isCritical;

                return (
                  <div
                    key={item.id}
                    className={`absolute w-full h-[44px] border-b border-[#141B2D]/40 flex items-center transition-colors ${
                      isSelected
                        ? "bg-indigo-950/20"
                        : index % 2 === 0
                        ? "bg-transparent"
                        : "bg-[#090D18]/30"
                    }`}
                    style={{ top: `${index * rowHeight}px` }}
                  >
                    {/* Render Bar based on WBS Type */}
                    {item.type === "Milestone" ? (
                      /* Milestone Diamond */
                      <div
                        onClick={() => {
                          setSelectedItemId(item.id);
                          if (onOpenEditModal) onOpenEditModal(item);
                        }}
                        className={`absolute z-12 cursor-pointer flex items-center group transition-transform hover:scale-110 ${
                          isDimmed ? "opacity-40" : "opacity-100"
                        }`}
                        style={{ left: `${box.x}px`, top: `${box.y}px` }}
                        title={`${item.title} (Milestone • ${item.dueDate})`}
                      >
                        <div
                          className={`w-5 h-5 rotate-45 rounded-xs transition-all shadow-md ${
                            highlightCriticalPath && isCritical
                              ? "bg-gradient-to-tr from-rose-600 to-red-500 ring-2 ring-rose-400 shadow-rose-600/40"
                              : "bg-gradient-to-tr from-amber-500 to-yellow-400 ring-2 ring-amber-300 shadow-amber-500/30"
                          }`}
                        />
                        <span className="ml-3 text-[11px] font-bold text-amber-300 whitespace-nowrap drop-shadow-md">
                          {item.wbsCode} {item.title}
                        </span>
                      </div>
                    ) : item.type === "Epic" ? (
                      /* Epic Summary Bar */
                      <div
                        onClick={() => {
                          setSelectedItemId(item.id);
                          if (onOpenEditModal) onOpenEditModal(item);
                        }}
                        className={`absolute z-12 h-6 rounded-md cursor-pointer group transition-all ${
                          isDimmed ? "opacity-35" : "opacity-100"
                        }`}
                        style={{
                          left: `${box.x}px`,
                          width: `${box.width}px`,
                          top: `${box.y}px`,
                        }}
                        title={`${item.wbsCode}: ${item.title} (${item.progressPercent}% complete)`}
                      >
                        {/* Summary Bar Bracket */}
                        <div
                          className={`w-full h-full rounded-md border flex items-center justify-between px-2 shadow-md ${
                            highlightCriticalPath && isCritical
                              ? "bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/50 text-rose-200"
                              : "bg-purple-950/70 border-purple-500/80 text-purple-200"
                          }`}
                        >
                          <span className="text-[10px] font-bold truncate flex items-center gap-1">
                            <span>⚡</span>
                            <span>{item.title}</span>
                          </span>
                          <span className="text-[9px] font-mono opacity-80 shrink-0">
                            {item.progressPercent}%
                          </span>
                        </div>

                        {/* Progress Fill Underlay */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 rounded-md opacity-30 ${
                            highlightCriticalPath && isCritical ? "bg-rose-500" : "bg-purple-400"
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    ) : (
                      /* Standard Task / Feature / Story Bar */
                      <div
                        onClick={() => {
                          setSelectedItemId(item.id);
                          if (onOpenEditModal) onOpenEditModal(item);
                        }}
                        className={`absolute z-12 h-6 rounded-md cursor-pointer group transition-all overflow-hidden flex items-center shadow-md ${
                          isDimmed ? "opacity-35" : "opacity-100"
                        } ${
                          highlightCriticalPath && isCritical
                            ? "bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 border border-rose-400 ring-2 ring-rose-500/60 shadow-rose-900/40"
                            : item.status === "Done"
                            ? "bg-emerald-800/80 border border-emerald-500/80"
                            : item.status === "Blocked"
                            ? "bg-rose-900/90 border border-rose-500"
                            : item.status === "Demoable"
                            ? "bg-cyan-800/80 border border-cyan-500/80"
                            : "bg-indigo-700/80 border border-indigo-400/80"
                        }`}
                        style={{
                          left: `${box.x}px`,
                          width: `${box.width}px`,
                          top: `${box.y}px`,
                        }}
                        title={`${item.wbsCode}: ${item.title}\nStatus: ${item.status}\nProgress: ${item.progressPercent}%\nDates: ${item.startDate} to ${item.dueDate}`}
                      >
                        {/* Progress Fill Bar */}
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-white/20 transition-all"
                          style={{ width: `${item.progressPercent}%` }}
                        />

                        {/* Bar Content */}
                        <div className="relative z-2 px-2 w-full flex items-center justify-between text-[10px] font-medium text-white select-none pointer-events-none">
                          <span className="truncate pr-1">
                            {box.width > 60 && item.title}
                          </span>
                          <span className="font-mono text-[9px] opacity-90 shrink-0">
                            {box.width > 40 && `${item.progressPercent}%`}
                          </span>
                        </div>

                        {/* Critical Path Halo */}
                        {highlightCriticalPath && isCritical && (
                          <div className="absolute inset-0 border border-white/40 rounded-md pointer-events-none" />
                        )}
                      </div>
                    )}

                    {/* Task Label outside bar if bar is too narrow */}
                    {item.type !== "Milestone" && box.width <= 60 && (
                      <span
                        className={`absolute text-[10px] font-medium whitespace-nowrap ml-2 pointer-events-none ${
                          highlightCriticalPath && isCritical ? "text-rose-300 font-semibold" : "text-slate-300"
                        }`}
                        style={{ left: `${box.x + box.width + 6}px` }}
                      >
                        {item.title}
                      </span>
                    )}

                    {/* Assignee Avatar Chip right after bar */}
                    {assignee && (
                      <div
                        className="absolute flex items-center gap-1 pointer-events-none text-[10px] text-slate-400"
                        style={{ left: `${box.x + box.width + (box.width <= 60 ? item.title.length * 6 + 18 : 8)}px` }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-white text-[8px] font-bold"
                          style={{ backgroundColor: assignee.avatarColor || "#6366f1" }}
                        >
                          {assignee.name.charAt(0)}
                        </div>
                        <span className="hidden md:inline text-[9.5px] truncate max-w-[90px]">
                          {assignee.name.split(" ")[0]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dependency Creator / Editor Modal */}
      {isDepModalOpen && depModalTargetItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0D121F] border border-[#24314E] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#1E293B] bg-[#0A0E17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Configure Predecessors & PMI Dependencies
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsDepModalOpen(false);
                  setDepModalTargetItem(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-[#141B2D] border border-[#2A3754]">
                <span className="text-slate-400 text-[11px] block">Target Work Item:</span>
                <span className="font-bold text-white text-sm">
                  {depModalTargetItem.wbsCode} {depModalTargetItem.title}
                </span>
              </div>

              {/* Existing Predecessors */}
              <div>
                <span className="font-semibold text-slate-300 block mb-2">
                  Existing Dependencies:
                </span>
                {(!depModalTargetItem.dependencies || depModalTargetItem.dependencies.length === 0) ? (
                  <p className="text-slate-500 italic">No dependencies linked to this work item.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {depModalTargetItem.dependencies.map((depStr) => {
                      const parts = depStr.split(":");
                      const predId = parts[0];
                      const type = parts[1] || "FS";
                      const lag = parts[2] ? `+${parts[2]}d` : "";
                      const predItem = visibleItems.find((i) => i.id === predId);

                      return (
                        <div
                          key={depStr}
                          className="flex items-center justify-between p-2 rounded bg-[#0A0E17] border border-[#1E293B]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/60">
                              {type}
                            </span>
                            <span className="font-mono text-slate-400">{predItem?.wbsCode || predId}</span>
                            <span className="text-slate-200 truncate max-w-[200px]">
                              {predItem?.title || predId}
                            </span>
                            {lag && <span className="text-slate-400 font-mono text-[10px]">{lag}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(depModalTargetItem, predId)}
                            className="text-rose-400 hover:text-rose-200 p-1 hover:bg-rose-950/50 rounded"
                            title="Remove dependency"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Predecessor Form */}
              <div className="pt-3 border-t border-[#1E293B] space-y-3">
                <span className="font-semibold text-white block">Add New Predecessor:</span>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Select Predecessor Task:</label>
                  <select
                    value={selectedPredId}
                    onChange={(e) => setSelectedPredId(e.target.value)}
                    className="w-full bg-[#141B2D] border border-[#2A3754] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Predecessor Activity --</option>
                    {visibleItems
                      .filter((i) => i.id !== depModalTargetItem.id)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.wbsCode} - {i.title} ({i.status})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">PMI Dependency Type:</label>
                    <select
                      value={selectedDepType}
                      onChange={(e) => setSelectedDepType(e.target.value as PmiDependencyType)}
                      className="w-full bg-[#141B2D] border border-[#2A3754] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="FS">Finish-to-Start (FS - Standard)</option>
                      <option value="SS">Start-to-Start (SS - Parallel)</option>
                      <option value="FF">Finish-to-Finish (FF - Concurrent)</option>
                      <option value="SF">Start-to-Finish (SF - Gating)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Lag / Lead Time (Days):</label>
                    <input
                      type="number"
                      value={selectedLagDays}
                      onChange={(e) => setSelectedLagDays(parseInt(e.target.value, 10) || 0)}
                      placeholder="0"
                      className="w-full bg-[#141B2D] border border-[#2A3754] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#1E293B] bg-[#0A0E17] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDepModalOpen(false);
                  setDepModalTargetItem(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedPredId}
                onClick={handleSaveDependency}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Dependency</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
