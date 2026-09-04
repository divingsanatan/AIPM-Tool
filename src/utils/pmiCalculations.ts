import { WbsItem, Stakeholder, EvmMetrics } from "../types";

export function calculateEvmMetrics(
  wbsItems: WbsItem[],
  stakeholders: Stakeholder[],
  baselineBudget?: number
): EvmMetrics {
  const stakeholderRateMap = new Map<string, number>();
  stakeholders.forEach((s) => {
    stakeholderRateMap.set(s.id, s.hourlyRate);
  });

  // Calculate BAC, EV, AC, and PV
  let totalBac = 0;
  let totalEv = 0;
  let totalAc = 0;
  let totalPv = 0;

  // We consider leaf tasks or top-level items depending on hierarchy.
  // Standard 100% rule: If an item has children, its children sum to the parent.
  // To prevent double counting in tree: calculate on items that do NOT have children in the list.
  const parentIdSet = new Set<string>();
  wbsItems.forEach((item) => {
    if (item.parentId) {
      parentIdSet.add(item.parentId);
    }
  });

  // Leaf items (items that have no children) provide the atomic work packages
  const workPackages = wbsItems.filter((item) => !parentIdSet.has(item.id));
  const calculationItems = workPackages.length > 0 ? workPackages : wbsItems;

  calculationItems.forEach((item) => {
    const planned = item.plannedBudget || 0;
    totalBac += planned;

    // EV = Planned Budget * (Progress % / 100)
    const progress = Math.min(100, Math.max(0, item.progressPercent || 0));
    const ev = planned * (progress / 100);
    totalEv += ev;

    // AC = actualHours * assigned stakeholder hourly rate, or item.actualCost
    let itemAc = item.actualCost;
    if (item.assignedStakeholderId && stakeholderRateMap.has(item.assignedStakeholderId)) {
      const rate = stakeholderRateMap.get(item.assignedStakeholderId)!;
      itemAc = item.actualHours * rate;
    }
    totalAc += itemAc || 0;

    // PV: Scheduled/Planned value based on status or planned schedule
    // If Done: PV = 100% of planned
    // If In Progress / Demoable: PV planned to date (roughly planned * expected ~70%)
    // If Blocked: planned expected ~50%
    // If To Do: planned expected ~0-10%
    let pvFraction = 0;
    if (item.status === "Done") pvFraction = 1.0;
    else if (item.status === "Demoable") pvFraction = 0.9;
    else if (item.status === "In Progress") pvFraction = 0.75;
    else if (item.status === "Blocked") pvFraction = 0.5;
    else pvFraction = 0.1;

    totalPv += planned * pvFraction;
  });

  const finalBac = baselineBudget || (totalBac > 0 ? totalBac : 380000);
  const cv = totalEv - totalAc;
  const sv = totalEv - totalPv;

  // Prevent division by zero
  const cpi = totalAc > 0 ? Math.round((totalEv / totalAc) * 100) / 100 : 1.0;
  const spi = totalPv > 0 ? Math.round((totalEv / totalPv) * 100) / 100 : 1.0;

  // EAC = BAC / CPI (typical variance assumption)
  const eac = cpi > 0 ? Math.round(finalBac / cpi) : finalBac;
  const etc = Math.max(0, eac - totalAc);
  const vac = finalBac - eac;

  // TCPI = (BAC - EV) / (BAC - AC)
  const remainingWork = finalBac - totalEv;
  const remainingFunds = finalBac - totalAc;
  const tcpi =
    remainingFunds > 0 && remainingWork > 0
      ? Math.round((remainingWork / remainingFunds) * 100) / 100
      : 1.0;

  const overallProgress =
    totalBac > 0 ? Math.round((totalEv / totalBac) * 100) : 0;

  const costStatus: EvmMetrics["costStatus"] =
    cpi >= 1.0 ? "Under Budget" : cpi >= 0.9 ? "On Track" : "Over Budget";

  const scheduleStatus: EvmMetrics["scheduleStatus"] =
    spi >= 1.05
      ? "Ahead of Schedule"
      : spi >= 0.95
      ? "On Track"
      : "Behind Schedule";

  return {
    bac: Math.round(finalBac),
    pv: Math.round(totalPv),
    ev: Math.round(totalEv),
    ac: Math.round(totalAc),
    cv: Math.round(cv),
    sv: Math.round(sv),
    cpi,
    spi,
    eac,
    etc: Math.round(etc),
    vac: Math.round(vac),
    tcpi,
    overallProgress,
    costStatus,
    scheduleStatus,
  };
}

export interface SCurvePoint {
  period: string;
  pv: number;
  ev: number;
  ac: number;
}

export function generateSCurveData(metrics: EvmMetrics): SCurvePoint[] {
  const { bac, pv, ev, ac } = metrics;
  // Generate a realistic 10-month projection based on current PV, EV, AC
  return [
    { period: "Feb (M1)", pv: Math.round(bac * 0.08), ev: Math.round(bac * 0.08), ac: Math.round(bac * 0.075) },
    { period: "Mar (M2)", pv: Math.round(bac * 0.18), ev: Math.round(bac * 0.175), ac: Math.round(bac * 0.18) },
    { period: "Apr (M3 - Current)", pv: pv, ev: ev, ac: ac },
    { period: "May (M4)", pv: Math.round(pv + (bac - pv) * 0.22), ev: Math.round(ev + (bac - ev) * 0.2), ac: Math.round(ac + (metrics.eac - ac) * 0.22) },
    { period: "Jun (M5)", pv: Math.round(pv + (bac - pv) * 0.42), ev: Math.round(ev + (bac - ev) * 0.4), ac: Math.round(ac + (metrics.eac - ac) * 0.43) },
    { period: "Jul (M6)", pv: Math.round(pv + (bac - pv) * 0.62), ev: Math.round(ev + (bac - ev) * 0.6), ac: Math.round(ac + (metrics.eac - ac) * 0.64) },
    { period: "Aug (M7)", pv: Math.round(pv + (bac - pv) * 0.8), ev: Math.round(ev + (bac - ev) * 0.78), ac: Math.round(ac + (metrics.eac - ac) * 0.82) },
    { period: "Sep (M8)", pv: Math.round(bac * 0.92), ev: Math.round(bac * 0.9), ac: Math.round(metrics.eac * 0.93) },
    { period: "Oct (M9)", pv: Math.round(bac * 0.98), ev: Math.round(bac * 0.97), ac: Math.round(metrics.eac * 0.98) },
    { period: "Nov (M10)", pv: bac, ev: bac, ac: metrics.eac },
  ];
}
