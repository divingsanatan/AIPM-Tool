import { WbsItem, Stakeholder, RaidItem, ChangeRequest, EvmMetrics } from "../types";

export interface PredictiveScenario {
  name: string;
  formula: string;
  eac: number;
  varianceAtCompletion: number;
  projectedFinishDeltaDays: number;
  confidenceScore: number;
  description: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
}

export interface CriticalPathAnalytics {
  totalCriticalItems: number;
  completedCriticalItems: number;
  blockedCriticalItems: number;
  criticalProgressPercent: number;
  projectedScheduleSlipDays: number;
  topBottlenecks: {
    id: string;
    code: string;
    title: string;
    owner: string;
    status: string;
    slipDays: number;
  }[];
}

export interface ContingencyAnalytics {
  totalContingencyReserve: number;
  consumedByApprovedCr: number;
  pendingCrExposure: number;
  quantifiedRiskExposureDollars: number;
  remainingContingency: number;
  isDeficitProjected: boolean;
  contingencyBurnRatePercent: number;
}

export interface LaborEfficiencyAnalytics {
  plannedTotalHours: number;
  actualTotalHours: number;
  hourVariance: number;
  averageHourlyRate: number;
  totalTeamHourlyBurn: number;
  earnedValuePerDollar: number;
  departmentBurn: {
    department: string;
    hourlyBurn: number;
    headcount: number;
    assignedTasks: number;
  }[];
}

/**
 * Calculates 4 PMI Standard EAC Forecasting Models:
 * 1. Typical (Current CPI continues): EAC = BAC / CPI
 * 2. Conservative / Dual-Factor (Both CPI & SPI impact remaining work): EAC = AC + (BAC - EV) / (CPI * SPI)
 * 3. Planned Rate (Future work proceeds at baseline budget rate): EAC = AC + (BAC - EV)
 * 4. Optimistic / Recovery (Recovery plan improves performance to CPI 1.05): EAC = AC + (BAC - EV) / 1.05
 */
export function calculatePredictiveScenarios(metrics: EvmMetrics): PredictiveScenario[] {
  const { bac, ev, ac, cpi, spi } = metrics;
  const remainingWork = Math.max(0, bac - ev);
  const safeCpi = Math.max(0.2, cpi || 1.0);
  const safeSpi = Math.max(0.2, spi || 1.0);

  // 1. Typical CPI
  const typicalEac = Math.round(safeCpi > 0 ? bac / safeCpi : bac);
  const typicalVac = bac - typicalEac;
  const typicalDays = Math.round((1 - safeSpi) * 60);

  // 2. Dual Factor CPI * SPI
  const dualFactorDenominator = Math.max(0.1, safeCpi * safeSpi);
  const dualFactorEac = Math.round(ac + remainingWork / dualFactorDenominator);
  const dualFactorVac = bac - dualFactorEac;
  const dualDays = Math.round(((1 - safeSpi) + (1 - safeCpi)) * 50);

  // 3. Planned Rate (Budget Rate for remaining work)
  const plannedRateEac = Math.round(ac + remainingWork);
  const plannedRateVac = bac - plannedRateEac;

  // 4. Optimistic Recovery
  const optimisticEac = Math.round(ac + remainingWork / 1.08);
  const optimisticVac = bac - optimisticEac;

  return [
    {
      name: "Most Likely (Cumulative CPI Trend)",
      formula: "EAC = BAC / CPI",
      eac: typicalEac,
      varianceAtCompletion: typicalVac,
      projectedFinishDeltaDays: Math.max(0, typicalDays),
      confidenceScore: 82,
      description: "Assumes historical cost efficiency continues linearly through remaining project phases.",
      riskLevel: typicalVac >= 0 ? "Low" : typicalVac > -25000 ? "Medium" : "High",
    },
    {
      name: "Conservative (Dual-Factor CPI × SPI)",
      formula: "EAC = AC + (BAC - EV) / (CPI × SPI)",
      eac: dualFactorEac,
      varianceAtCompletion: dualFactorVac,
      projectedFinishDeltaDays: Math.max(4, dualDays),
      confidenceScore: 68,
      description: "Standard PMBOK method when schedule delays force costly crash overtime on remaining tasks.",
      riskLevel: dualFactorVac > -20000 ? "Medium" : dualFactorVac > -45000 ? "High" : "Critical",
    },
    {
      name: "Planned Rate Recovery",
      formula: "EAC = AC + (BAC - EV)",
      eac: plannedRateEac,
      varianceAtCompletion: plannedRateVac,
      projectedFinishDeltaDays: Math.max(0, Math.round(typicalDays * 0.5)),
      confidenceScore: 54,
      description: "Assumes future deliverables will be completed at exactly the originally budgeted unit rates.",
      riskLevel: plannedRateVac >= 0 ? "Low" : "Medium",
    },
    {
      name: "Optimistic Accelerated",
      formula: "EAC = AC + (BAC - EV) / 1.08",
      eac: optimisticEac,
      varianceAtCompletion: optimisticVac,
      projectedFinishDeltaDays: -3,
      confidenceScore: 40,
      description: "Assumes corrective sprint replanning yields 8% efficiency gains and eliminates remaining blockers.",
      riskLevel: "Low",
    },
  ];
}

/**
 * Evaluates Critical Path items, identifying schedule bottlenecks and slippage.
 */
