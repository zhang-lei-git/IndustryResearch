export type CompanyStatus = "待调研" | "已预约" | "调研中" | "已完成";
export type NeedPriority = "高" | "中" | "低";
export type NeedStatus = "待确认" | "已确认" | "已排除";

export type ResearchCompany = {
  id: string;
  workspaceId: string;
  name: string;
  region: string;
  industry: string;
  companyType: string;
  chainPosition: string;
  scale: string;
  contact: string;
  status: CompanyStatus;
  maturity: number;
  notes: string;
};

export type ResearchPlan = {
  id: string;
  workspaceId: string;
  taskId?: string;
  companyIds: string[];
  date: string;
  owner: string;
  objective: string;
  status: "计划中" | "已完成";
  questionSnapshot?: string[];
  topicIds?: string[];
  intelligenceIds?: string[];
};

export type NeedItem = {
  id: string;
  category: string;
  description: string;
  priority: NeedPriority;
  capability: string;
  status: NeedStatus;
};

export type ResearchRecord = {
  id: string;
  workspaceId: string;
  planId?: string;
  planTargetId?: string;
  companyId: string;
  date: string;
  interviewer: string;
  summary: string;
  transcript: string;
  audioName?: string;
  audioUrl?: string;
  needs: NeedItem[];
  conclusion: string;
};

export type ResearchTask = {
  id: string;
  workspaceId: string;
  name: string;
  objective: string;
  topicIds: string[];
  owner: string;
  startAt: string;
  endAt: string;
  status: "草稿" | "进行中" | "已完成" | "已归档";
};

export type SamplingStrategy = {
  id: string;
  taskId: string;
  companyTypeKeywords: string[];
  chainPositionKeywords: string[];
  scaleKeywords: string[];
  intelligenceTypes: string[];
  createdAt: string;
};

export type ResearchSample = {
  id: string;
  taskId: string;
  companyId: string;
  sampleRole: string;
  selectionReason: string;
  priority: "高" | "中" | "低";
  status: "候选" | "已选定" | "已计划" | "已完成" | "需复访" | "已排除";
  snapshotAt: string;
};

export type QuestionSetItem = {
  id: string;
  category: string;
  content: string;
  basis: string;
  order: number;
};

export type QuestionSet = {
  id: string;
  workspaceId: string;
  taskId?: string;
  companyId: string;
  name: string;
  focus: string;
  version: number;
  status: "草稿" | "已冻结" | "已归档";
  generatedAt: string;
  frozenAt?: string;
  items: QuestionSetItem[];
};

export type PlanTarget = {
  id: string;
  planId: string;
  sampleId?: string;
  companyId: string;
  questionSetId?: string;
  questionSnapshot: string[];
  scheduledAt: string;
  durationMinutes?: number;
  method: string;
  owner: string;
  status: "待安排" | "已预约" | "待执行" | "执行中" | "已完成" | "已取消";
};

export type Capability = {
  id: string;
  name: string;
  keywords: string[];
  description: string;
};

export type QuestionTemplate = {
  id: string;
  category: string;
  appliesToTypes: string[];
  appliesToPositions: string[];
  question: string;
};

export type Workspace = {
  id: string;
  name: string;
  regionName: string;
  industryFocus: string[];
  description: string;
  status: "试点中" | "进行中" | "已归档";
};

export type ResearchTopic = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  tags: string[];
  status: "调研中" | "待验证" | "已形成结论";
};

export type ResearchHypothesis = {
  id: string;
  workspaceId: string;
  topicId: string;
  statement: string;
  evidence: string;
  status: "待验证" | "已有支持证据" | "存在反例" | "暂不确定";
};

export type PolicyRecord = {
  id: string;
  name: string;
  level: string;
  amount: string;
  appliesToTypes: string[];
  appliesToPositions: string[];
  serviceMatches: string[];
  decisionValue: string;
  sourceUrl: string;
  publishedAt: string;
  validUntil: string;
  status: "有效" | "待核实" | "已失效";
  version: number;
  lastUpdatedAt: string;
};

export type IntelligenceType = "招投标" | "采购" | "新闻" | "扩产" | "招聘" | "认证" | "其他";
export type IntelligenceVerificationStatus = "待验证" | "已核实" | "不相关" | "已失效";

export type IntelligenceItem = {
  id: string;
  workspaceId: string;
  type: IntelligenceType;
  title: string;
  sourceUrl: string;
  publishedAt: string;
  capturedAt: string;
  summary: string;
  verificationStatus: IntelligenceVerificationStatus;
  companyIds: string[];
  topicIds: string[];
};

export type AppState = {
  dataVersion: number;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  topics: ResearchTopic[];
  hypotheses: ResearchHypothesis[];
  researchTasks: ResearchTask[];
  samplingStrategies: SamplingStrategy[];
  researchSamples: ResearchSample[];
  questionSets: QuestionSet[];
  companies: ResearchCompany[];
  plans: ResearchPlan[];
  records: ResearchRecord[];
  policies: PolicyRecord[];
  intelligence: IntelligenceItem[];
  capabilities: Capability[];
  questionTemplates: QuestionTemplate[];
};
