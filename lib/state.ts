import { Redis } from "@upstash/redis";

import type { AppState, CompanyConfig, CompanyState } from "@/lib/types";

const STATE_KEY = process.env.STATE_REDIS_KEY || "invoice:state";

const redis = Redis.fromEnv();

function createEmptyState(globalStartNumber: number): AppState {
  return { globalNextNumber: globalStartNumber, companies: {} };
}

function normalizeState(raw: unknown, globalStartNumber: number): AppState {
  if (!raw || typeof raw !== "object") {
    return createEmptyState(globalStartNumber);
  }

  const maybeState = raw as Partial<AppState> & {
    companies?: Record<string, Partial<CompanyState> & { nextNumber?: number }>;
  };

  const companies = maybeState.companies && typeof maybeState.companies === "object" ? maybeState.companies : {};

  const normalizedCompanies: Record<string, CompanyState> = {};
  let maxHistoricalNext = globalStartNumber;

  for (const [companyKey, value] of Object.entries(companies)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    // Backward compatibility for old state shape with per-company nextNumber.
    if (typeof value.nextNumber === "number" && Number.isFinite(value.nextNumber)) {
      maxHistoricalNext = Math.max(maxHistoricalNext, Math.floor(value.nextNumber));
    }

    normalizedCompanies[companyKey] = {
      lastSuccessDate: value.lastSuccessDate ?? "",
      lastInvoiceNumber: value.lastInvoiceNumber ?? "",
      lastInvoiceDate: value.lastInvoiceDate ?? "",
      lastPeriodLabel: value.lastPeriodLabel ?? "",
    };
  }

  const normalizedGlobalNext =
    typeof maybeState.globalNextNumber === "number" && Number.isFinite(maybeState.globalNextNumber)
      ? Math.floor(maybeState.globalNextNumber)
      : maxHistoricalNext;

  return {
    globalNextNumber: Math.max(normalizedGlobalNext, globalStartNumber),
    companies: normalizedCompanies,
  };
}

export async function loadState(globalStartNumber: number): Promise<AppState> {
  const raw = await redis.get<string>(STATE_KEY);

  if (!raw) {
    return createEmptyState(globalStartNumber);
  }

  try {
    return normalizeState(JSON.parse(raw), globalStartNumber);
  } catch {
    return createEmptyState(globalStartNumber);
  }
}

export function ensureCompanyState(state: AppState, company: CompanyConfig): CompanyState {
  const existing = state.companies[company.companyKey];

  if (existing) {
    return existing;
  }

  const initialized: CompanyState = {
    lastSuccessDate: "",
    lastInvoiceNumber: "",
    lastInvoiceDate: "",
    lastPeriodLabel: "",
  };

  state.companies[company.companyKey] = initialized;
  return initialized;
}

export async function saveState(state: AppState): Promise<void> {
  await redis.set(STATE_KEY, JSON.stringify(state));
}
