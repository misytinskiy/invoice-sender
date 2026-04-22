import type { CompanyConfig } from "@/lib/types";

const requiredEnvKeys = [
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_PROJECT_ID",
  "TELEGRAM_BOT_TOKEN",
  "CRON_SECRET",
  "GLOBAL_START_NUMBER",
  "COMPANY_A_DOC_ID",
  "COMPANY_A_TELEGRAM_CHAT_ID",
  "COMPANY_A_COMPANY_NAME",
  "COMPANY_A_TIMEZONE",
  "COMPANY_A_SCHEDULE_CRON",
  "COMPANY_B_DOC_ID",
  "COMPANY_B_TELEGRAM_CHAT_ID",
  "COMPANY_B_COMPANY_NAME",
  "COMPANY_B_TIMEZONE",
  "COMPANY_B_SCHEDULE_CRON",
] as const;

type EnvKey = (typeof requiredEnvKeys)[number];

type AppEnv = Record<
  EnvKey | "COMPANY_A_ENABLED" | "COMPANY_B_ENABLED" | "COMPANY_A_INVOICE_PREFIX" | "COMPANY_B_INVOICE_PREFIX",
  string
>;

function readRequiredEnv(key: EnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  if (key === "GOOGLE_PRIVATE_KEY") {
    return value.replace(/\\n/g, "\n");
  }

  return value;
}

function readOptionalEnv(key: "COMPANY_A_ENABLED" | "COMPANY_B_ENABLED", fallback: string): string {
  return process.env[key] ?? fallback;
}

function readOptionalString(key: "COMPANY_A_INVOICE_PREFIX" | "COMPANY_B_INVOICE_PREFIX", fallback = ""): string {
  return process.env[key] ?? fallback;
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function parsePositiveInt(value: string, key: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid numeric value for ${key}: ${value}`);
  }

  return Math.floor(parsed);
}

export function getEnv(): AppEnv {
  const base = requiredEnvKeys.reduce((acc, key) => {
    acc[key] = readRequiredEnv(key);
    return acc;
  }, {} as Record<EnvKey, string>);

  return {
    ...base,
    COMPANY_A_ENABLED: readOptionalEnv("COMPANY_A_ENABLED", "true"),
    COMPANY_B_ENABLED: readOptionalEnv("COMPANY_B_ENABLED", "true"),
    COMPANY_A_INVOICE_PREFIX: readOptionalString("COMPANY_A_INVOICE_PREFIX", ""),
    COMPANY_B_INVOICE_PREFIX: readOptionalString("COMPANY_B_INVOICE_PREFIX", ""),
  };
}

export function getCompanyConfigs(env = getEnv()): CompanyConfig[] {
  return [
    {
      companyKey: "company_a",
      templateDocId: env.COMPANY_A_DOC_ID,
      telegramChatId: env.COMPANY_A_TELEGRAM_CHAT_ID,
      invoicePrefix: env.COMPANY_A_INVOICE_PREFIX,
      timezone: env.COMPANY_A_TIMEZONE,
      scheduleCron: env.COMPANY_A_SCHEDULE_CRON,
      enabled: parseBoolean(env.COMPANY_A_ENABLED),
      companyName: env.COMPANY_A_COMPANY_NAME,
    },
    {
      companyKey: "company_b",
      templateDocId: env.COMPANY_B_DOC_ID,
      telegramChatId: env.COMPANY_B_TELEGRAM_CHAT_ID,
      invoicePrefix: env.COMPANY_B_INVOICE_PREFIX,
      timezone: env.COMPANY_B_TIMEZONE,
      scheduleCron: env.COMPANY_B_SCHEDULE_CRON,
      enabled: parseBoolean(env.COMPANY_B_ENABLED),
      companyName: env.COMPANY_B_COMPANY_NAME,
    },
  ];
}
