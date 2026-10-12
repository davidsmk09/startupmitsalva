import type { AuditStatus } from "@/lib/constants";

export type AuditCheckResult = {
  checkKey: string;
  title: string;
  status: AuditStatus;
  weight: number;
  details: string;
  recommendation: string;
  data?: Record<string, unknown>;
};
