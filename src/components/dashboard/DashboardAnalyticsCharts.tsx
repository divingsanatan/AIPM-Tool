import React, { useMemo } from "react";
import {
  WbsItem,
  Stakeholder,
  RaidItem,
  Sprint,
  EvmMetrics,
  StatusConfig,
  ActiveTab,
} from "../../types";
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Users,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { formatDurationSeconds, getTotalBlockedSeconds } from "../../utils/wbsTimerUtils";

interface DashboardAnalyticsChartsProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  raidItems: RaidItem[];
  sprints: Sprint[];
  evmMetrics: EvmMetrics;
  statusConfigs: StatusConfig[];
  sprintRollups: Array<{
    sprint: Sprint;
    taskCount: number;
    completedCount: number;
    inProgressCount: number;
    plannedBudget: number;
    actualCost: number;
    earnedValue: number;
    estimatedHours: number;
    actualHours: number;
    avgProgress: number;
    sprintCpi: number;
    sprintCv: number;
  }>;
  onNavigateTab: (tab: ActiveTab) => void;
  onRedirectToArea?: (tab: ActiveTab, params?: { projectId?: string; sprintId?: string | null }) => void;
  onSelectSprint?: (sprintId: string | null) => void;
}

export const DashboardAnalyticsCharts: React.FC<DashboardAnalyticsChartsProps> = ({
  wbsItems,
  stakeholders,
  raidItems,
  sprints,
  evmMetrics,
  statusConfigs,
  sprintRollups,
  onNavigateTab,
  onRedirectToArea,
  onSelectSprint,
}) => {
  // Chart 1: Sprint Velocity & EV Burnup Data
  const sprintChartData = useMemo(() => {
    return sprintRollups.map((sr) => ({
      name: sr.sprint.name.replace("Sprint ", "S"),
      fullName: sr.sprint.name,
      id: sr.sprint.id,
      Planned: Math.round(sr.plannedBudget / 1000),
      EarnedValue: Math.round(sr.earnedValue / 1000),
      ActualCost: Math.round(sr.actualCost / 1000),
      Tasks: sr.taskCount,
      Done: sr.completedCount,
      CPI: sr.sprintCpi,
    }));
  }, [sprintRollups]);

  // Chart 2: Stakeholder Workload & Hours Distribution
  const stakeholderWorkloadData = useMemo(() => {
    return stakeholders
      .map((stk) => {
        const assignedItems = wbsItems.filter(
          (w) =>
            w.assignedStakeholderId === stk.id ||
            w.assignedStakeholderIds?.includes(stk.id) ||
            w.contributorStakeholderIds?.includes(stk.id)
        );
        const totalEstHours = assignedItems.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
        const totalActHours = assignedItems.reduce((sum, i) => sum + (Number(i.actualHours) || 0), 0);
        const taskCount = assignedItems.length;

        return {
          name: stk.name.split(" ")[0] || stk.name,
          fullName: stk.name,
          role: stk.role,
          PlannedHours: totalEstHours,
          LoggedHours: totalActHours,
          taskCount,
        };
      })
      .filter((s) => s.PlannedHours > 0 || s.LoggedHours > 0)
      .sort((a, b) => b.PlannedHours - a.PlannedHours)
      .slice(0, 8);
  }, [stakeholders, wbsItems]);

  // Chart 3: Cost Variance by Major Phase/Milestone
  const milestoneVarianceData = useMemo(() => {
    const milestones = wbsItems.filter((w) => w.type === "Milestone" || w.parentId === null);
    return milestones.slice(0, 7).map((m) => {
      const planned = Number(m.plannedBudget) || 0;
      const actual = Number(m.actualCost) || 0;
      const progress = m.progressPercent !== undefined ? m.progressPercent : (m.status === "Done" ? 100 : 0);
      const earned = (planned * progress) / 100;
      const cv = Math.round(earned - actual);

      return {
        code: m.wbsCode,
        name: m.title.length > 22 ? m.title.slice(0, 20) + "..." : m.title,
        CostVariance: cv,
        EarnedValue: Math.round(earned / 1000),
        ActualSpend: Math.round(actual / 1000),
      };
    });
  }, [wbsItems]);

  // Chart 4: RAID Category Breakdown
  const raidCategoryData = useMemo(() => {
    const categories = ["Risk", "Issue", "Dependency", "Assumption"] as const;
    return categories.map((cat) => {
      const items = raidItems.filter((r) => r.category === cat);
      const openCount = items.filter((r) => r.status === "Open" || r.status === "Identified" || r.status === "In Progress").length;
      const resolvedCount = items.filter((r) => r.status === "Closed" || r.status === "Resolved" || r.status === "Mitigated").length;
      return {
        category: cat,
        Total: items.length,
        Open: openCount,
        Resolved: resolvedCount,
      };
    });
  }, [raidItems]);

  return (
    <div className="space-y-6">
      {/* Visual Analytics Header */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
              Smart Graphs & Visual Analytics Suite
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Interactive
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Visual metrics, sprint delivery velocity, team workload capacity, and cost variances.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab("gantt")}
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#141C2E] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gantt View</span>
          </button>
          <button
            onClick={() => onNavigateTab("wbs")}
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#141C2E] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>WBS Tree</span>
          </button>
        </div>
      </div>

      {/* Grid 1: Sprint Velocity & Workload Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sprint EV Throughput & Spend Bar Chart */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Sprint Delivery Velocity & Budget Burnup
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Planned Value (PV) vs Earned Value (EV) vs Actual Cost (AC) ($k)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> PV
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> EV
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> AC
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprintChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                  <Bar dataKey="Planned" name="Planned (PV)" fill="#38bdf8" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="EarnedValue" name="Earned (EV)" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="ActualCost" name="Actual Cost (AC)" fill="#fbbf24" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E293B] mt-2 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Click any sprint to filter dashboard scope</span>
            <div className="flex gap-1.5 flex-wrap">
              {sprintChartData.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSprint && onSelectSprint(s.id)}
                  className="px-2 py-0.5 rounded text-[10px] bg-[#141C2E] hover:bg-[#1E293B] text-sky-300 border border-slate-700 cursor-pointer"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stakeholder Workload & Hours Logged */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Team Workload & Effort Allocation
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Planned vs Logged Effort Hours by Stakeholder
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <span className="flex items-center gap-1 text-indigo-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> Planned (h)
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Logged (h)
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stakeholderWorkloadData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={75} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060911",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(val: any) => [`${val} hours`, ""]}
                  />
                  <Bar dataKey="PlannedHours" name="Planned Hours" fill="#818cf8" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  <Bar dataKey="LoggedHours" name="Logged Hours" fill="#c084fc" radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E293B] mt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Capacity utilization: 84% team average</span>
            <button
              onClick={() => onNavigateTab("stakeholders")}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Stakeholders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid 2: Phase Cost Variance & RAID Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cost Variance by Major Phase/Milestone */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Cost Variance (CV) by Work Package / Phase
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Positive = Under budget savings · Negative = Cost overrun
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Net CV: ${evmMetrics.cv >= 0 ? "+" : ""}${evmMetrics.cv.toLocaleString()}
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={milestoneVarianceData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                  <XAxis dataKey="code" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}`} tickLine={false} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060911",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Cost Variance"]}
                  />
                  <Bar dataKey="CostVariance" name="Cost Variance ($)">
                    {milestoneVarianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.CostVariance >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E293B] mt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Green = Cost savings · Red = Overrun</span>
            <button
              onClick={() => onNavigateTab("wbs")}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect in WBS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RAID Category & Status Distribution */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  RAID Log Volume & Resolution Health
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Open active items vs Mitigated / Resolved items
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Open
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Resolved
                </span>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={raidCategoryData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060911",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Bar dataKey="Open" name="Active Open" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Resolved" name="Mitigated / Closed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E293B] mt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Total {raidItems.length} items logged in RAID register
            </span>
            <button
              onClick={() => onNavigateTab("raid")}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>5×5 Risk Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
