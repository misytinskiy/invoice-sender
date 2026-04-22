import type { getEnv } from "@/lib/env";

type AppEnv = ReturnType<typeof getEnv>;

type TelegramSendResult = {
  messageId: string;
};

export class TelegramService {
  private readonly botToken: string;

  constructor(env: AppEnv) {
    this.botToken = env.TELEGRAM_BOT_TOKEN;
  }

  async sendDocument(input: {
    chatId: string;
    fileBuffer: Buffer;
    fileName: string;
    caption: string;
  }): Promise<TelegramSendResult> {
    const formData = new FormData();
    formData.append("chat_id", input.chatId);
    formData.append("caption", input.caption);
    formData.append(
      "document",
      new Blob([input.fileBuffer], { type: "application/pdf" }),
      input.fileName,
    );

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.description || "Telegram sendDocument failed");
    }

    return {
      messageId: String(payload.result?.message_id ?? ""),
    };
  }
}
