import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AppState, CompanyConfig, CompanyState } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

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
  try {
    const raw = await readFile(STATE_FILE, "utf8");
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
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}
