import React, { useState, useMemo } from "react";
import {
  WbsItem,
  Stakeholder,
  RaidItem,
  ChangeRequest,
  EvmMetrics,
  ActiveTab,
  GlobalFilterState,
} from "../types";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Milestone,
  Scale,
  Sparkles,
  ChevronRight,
  Layers,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { generateSCurveData } from "../utils/pmiCalculations";
import {
  calculatePredictiveScenarios,
  calculateCriticalPathAnalytics,
  calculateContingencyAnalytics,
  calculateLaborEfficiencyAnalytics,
} from "../utils/analyticalInsights";
import {
  doesItemMatchFilters,
  isFilterActive,
  getItemPriority,
} from "../utils/filterUtils";

interface DashboardViewProps {
  wbsItems: WbsItem[];
  stakeholders: Stakeholder[];
  raidItems: RaidItem[];
  changeRequests: ChangeRequest[];
  evmMetrics: EvmMetrics;
  onNavigateTab: (tab: ActiveTab) => void;
  onGenerateReportClick: (type: "risk" | "pmi") => void;
  globalFilter?: GlobalFilterState;
  onResetFilters?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  wbsItems,
  stakeholders,
  raidItems,
  changeRequests,
  evmMetrics,
  onNavigateTab,
  onGenerateReportClick,
  globalFilter,
  onResetFilters,
}) => {
  const [wbsFilter, setWbsFilter] = useState<string>("All");
  const sCurveData = generateSCurveData(evmMetrics);

  // Analytical calculations
  const scenarios = calculatePredictiveScenarios(evmMetrics);
  const criticalAnalytics = calculateCriticalPathAnalytics(wbsItems, stakeholders);
  const contingencyAnalytics = calculateContingencyAnalytics(raidItems, changeRequests);
  const laborAnalytics = calculateLaborEfficiencyAnalytics(wbsItems, stakeholders, evmMetrics);

  // High risks
  const risks = raidItems.filter((r) => r.category === "Risk");
  const highRisks = risks.filter((r) => (r.riskExposure || 0) >= 15);

  const filtersActive = globalFilter ? isFilterActive(globalFilter) : false;

  // Filtered WBS preview - respect globalFilter first, then local level type
  const matchingWbsItems = useMemo(() => {
    if (!globalFilter || !filtersActive) return wbsItems;
    return wbsItems.filter((item) => doesItemMatchFilters(item, globalFilter));
  }, [wbsItems, globalFilter, filtersActive]);

  const filteredWbsItems =
    wbsFilter === "All"
      ? matchingWbsItems.slice(0, 8)
      : matchingWbsItems.filter((item) => item.type === wbsFilter).slice(0, 8);

  const getStakeholderName = (id?: string) => {
    if (!id) return "Unassigned";
    const s = stakeholders.find((st) => st.id === id);
    return s ? s.name : "Unassigned";
  };

  const mostLikelyEac = scenarios[0]?.eac ?? evmMetrics.eac;
  const dualFactorEac = scenarios[1]?.eac ?? evmMetrics.eac * 1.06;

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Top Project Delivery Telemetry Bar */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono">
                Project Delivery Telemetry & EVM Control
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/80">
                ANSI/PMI 99-001
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Real-time earned value pacing, predictive EAC scenarios, and critical chain tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab("wbs")}
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#141C2E] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Full WBS</span>
          </button>
          <button
            onClick={() => onGenerateReportClick("pmi")}
            className="text-xs font-mono font-semibold text-slate-950 px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>PMI Audit Report</span>
          </button>
        </div>
      </div>

      {/* 4 Core High-Contrast KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPI Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                CPI (Cost Efficiency)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                evmMetrics.cpi >= 1.0
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {evmMetrics.costStatus}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {evmMetrics.cpi.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">Target: 1.00</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
            <span className="text-slate-400">Cost Variance (CV):</span>
            <span
              className={`font-bold ${
                evmMetrics.cv >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {evmMetrics.cv >= 0 ? "+" : ""}${evmMetrics.cv.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            ${laborAnalytics.earnedValuePerDollar.toFixed(2)} EV delivered per $1.00 spent
          </p>
        </div>

        {/* SPI Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                SPI (Schedule Pacing)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                evmMetrics.spi >= 1.0
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {evmMetrics.scheduleStatus}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {evmMetrics.spi.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">Target: 1.00</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
            <span className="text-slate-400">Schedule Variance:</span>
            <span
              className={`font-bold ${
                evmMetrics.sv >= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {evmMetrics.sv >= 0 ? "+" : ""}${evmMetrics.sv.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            Critical path projected slip: +{criticalAnalytics.projectedScheduleSlipDays} days
          </p>
        </div>

        {/* EAC Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                EAC Forecast
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              BAC: ${(evmMetrics.bac / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              ${(evmMetrics.eac / 1000).toFixed(1)}k
            </span>
            <span
              className={`text-xs font-mono ${
                evmMetrics.vac >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              VAC: {evmMetrics.vac >= 0 ? "+" : ""}${(evmMetrics.vac / 1000).toFixed(1)}k
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
            <span className="text-slate-400">Dual-Factor Risk:</span>
            <span className="font-bold text-amber-400">
              ${(dualFactorEac / 1000).toFixed(1)}k
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            Most likely outcome: ${(mostLikelyEac / 1000).toFixed(1)}k (CPI continuation)
          </p>
        </div>

        {/* Contingency Runway Card */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Scale className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Contingency Reserve
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800 font-semibold">
              {contingencyAnalytics.contingencyBurnRatePercent}% Used
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400 font-mono">
              ${(contingencyAnalytics.remainingContingency / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-slate-400 font-mono">free buffer</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1E293B]">
            <span className="text-slate-400">Total Authorized:</span>
            <span className="font-bold text-white">
              ${(contingencyAnalytics.totalContingencyReserve / 1000).toFixed(0)}k
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            ${contingencyAnalytics.consumedByApprovedCr.toLocaleString()} spent · ${contingencyAnalytics.pendingCrExposure.toLocaleString()} pending CCB
          </p>
        </div>
      </div>

      {/* Middle Section: S-Curve Chart & Analytical Forecast Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EVM Cumulative S-Curve (2 Cols) */}
        <div className="lg:col-span-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>EVM S-Curve Trajectory</span>
                  <span className="text-[10px] font-normal text-slate-400 font-sans">
                    (Planned vs Earned vs Actual Cost)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Cumulative project spend and value delivered across delivery cycles
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" /> PV (Planned)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" /> EV (Earned)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" /> AC (Actual)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060911",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="pv"
                    name="Planned Value (PV)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pvGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ev"
                    name="Earned Value (EV)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#evGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ac"
                    name="Actual Cost (AC)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#acGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#1E293B] mt-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400">Current PV:</span>
              <span className="font-bold text-sky-400">${(evmMetrics.pv / 1000).toFixed(1)}k</span>
            </div>
            <div className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400">Current EV:</span>
              <span className="font-bold text-emerald-400">${(evmMetrics.ev / 1000).toFixed(1)}k</span>
            </div>
            <div className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400">Current AC:</span>
              <span className="font-bold text-amber-400">${(evmMetrics.ac / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        {/* Analytical Forecasting & Critical Path Diagnostic (1 Col) */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Predictive Forecasts
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  PMBOK 4-Model EAC variance analysis
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                Confidence 92%
              </span>
            </div>

            {/* Scenarios List */}
            <div className="mt-3 space-y-2.5">
              {scenarios.slice(0, 3).map((sc, idx) => (
                <div
                  key={sc.name}
                  className="p-2.5 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {sc.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      ${(sc.eac / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-1 font-mono">
                    <span className="text-slate-400">{sc.formula}</span>
                    <span
                      className={`font-semibold ${
                        sc.varianceAtCompletion >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      VAC: {sc.varianceAtCompletion >= 0 ? "+" : ""}${(sc.varianceAtCompletion / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Critical Path Health Section */}
            <div className="mt-4 pt-3.5 border-t border-[#1E293B]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Critical Path Pacing
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab("wbs")}
                  className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Inspect WBS</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-[#060911] border border-[#1E293B]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">
                    Chain Progress: {criticalAnalytics.criticalProgressPercent}%
                  </span>
                  <span
                    className={`font-bold ${
                      criticalAnalytics.blockedCriticalItems > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {criticalAnalytics.blockedCriticalItems > 0
                      ? `${criticalAnalytics.blockedCriticalItems} Blocker (+${criticalAnalytics.projectedScheduleSlipDays}d)`
                      : "Zero Float Chain Active"}
                  </span>
                </div>
                {criticalAnalytics.topBottlenecks[0] && (
                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-1 font-sans">
                    Bottleneck: <span className="text-slate-200">{criticalAnalytics.topBottlenecks[0].code} {criticalAnalytics.topBottlenecks[0].title}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Contingency Allocation Bar */}
            <div className="mt-3.5 pt-3.5 border-t border-[#1E293B]">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Contingency Buffer</span>
                <span className="text-emerald-400 font-bold">
                  ${(contingencyAnalytics.remainingContingency / 1000).toFixed(1)}k available
                </span>
              </div>
              <div className="w-full bg-[#060911] h-2 rounded-full overflow-hidden border border-[#1E293B]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (contingencyAnalytics.consumedByApprovedCr /
                        contingencyAnalytics.totalContingencyReserve) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>Consumed: ${contingencyAnalytics.consumedByApprovedCr.toLocaleString()}</span>
                <span>Buffer: ${contingencyAnalytics.totalContingencyReserve.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab("change-management")}
              className="w-full py-2 px-3 rounded-lg bg-[#141C2E] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Manage CCB & Change Requests</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Operational Section: WBS Tracker & RAID Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WBS Deliverables & Delivery Health (2 Cols) */}
        <div className="lg:col-span-2 bg-[#0B0F19] rounded-xl border border-[#1E293B] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    WBS Work Packages & Delivery Health
                  </h3>
                  {filtersActive && (
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {matchingWbsItems.length} of {wbsItems.length} filtered
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Hierarchical decomposition and operational completion status
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["All", "Milestone", "Epic", "Feature", "Task"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setWbsFilter(filter)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer font-mono ${
                      wbsFilter === filter
                        ? "bg-sky-400 text-slate-950 font-bold"
                        : "bg-[#141C2E] text-slate-300 hover:text-white border border-slate-800"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <button
                  onClick={() => onNavigateTab("wbs")}
                  className="text-xs bg-[#1E293B] hover:bg-slate-700 text-white px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer font-mono ml-1"
                >
                  <span>Full WBS</span>
                  <ArrowUpRight className="w-3 h-3 text-sky-400" />
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-mono">
                    <th className="pb-1 pl-2">WBS ID</th>
                    <th className="pb-1">Work Package</th>
                    <th className="pb-1">Priority</th>
                    <th className="pb-1">Owner</th>
                    <th className="pb-1">Status</th>
                    <th className="pb-1 pr-2 text-right">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWbsItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-mono text-xs bg-[#060911] rounded-lg">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Filter className="h-5 w-5 text-slate-500" />
                          <span>No work packages match the active filter criteria.</span>
                          {onResetFilters && (
                            <button
                              onClick={onResetFilters}
                              className="text-xs text-sky-400 hover:text-sky-300 underline cursor-pointer"
                            >
                              Reset filters to view all items
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWbsItems.map((item) => {
                      const itemPriority = getItemPriority(item);
                      return (
                        <tr
                          key={item.id}
                          className={`bg-[#060911] rounded-lg hover:bg-[#0E1526] transition-colors border border-slate-900 ${
                            item.status === "Blocked"
                              ? "border-l-2 border-l-amber-500"
                              : item.isCriticalPath
                              ? "border-l-2 border-l-sky-400"
                              : ""
                          }`}
                        >
                          <td className="py-2.5 pl-3 font-mono text-sky-400 font-semibold">
                            {item.wbsCode}
                          </td>
                          <td className="py-2.5 font-medium text-white">
                            {item.title}
                            <span className="ml-2 text-[10px] font-normal text-slate-400 uppercase font-mono">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                itemPriority === "Critical"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                  : itemPriority === "High"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : itemPriority === "Medium"
                                  ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                  : "bg-slate-700/40 text-slate-300 border-slate-600/40"
                              }`}
                            >
                              {itemPriority}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-300">
                            {getStakeholderName(item.assignedStakeholderId)}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                                item.status === "Done"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : item.status === "Demoable"
                                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                  : item.status === "In Progress"
                                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                  : item.status === "Blocked"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                item.status === "Done"
                                  ? "bg-emerald-400"
                                  : item.status === "Blocked"
                                  ? "bg-amber-400 animate-pulse"
                                  : "bg-emerald-400"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RAID Intelligence & Advisory (1 Col) */}
        <div className="bg-[#0B0F19] rounded-xl border border-[#1E293B] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[#1E293B]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>RAID Intelligence</span>
              </h3>
              <span className="text-xs text-amber-400 font-mono font-semibold">
                {highRisks.length} High Exposure
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {raidItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className={`p-3 bg-[#060911] border-l-2 rounded-lg text-xs border-slate-800 ${
                    item.category === "Risk"
                      ? "border-l-red-500"
                      : item.category === "Issue"
                      ? "border-l-rose-500"
                      : item.category === "Dependency"
                      ? "border-l-amber-500"
                      : "border-l-blue-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white line-clamp-1">
                      {item.title}
                    </p>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono font-bold ${
                        item.category === "Risk"
                          ? "bg-red-950/60 text-red-300 border border-red-800"
                          : item.category === "Issue"
                          ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                          : "bg-amber-950/60 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-1 font-sans">
                    {item.mitigationStrategy || item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* PM Advisory Note */}
            <div className="mt-4 p-3 rounded-lg bg-[#060911] border border-[#1E293B]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                  Governance Advisory
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {evmMetrics.cpi >= 1.0
                  ? `Cost efficiency is favorable (CPI ${evmMetrics.cpi.toFixed(2)}). Focus mitigation on the critical chain to recover ${criticalAnalytics.projectedScheduleSlipDays} days of schedule variance.`
                  : `Cost performance is lagging (CPI ${evmMetrics.cpi.toFixed(2)}). Recommend activating contingency reserves for pending scope packages.`}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between mt-4">
            <button
              onClick={() => onNavigateTab("raid")}
              className="text-xs bg-[#141C2E] border border-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 font-mono transition-colors cursor-pointer"
            >
              5×5 Risk Heatmap
            </button>
            <button
              onClick={() => onGenerateReportClick("risk")}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>AI Risk Plan</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