export function calculateCriticalPathAnalytics(
  wbsItems: WbsItem[],
  stakeholders: Stakeholder[]
): CriticalPathAnalytics {
  const criticalItems = wbsItems.filter((i) => i.isCriticalPath);
  const totalCritical = criticalItems.length || 1;
  const completedCritical = criticalItems.filter((i) => i.status === "Done").length;
  const blockedCritical = criticalItems.filter((i) => i.status === "Blocked").length;

  const stakeholderMap = new Map(stakeholders.map((s) => [s.id, s.name]));

  const topBottlenecks = criticalItems
    .filter((i) => i.status === "Blocked" || (i.actualHours > i.estimatedHours && i.status !== "Done"))
    .map((item) => {
      const slipHours = Math.max(0, item.actualHours - item.estimatedHours);
      const slipDays = item.status === "Blocked" ? 8 : Math.max(2, Math.round(slipHours / 8));
      return {
        id: item.id,
        code: item.wbsCode,
        title: item.title,
        owner: stakeholderMap.get(item.assignedStakeholderId || "") || "Unassigned",
        status: item.status,
        slipDays,
      };
    })
    .sort((a, b) => b.slipDays - a.slipDays)
    .slice(0, 4);

  const projectedScheduleSlipDays = blockedCritical * 6 + (topBottlenecks.length > 0 ? 4 : 0);
  const criticalProgressPercent = Math.round(
    criticalItems.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0) / totalCritical
  );

  return {
    totalCriticalItems: criticalItems.length,
    completedCriticalItems: completedCritical,
    blockedCriticalItems: blockedCritical,
    criticalProgressPercent,
    projectedScheduleSlipDays,
    topBottlenecks,
  };
}

/**
 * Calculates contingency reserve absorption, pending CCB change impact, and quantified risk exposure.
 */
export function calculateContingencyAnalytics(
  raidItems: RaidItem[],
  changeRequests: ChangeRequest[],
  totalContingencyReserve = 35000
): ContingencyAnalytics {
  const approvedCrs = changeRequests.filter(
    (cr) => cr.status === "Approved" || cr.ccbStatus === "Approved"
  );
  const pendingCrs = changeRequests.filter(
    (cr) => cr.status === "Submitted" || cr.status === "Under Review" || cr.ccbStatus === "Pending CCB"
  );

  const consumedByApprovedCr = approvedCrs.reduce(
    (sum, cr) => sum + (cr.costImpact || cr.costImpactDollars || 0),
    0
  );

  const pendingCrExposure = pendingCrs.reduce(
    (sum, cr) => sum + (cr.costImpact || cr.costImpactDollars || 0),
    0
  );

  // Quantified Risk Dollar Exposure: Probability (%) * Impact Score (1-5) * Base multiplier ($1,200/pt)
  const risks = raidItems.filter((r) => r.category === "Risk" && r.status !== "Closed");
  const quantifiedRiskExposureDollars = risks.reduce((sum, r) => {
    const prob = (r.probability || 3) / 5; // 0.2 to 1.0
    const imp = (r.impact || 3); // 1 to 5
    return sum + Math.round(prob * imp * 1800);
  }, 0);

  const remainingContingency = totalContingencyReserve - consumedByApprovedCr;
  const isDeficitProjected = pendingCrExposure + (quantifiedRiskExposureDollars * 0.3) > remainingContingency;
  const contingencyBurnRatePercent = Math.min(
    100,
    Math.round((consumedByApprovedCr / totalContingencyReserve) * 100)
  );

  return {
    totalContingencyReserve,
    consumedByApprovedCr,
    pendingCrExposure,
    quantifiedRiskExposureDollars,
    remainingContingency,
    isDeficitProjected,
    contingencyBurnRatePercent,
  };
}

/**
 * Computes labor burn rate, hourly variance, and department efficiencies.
 */
export function calculateLaborEfficiencyAnalytics(
  wbsItems: WbsItem[],
  stakeholders: Stakeholder[],
  evmMetrics: EvmMetrics
): LaborEfficiencyAnalytics {
  let plannedTotalHours = 0;
  let actualTotalHours = 0;

  wbsItems.forEach((item) => {
    plannedTotalHours += item.estimatedHours || 0;
    actualTotalHours += item.actualHours || 0;
  });

  const hourVariance = actualTotalHours - plannedTotalHours;
  const totalTeamHourlyBurn = stakeholders.reduce((sum, s) => sum + (s.hourlyRate || 0), 0);
  const averageHourlyRate =
    stakeholders.length > 0 ? Math.round(totalTeamHourlyBurn / stakeholders.length) : 120;

  const earnedValuePerDollar =
    evmMetrics.ac > 0 ? Math.round((evmMetrics.ev / evmMetrics.ac) * 100) / 100 : 1.0;

  // Departmental distribution
  const deptMap = new Map<string, { hourlyBurn: number; headcount: number; assignedTasks: number }>();

  stakeholders.forEach((s) => {
    const dept = s.department || "Core Engineering";
    const existing = deptMap.get(dept) || { hourlyBurn: 0, headcount: 0, assignedTasks: 0 };
    const tasksCount = wbsItems.filter(
      (i) =>
        (i.assignedStakeholderIds && i.assignedStakeholderIds.includes(s.id)) ||
        i.assignedStakeholderId === s.id
    ).length;
    deptMap.set(dept, {
      hourlyBurn: existing.hourlyBurn + (s.hourlyRate || 0),
      headcount: existing.headcount + 1,
      assignedTasks: existing.assignedTasks + tasksCount,
    });
  });

  const departmentBurn = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    hourlyBurn: data.hourlyBurn,
    headcount: data.headcount,
    assignedTasks: data.assignedTasks,
  }));

  return {
    plannedTotalHours,
    actualTotalHours,
    hourVariance,
    averageHourlyRate,
    totalTeamHourlyBurn,
    earnedValuePerDollar,
    departmentBurn,
  };
}
