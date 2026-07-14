import { describe, expect, it } from "vitest";
import { addLegacyPlanTargets, canCreateRecord, findFrozenQuestionSet, sampleCanBePlanned } from "./research-workflow";
import type { PlanTarget, QuestionSet, ResearchPlan, ResearchSample } from "./types";

const sample = (status: ResearchSample["status"]): ResearchSample => ({
  id: "sample-1",
  taskId: "task-1",
  companyId: "company-1",
  sampleRole: "样本",
  selectionReason: "测试",
  priority: "中",
  status,
  snapshotAt: "2026-07-14"
});

const questionSet = (id: string, status: QuestionSet["status"], frozenAt?: string): QuestionSet => ({
  id,
  workspaceId: "workspace-1",
  taskId: "task-1",
  companyId: "company-1",
  name: id,
  focus: "测试",
  version: 1,
  status,
  generatedAt: "2026-07-01",
  frozenAt,
  items: []
});

describe("research workflow rules", () => {
  it("requires a confirmed sample before it can be planned", () => {
    expect(sampleCanBePlanned(sample("候选"))).toBe(false);
    expect(sampleCanBePlanned(sample("已选定"))).toBe(true);
    expect(sampleCanBePlanned(sample("需复访"))).toBe(true);
    expect(sampleCanBePlanned(sample("已排除"))).toBe(false);
  });

  it("uses the requested frozen question set, or the latest compatible one", () => {
    const sets = [
      questionSet("draft", "草稿"),
      questionSet("old", "已冻结", "2026-07-03"),
      questionSet("latest", "已冻结", "2026-07-05")
    ];
    expect(findFrozenQuestionSet(sets, "company-1", "task-1")?.id).toBe("latest");
    expect(findFrozenQuestionSet(sets, "company-1", "task-1", "old")?.id).toBe("old");
  });

  it("allows a project-wide frozen outline to be reused by different companies", () => {
    const general = { ...questionSet("general", "已冻结", "2026-07-06"), companyId: "" };
    expect(findFrozenQuestionSet([general], "company-2", "task-1")?.id).toBe("general");
  });

  it("allows only one record for a runnable plan target", () => {
    const target: PlanTarget = {
      id: "target-1",
      planId: "plan-1",
      companyId: "company-1",
      questionSnapshot: [],
      scheduledAt: "2026-07-14",
      method: "现场访谈",
      owner: "我",
      status: "待执行"
    };
    expect(canCreateRecord(target, [])).toBe(true);
    expect(canCreateRecord({ ...target, status: "待安排" }, [])).toBe(false);
    expect(canCreateRecord(target, [{ id: "record-1", workspaceId: "workspace-1", planTargetId: "target-1", companyId: "company-1", date: "2026-07-14", interviewer: "我", summary: "", transcript: "", needs: [], conclusion: "" }])).toBe(false);
  });

  it("creates only missing plan targets during migration", () => {
    const plans: ResearchPlan[] = [{
      id: "plan-1",
      workspaceId: "workspace-1",
      companyIds: ["company-1", "company-2"],
      date: "2026-07-14",
      owner: "我",
      objective: "测试",
      status: "计划中"
    }];
    const persisted: PlanTarget[] = [{
      id: "target-existing",
      planId: "plan-1",
      companyId: "company-1",
      questionSnapshot: [],
      scheduledAt: "2026-07-14",
      method: "现场访谈",
      owner: "我",
      status: "待执行"
    }];
    expect(addLegacyPlanTargets(plans, persisted).map((item) => item.companyId)).toEqual(["company-1", "company-2"]);
  });
});
