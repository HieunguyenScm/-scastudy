/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_DAILY_REQUEST_LIMIT?: string;
  AUTHORIZED_EMAILS?: string;
}

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}
