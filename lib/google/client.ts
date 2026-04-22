import { google } from "googleapis";

import type { getEnv } from "@/lib/env";

type AppEnv = ReturnType<typeof getEnv>;

const scopes = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
];

export function createGoogleAuth(env: AppEnv) {
  return new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY,
    scopes,
    projectId: env.GOOGLE_PROJECT_ID,
  });
}

export function createGoogleClients(env: AppEnv) {
  const auth = createGoogleAuth(env);

  return {
    docs: google.docs({ version: "v1", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}
