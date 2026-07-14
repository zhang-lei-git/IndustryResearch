import type { PlanTarget, QuestionSet, ResearchPlan, ResearchRecord, ResearchSample } from "./types";

export function sampleCanBePlanned(sample: ResearchSample) {
  return sample.status === "已选定" || sample.status === "已计划" || sample.status === "需复访";
}

export function findFrozenQuestionSet(questionSets: QuestionSet[], companyId: string, taskId: string, preferredId?: string) {
  const preferred = questionSets.find((item) => item.id === preferredId && item.status === "已冻结");
  if (preferred) return preferred;
  return questionSets
    .filter((item) => (!item.companyId || item.companyId === companyId) && item.status === "已冻结" && (!taskId || !item.taskId || item.taskId === taskId))
    .sort((a, b) => (b.frozenAt || b.generatedAt).localeCompare(a.frozenAt || a.generatedAt))[0];
}

export function canCreateRecord(target: PlanTarget | undefined, records: ResearchRecord[]) {
  return Boolean(target)
    && Boolean(target?.scheduledAt)
    && ["已预约", "待执行", "执行中"].includes(target?.status ?? "")
    && !records.some((record) => record.planTargetId === target?.id);
}

export function addLegacyPlanTargets(plans: ResearchPlan[], persistedTargets: PlanTarget[]) {
  const keys = new Set(persistedTargets.map((target) => `${target.planId}:${target.companyId}`));
  return [
    ...persistedTargets,
    ...plans.flatMap((plan) => plan.companyIds
      .filter((companyId) => !keys.has(`${plan.id}:${companyId}`))
      .map((companyId) => ({
        id: `legacy-target-${plan.id}-${companyId}`,
        planId: plan.id,
        companyId,
        questionSnapshot: plan.questionSnapshot ?? [],
        scheduledAt: plan.date,
        method: "待补充",
        owner: plan.owner,
        status: plan.status === "已完成" ? "已完成" : "待执行"
      } satisfies PlanTarget)))
  ];
}
