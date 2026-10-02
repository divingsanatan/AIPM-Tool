import React, { useMemo } from "react";
import { Project, WbsItem, RaidItem, Sprint, ActiveTab } from "../../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Folder,
  Layers,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Target,
} from "lucide-react";
import { getTotalBlockedSeconds } from "../../utils/wbsTimerUtils";

interface PortfolioPerformanceViewProps {
  projects: Project[];
  allWbsItems: WbsItem[];
  allRaidItems: RaidItem[];
  allSprints: Sprint[];
  activeProjectId: string;
  onSelectProject?: (id: string) => void;
  onRedirectToArea?: (tab: ActiveTab, params?: { projectId?: string; sprintId?: string | null }) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const PortfolioPerformanceView: React.FC<PortfolioPerformanceViewProps> = ({
  projects,
  allWbsItems,
  allRaidItems,
  allSprints,
  activeProjectId,
  onSelectProject,
  onRedirectToArea,
  onNavigateTab,
}) => {
  // Calculate performance rollups for every project
  const projectPerformances = useMemo(() => {
    return projects.map((project) => {
      // Find matching WBS items
      const items = allWbsItems.filter(
        (i) =>
          i.projectId === project.id ||
          (project.id === "proj-flutter" && (!i.projectId || i.projectId === "proj-flutter")) ||
          i.projectName === project.name
      );

      const totalTasks = items.length;
      const completedTasks = items.filter((i) => i.status === "Done").length;
      const blockedTasks = items.filter(
        (i) => i.status === "Blocked" || getTotalBlockedSeconds(i) > 0
      ).length;

      const plannedBudget = project.authorizedBudget || project.baselineBudget || 150000;
      const totalPlanned = items.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
      const actualCost = items.reduce((sum, i) => sum + (Number(i.actualCost) || 0), 0);

      // Earned Value
      const earnedValue = items.reduce((sum, i) => {
        const prog = i.progressPercent !== undefined ? i.progressPercent : (i.status === "Done" ? 100 : 0);
        return sum + ((Number(i.plannedBudget) || 0) * prog) / 100;
      }, 0);

      const plannedValue = totalPlanned > 0 ? totalPlanned : plannedBudget;
      const cpi = actualCost > 0 ? earnedValue / actualCost : (earnedValue > 0 ? 1.05 : 1.0);
      const spi = plannedValue > 0 ? earnedValue / plannedValue : 1.0;
      const cv = earnedValue - actualCost;
      const sv = earnedValue - plannedValue;

      const avgProgress = totalTasks > 0
        ? Math.round(items.reduce((sum, i) => sum + (i.progressPercent || 0), 0) / totalTasks)
        : (project.status === "Completed" ? 100 : 25);

      // RAID items
      const projectRisks = allRaidItems.filter(
        (r) => r.projectId === project.id || (!r.projectId && project.id === "proj-flutter")
      );
      const highRisksCount = projectRisks.filter((r) => (r.riskExposure || 0) >= 15).length;

      // Determine health
      let healthStatus: "Ahead" | "Healthy" | "At Risk" | "Critical" = "Healthy";
      if (cpi < 0.85 || spi < 0.85 || blockedTasks >= 3) {
        healthStatus = "Critical";
      } else if (cpi < 0.95 || spi < 0.95 || blockedTasks > 0) {
        healthStatus = "At Risk";
      } else if (cpi >= 1.05 && spi >= 1.0) {
        healthStatus = "Ahead";
      }

      return {
        project,
        totalTasks,
        completedTasks,
        blockedTasks,
        plannedBudget,
        plannedValue,
        earnedValue,
        actualCost,
        cpi: Number(cpi.toFixed(2)),
        spi: Number(spi.toFixed(2)),
        cv: Math.round(cv),
        sv: Math.round(sv),
        avgProgress,
        highRisksCount,
        healthStatus,
      };
    });
  }, [projects, allWbsItems, allRaidItems]);

  // Aggregate Portfolio Totals
  const portfolioAggregates = useMemo(() => {
    const totalProjects = projectPerformances.length;
    const totalBudget = projectPerformances.reduce((sum, p) => sum + p.plannedBudget, 0);
    const totalEV = projectPerformances.reduce((sum, p) => sum + p.earnedValue, 0);
    const totalAC = projectPerformances.reduce((sum, p) => sum + p.actualCost, 0);
    const totalPV = projectPerformances.reduce((sum, p) => sum + p.plannedValue, 0);
    const totalBlockers = projectPerformances.reduce((sum, p) => sum + p.blockedTasks, 0);
    const totalHighRisks = projectPerformances.reduce((sum, p) => sum + p.highRisksCount, 0);

    const overallCpi = totalAC > 0 ? Number((totalEV / totalAC).toFixed(2)) : 1.0;
    const overallSpi = totalPV > 0 ? Number((totalEV / totalPV).toFixed(2)) : 1.0;
    const totalCv = Math.round(totalEV - totalAC);

    const healthyCount = projectPerformances.filter((p) => p.healthStatus === "Healthy" || p.healthStatus === "Ahead").length;

    return {
      totalProjects,
      totalBudget,
      totalEV,
      totalAC,
      overallCpi,
      overallSpi,
      totalCv,
      totalBlockers,
      totalHighRisks,
      healthyCount,
    };
  }, [projectPerformances]);

  // Chart data: CPI vs SPI benchmark
  const efficiencyChartData = useMemo(() => {
    return projectPerformances.map((p) => ({
      name: p.project.name.length > 20 ? p.project.projectCode || p.project.name.slice(0, 16) + "..." : p.project.name,
      cpi: p.cpi,
      spi: p.spi,
      code: p.project.projectCode,
    }));
  }, [projectPerformances]);

  // Chart data: Budget vs Spend vs EV (in thousands)
  const financialChartData = useMemo(() => {
    return projectPerformances.map((p) => ({
      name: p.project.projectCode || p.project.name.slice(0, 14),
      Budget: Math.round(p.plannedBudget / 1000),
      Spend: Math.round(p.actualCost / 1000),
      EarnedValue: Math.round(p.earnedValue / 1000),
    }));
  }, [projectPerformances]);

  const handleJumpToProject = (projId: string, tab: ActiveTab = "dashboard") => {
    if (onRedirectToArea) {
      onRedirectToArea(tab, { projectId: projId });
    } else {
      if (onSelectProject) onSelectProject(projId);
      onNavigateTab(tab);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Rollup Summary Header */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                Cross-Project Portfolio Performance Benchmark
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {portfolioAggregates.totalProjects} Active Projects
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Comparative analysis of cost pacing (CPI), schedule adherence (SPI), budget consumption, and risk exposure across all projects.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">
              Portfolio Health:{" "}
              <strong className="text-emerald-400">
                {portfolioAggregates.healthyCount}/{portfolioAggregates.totalProjects} Projects On Track
              </strong>
            </span>
          </div>
        </div>

        {/* 5 Portfolio KPI Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Total Authorized Capital
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5 block">
              ${(portfolioAggregates.totalBudget / 1000).toFixed(0)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Across {portfolioAggregates.totalProjects} initiatives
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Portfolio Earned Value
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
              ${(portfolioAggregates.totalEV / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Delivered progress value
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Portfolio Actual Cost
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-0.5 block">
              ${(portfolioAggregates.totalAC / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Incurred labor & assets
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Portfolio CPI & SPI
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-lg sm:text-xl font-bold font-mono ${portfolioAggregates.overallCpi >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
                {portfolioAggregates.overallCpi.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">/</span>
              <span className={`text-base sm:text-lg font-bold font-mono ${portfolioAggregates.overallSpi >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
                {portfolioAggregates.overallSpi.toFixed(2)}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Target benchmark: 1.00
            </span>
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
              Impediments & Risks
            </span>
            <span className={`text-lg sm:text-xl font-bold font-mono mt-0.5 block ${portfolioAggregates.totalBlockers > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {portfolioAggregates.totalBlockers} Blocked · {portfolioAggregates.totalHighRisks} Risks
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Requires executive review
            </span>
          </div>
        </div>
      </div>

      {/* Comparative Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: CPI & SPI Efficiency Benchmark */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                CPI & SPI Index Benchmark
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Cost vs Schedule pacing per project (Reference Line: 1.00)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> CPI
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> SPI
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1.6]} tickLine={false} />
                <ReferenceLine y={1.0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Target (1.00)", fill: "#f43f5e", fontSize: 10, position: "top" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#060911",
                    borderColor: "#1E293B",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    color: "#f8fafc",
                  }}
                />
                <Bar dataKey="cpi" name="Cost Performance (CPI)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="spi" name="Schedule Performance (SPI)" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Capital Budget vs Incurred Spend vs Earned Value ($k) */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Budget vs Spend vs Earned Value ($k)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Financial efficiency and capital delivery comparison
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Budget
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Spend
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> EV
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}k`} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#060911",
                    borderColor: "#1E293B",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    color: "#f8fafc",
                  }}
                  formatter={(val: any) => [`$${val}k`, ""]}
                />
                <Bar dataKey="Budget" name="Authorized Budget" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Spend" name="Actual Cost (AC)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="EarnedValue" name="Earned Value (EV)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Cards with Direct Deep Redirect Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Project Delivery Benchmarks & Direct Deep-Dive
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Click any button to immediately switch project and open that area
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectPerformances.map((perf) => {
            const isCurrentlyActive = activeProjectId === perf.project.id;
            return (
              <div
                key={perf.project.id}
                className={`bg-[#0B0F19] rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all shadow-xs ${
                  isCurrentlyActive
                    ? "border-sky-500/60 ring-1 ring-sky-500/30 bg-[#0E1526]"
                    : "border-[#1E293B] hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#1E293B]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white font-mono truncate">
                          {perf.project.name}
                        </span>
                        {isCurrentlyActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            Active Scope
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {perf.project.projectCode} · PM: {perf.project.projectManager}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                        perf.healthStatus === "Ahead" || perf.healthStatus === "Healthy"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : perf.healthStatus === "At Risk"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {perf.healthStatus}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#1E293B] text-center font-mono">
                    <div className="bg-[#060911] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">CPI</span>
                      <span className={`text-base font-bold ${perf.cpi >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
                        {perf.cpi.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-[#060911] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">SPI</span>
                      <span className={`text-base font-bold ${perf.spi >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
                        {perf.spi.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-[#060911] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Progress</span>
                      <span className="text-base font-bold text-sky-400">
                        {perf.avgProgress}%
                      </span>
                    </div>
                  </div>

                  {/* Financials & Status */}
                  <div className="py-2.5 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Budget:</span>
                      <span className="text-white font-semibold">${perf.plannedBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Earned Value:</span>
                      <span className="text-emerald-400 font-semibold">${Math.round(perf.earnedValue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Actual Spend:</span>
                      <span className="text-amber-400 font-semibold">${Math.round(perf.actualCost).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Work Packages:</span>
                      <span className="text-white font-semibold">
                        {perf.completedTasks}/{perf.totalTasks} Done
                        {perf.blockedTasks > 0 && (
                          <span className="text-rose-400 font-bold ml-1.5">
                            ({perf.blockedTasks} blocked)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Redirection Actions Bar */}
                <div className="pt-3 border-t border-[#1E293B] mt-2">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1.5">
                    Direct Redirection:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleJumpToProject(perf.project.id, "dashboard")}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E2A45] text-sky-300 hover:text-white border border-slate-700 hover:border-sky-500/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title={`Switch active project to ${perf.project.name} on Dashboard`}
                    >
                      <Folder className="w-3 h-3 text-sky-400" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleJumpToProject(perf.project.id, "wbs")}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E2A45] text-slate-200 hover:text-white border border-slate-700 hover:border-sky-500/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title={`Open WBS hierarchy for ${perf.project.name}`}
                    >
                      <Layers className="w-3 h-3 text-indigo-400" />
                      <span>WBS Tree</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleJumpToProject(perf.project.id, "gantt")}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E2A45] text-slate-200 hover:text-white border border-slate-700 hover:border-sky-500/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title={`Open Gantt chart for ${perf.project.name}`}
                    >
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      <span>Gantt Chart</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleJumpToProject(perf.project.id, "raid")}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E2A45] text-slate-200 hover:text-white border border-slate-700 hover:border-sky-500/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title={`Open RAID log for ${perf.project.name}`}
                    >
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>RAID Log</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
