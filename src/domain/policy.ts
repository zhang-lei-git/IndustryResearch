import type { PolicyRecord, ResearchCompany } from "./types";

export function policyMatchesCompany(policy: PolicyRecord, company: ResearchCompany) {
  const typeMatched = !policy.appliesToTypes.length || policy.appliesToTypes.some((type) => company.companyType.includes(type) || company.scale.includes(type));
  const positionMatched = !policy.appliesToPositions.length || policy.appliesToPositions.some((position) => company.chainPosition.includes(position) || company.industry.includes(position));
  return typeMatched && positionMatched;
}
