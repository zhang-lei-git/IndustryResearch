import { describe, expect, it } from "vitest";
import { policyMatchesCompany } from "./policy";
import type { PolicyRecord, ResearchCompany } from "./types";

const policy: PolicyRecord = {
  id: "policy-1", name: "技改支持", level: "市级", amount: "最高100万元",
  appliesToTypes: ["重点"], appliesToPositions: ["零部件"], serviceMatches: ["MES"],
  decisionValue: "降低技改项目投入门槛。", sourceUrl: "", publishedAt: "", validUntil: "",
  status: "有效", version: 1, lastUpdatedAt: ""
};

const company: ResearchCompany = {
  id: "company-1", workspaceId: "workspace-1", name: "样例企业", region: "阎良", industry: "航空零部件",
  companyType: "重点企业", chainPosition: "零部件/精密加工", scale: "成长型企业", contact: "", status: "待调研", maturity: 30, notes: ""
};

describe("policy matching", () => {
  it("matches a company when its type and chain position meet policy conditions", () => {
    expect(policyMatchesCompany(policy, company)).toBe(true);
  });

  it("does not match when a required industry position is missing", () => {
    expect(policyMatchesCompany({ ...policy, appliesToPositions: ["试飞"] }, company)).toBe(false);
  });
});
