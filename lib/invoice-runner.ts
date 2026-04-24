import { matchesCronDate } from "@/lib/cron";
import { formatInvoiceDate, formatInvoiceNumber, formatPeriodLabel } from "@/lib/date-time";
import { getCompanyConfigs, getEnv, parsePositiveInt } from "@/lib/env";
import { GoogleDocsService } from "@/lib/google/docs";
import { ensureCompanyState, loadState, saveState } from "@/lib/state";
import { TelegramService } from "@/lib/telegram";
import type { CompanyRunResult } from "@/lib/types";

function shortError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Unknown error";
}

export async function runInvoices(now = new Date()): Promise<CompanyRunResult[]> {
  const env = getEnv();
  const companies = getCompanyConfigs(env);
  const docs = new GoogleDocsService(env);
  const telegram = new TelegramService(env);
  const globalStartNumber = parsePositiveInt(env.GLOBAL_START_NUMBER, "GLOBAL_START_NUMBER");
  const state = await loadState(globalStartNumber);
  const results: CompanyRunResult[] = [];

  for (const company of companies) {
    if (!company.enabled) {
      results.push({ companyKey: company.companyKey, status: "skipped", reason: "disabled" });
      continue;
    }

    if (!matchesCronDate(company.scheduleCron, now, company.timezone)) {
      results.push({ companyKey: company.companyKey, status: "skipped", reason: "schedule_mismatch" });
      continue;
    }

    const companyState = ensureCompanyState(state, company);
    const invoiceDate = formatInvoiceDate(now, company.timezone);

    if (companyState.lastSuccessDate === invoiceDate) {
      results.push({
        companyKey: company.companyKey,
        status: "skipped",
        reason: "duplicate_for_day",
        invoiceDate,
      });
      continue;
    }

    const invoiceNumber = formatInvoiceNumber(state.globalNextNumber, company.invoicePrefix);
    const periodLabel = formatPeriodLabel(now, company.timezone);

    try {
      if (companyState.lastInvoiceNumber || companyState.lastInvoiceDate || companyState.lastPeriodLabel) {
        await docs.replaceLiteralText(company.templateDocId, [
          {
            from: companyState.lastInvoiceNumber,
            to: "{{invoice_number}}",
          },
          {
            from: companyState.lastInvoiceDate,
            to: "{{invoice_date}}",
          },
          {
            from: companyState.lastPeriodLabel,
            to: "{{period_label}}",
          },
        ]);
      }

      await docs.replacePlaceholders(company.templateDocId, {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        period_label: periodLabel,
        company_name: company.companyName,
      });

      const pdfBuffer = await docs.exportPdf(company.templateDocId);

      await telegram.sendDocument({
        chatId: company.telegramChatId,
        fileBuffer: pdfBuffer,
        fileName: `invoice-${invoiceNumber}.pdf`,
        caption: `Invoice ${invoiceNumber} (${invoiceDate})`,
      });

      state.globalNextNumber += 1;
      companyState.lastSuccessDate = invoiceDate;
      companyState.lastInvoiceNumber = invoiceNumber;
      companyState.lastInvoiceDate = invoiceDate;
      companyState.lastPeriodLabel = periodLabel;

      results.push({
        companyKey: company.companyKey,
        status: "success",
        invoiceNumber,
        invoiceDate,
      });
    } catch (error) {
      results.push({
        companyKey: company.companyKey,
        status: "failed",
        reason: shortError(error),
        invoiceNumber,
        invoiceDate,
      });
    }
  }

  await saveState(state);

  return results;
}
