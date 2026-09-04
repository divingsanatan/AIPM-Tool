export type WbsType = "Milestone" | "Epic" | "Feature" | "User Story" | "Task" | "Subtask";

export type WorkItemStatus = "To Do" | "In Progress" | "Demoable" | "Blocked" | "Done";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export interface GlobalFilterState {
  status: string; // "ALL" | WorkItemStatus
  assigneeId: string; // "ALL" | "UNASSIGNED" | string
  priority: string; // "ALL" | PriorityLevel
  searchQuery?: string;
}

export interface WbsItem {
  id: string;
  wbsCode: string; // e.g. "1.0", "1.1", "1.1.1"
  title: string;
  type: WbsType;
  parentId?: string | null;
  status: WorkItemStatus;
  priority?: PriorityLevel;
  estimatedHours: number;
  actualHours: number;
  plannedBudget: number; // in USD
  actualCost: number; // in USD (derived from assigned stakeholder hourly rate * actualHours)
  progressPercent: number; // 0 to 100
  assignedStakeholderId?: string;
  startDate: string;
  dueDate: string;
  isCriticalPath?: boolean;
  description?: string;
  isRolledUp?: boolean;
  childCount?: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  hourlyRate: number; // Total cost per hour ($/hr)
  power: "High" | "Low";
  interest: "High" | "Low";
  engagement: "Unaware" | "Resistant" | "Neutral" | "Supportive" | "Leading";
}

export type RaidCategory = "Risk" | "Assumption" | "Issue" | "Dependency";

export interface RaidItem {
  id: string;
  category: RaidCategory;
  title: string;
  description: string;
  // Risk attributes
  probability?: 1 | 2 | 3 | 4 | 5; // 1: Very Low, 5: Very High
  impact?: 1 | 2 | 3 | 4 | 5; // 1: Very Low, 5: Very High
  riskExposure?: number; // probability * impact (1-25)
  mitigationStrategy?: string;
  contingencyPlan?: string;
  // Issue attributes
  severity?: "Low" | "Medium" | "High" | "Critical";
  rootCause?: string;
  resolutionPlan?: string;
  // Dependency attributes
  dependencyType?: "Finish-to-Start (FS)" | "Start-to-Start (SS)" | "Finish-to-Finish (FF)" | "Start-to-Finish (SF)";
  upstreamDownstream?: "Upstream" | "Downstream";
  // Assumption attributes
  impactIfFalse?: string;
  // Common attributes
  status: "Identified" | "Open" | "In Progress" | "Mitigated" | "Accepted" | "Closed" | "Resolved" | "Validated";
  ownerId: string;
  dateRaised: string;
  targetResolutionDate: string;
}

export type RaciRole = "R" | "A" | "C" | "I"; // Responsible, Accountable, Consulted, Informed

export interface RaciMatrixEntry {
  wbsItemId: string;
  assignments: Record<string, RaciRole | undefined>; // stakeholderId -> R/A/C/I
}

export interface ChangeRequest {
  id: string;
  crNumber: string; // e.g. "CR-001"
  code?: string; // alias for crNumber
  title: string;
  requestedBy?: string;
  requestorId?: string;
  dateSubmitted?: string;
  dateRequested?: string;
  description?: string;
  reason?: string;
  businessJustification?: string;
  scheduleImpactDays: number;
  costImpactDollars?: number;
  costImpact?: number;
  scopeImpact?: "Minor" | "Moderate" | "Major" | string;
  qualityImpact?: "Negligible" | "Moderate" | "Significant" | string;
  ccbStatus?: "Draft" | "Pending CCB" | "Approved" | "Rejected" | "Deferred" | string;
  status?: "Draft" | "Submitted" | "Under Review" | "Approved" | "Rejected" | "Implemented" | string;
  implementationStatus?: "Not Started" | "In Progress" | "Completed" | string;
  reviewedBy?: string;
  reviewDate?: string;
  decisionNotes?: string;
  ccbDecisionNotes?: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  category: "WBS Specification" | "Project Charter" | "SOW" | "Risk Register" | "Change Package" | "WBS" | "Charter" | "Architecture" | "Requirements" | "Other" | string;
  uploadDate: string;
  content: string;
  fileName?: string;
  fileSize?: string;
  parsedIntoWbs?: boolean;
  parsedToWbs?: boolean;
  uploadedBy?: string;
}

export interface EvmMetrics {
  bac: number; // Budget at Completion
  pv: number; // Planned Value
  ev: number; // Earned Value
  ac: number; // Actual Cost
  cv: number; // Cost Variance: EV - AC
  sv: number; // Schedule Variance: EV - PV
  cpi: number; // Cost Performance Index: EV / AC
  spi: number; // Schedule Performance Index: EV / PV
  eac: number; // Estimate at Completion: BAC / CPI
  etc: number; // Estimate to Complete: EAC - AC
  vac: number; // Variance at Completion: BAC - EAC
  tcpi: number; // To Complete Performance Index: (BAC - EV) / (BAC - AC)
  overallProgress: number;
  costStatus: "Under Budget" | "On Track" | "Over Budget";
  scheduleStatus: "Ahead of Schedule" | "On Track" | "Behind Schedule";
}

export interface ProjectSettings {
  id: string;
  name: string;
  projectCode: string;
  projectManager: string;
  sponsor: string;
  startDate: string;
  targetEndDate: string;
  baselineBudget: number;
  status: "Active" | "At Risk" | "Critical" | "Completed";
}

export type ActiveTab =
  | "dashboard"
  | "wbs"
  | "stakeholders"
  | "raid"
  | "raci"
  | "change-management"
  | "documents"
  | "reports";
