export type CompanyStatus = "待调研" | "已预约" | "调研中" | "已完成";
export type NeedPriority = "高" | "中" | "低";

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
  companyId: string;
  date: string;
  owner: string;
  objective: string;
  status: "计划中" | "已完成";
};

export type NeedItem = {
  id: string;
  category: string;
  description: string;
  priority: NeedPriority;
  capability: string;
};

export type ResearchRecord = {
  id: string;
  workspaceId: string;
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

export type TenderSignal = {
  id: string;
  title: string;
  source: string;
  date: string;
  status: string;
  relevance: string;
};

export type AppState = {
  dataVersion: number;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  topics: ResearchTopic[];
  hypotheses: ResearchHypothesis[];
  companies: ResearchCompany[];
  plans: ResearchPlan[];
  records: ResearchRecord[];
  policies: PolicyRecord[];
  capabilities: Capability[];
  questionTemplates: QuestionTemplate[];
};
