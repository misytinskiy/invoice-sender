export type CompanyConfig = {
  companyKey: "company_a" | "company_b";
  templateDocId: string;
  telegramChatId: string;
  invoicePrefix: string;
  timezone: string;
  scheduleCron: string;
  enabled: boolean;
  companyName: string;
};

export type CompanyRunResult = {
  companyKey: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
};

export type CompanyState = {
  lastSuccessDate: string;
  lastInvoiceNumber: string;
  lastInvoiceDate: string;
  lastPeriodLabel: string;
};

export type AppState = {
  globalNextNumber: number;
  companies: Record<string, CompanyState>;
};
