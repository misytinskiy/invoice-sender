import type { getEnv } from "@/lib/env";
import { createGoogleClients } from "@/lib/google/client";

type AppEnv = ReturnType<typeof getEnv>;

type ReplaceRule = {
  from: string;
  to: string;
};

export class GoogleDocsService {
  private readonly docs;
  private readonly drive;

  constructor(env: AppEnv) {
    const clients = createGoogleClients(env);
    this.docs = clients.docs;
    this.drive = clients.drive;
  }

  async replacePlaceholders(docId: string, values: Record<string, string>): Promise<void> {
    const requests = Object.entries(values).map(([key, value]) => ({
      replaceAllText: {
        containsText: {
          text: `{{${key}}}`,
          matchCase: true,
        },
        replaceText: value,
      },
    }));

    await this.docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    });
  }

  async replaceLiteralText(docId: string, replacements: ReplaceRule[]): Promise<void> {
    const safeReplacements = replacements.filter((item) => item.from && item.to && item.from !== item.to);

    if (safeReplacements.length === 0) {
      return;
    }

    const requests = safeReplacements.map((item) => ({
      replaceAllText: {
        containsText: {
          text: item.from,
          matchCase: true,
        },
        replaceText: item.to,
      },
    }));

    await this.docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    });
  }

  async exportPdf(docId: string): Promise<Buffer> {
    const response = await this.drive.files.export(
      {
        fileId: docId,
        mimeType: "application/pdf",
      },
      {
        responseType: "arraybuffer",
      },
    );

    return Buffer.from(response.data as ArrayBuffer);
  }
}
