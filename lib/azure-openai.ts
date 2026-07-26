import { createAzure } from "@ai-sdk/azure";
import type { LanguageModel } from "ai";

import { assertConfiguredFor, env } from "@/lib/env";

type GlobalWithAzureModel = typeof globalThis & { __scoutAzureModel?: LanguageModel };

/**
 * Returns the configured Azure OpenAI chat deployment as an AI SDK
 * `LanguageModel`, ready to pass to `generateObject`/`generateText`.
 */
export function getAzureModel(): LanguageModel {
  const g = globalThis as GlobalWithAzureModel;
  if (g.__scoutAzureModel) return g.__scoutAzureModel;

  assertConfiguredFor("azureOpenAI");
  const azure = createAzure({
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: env.AZURE_OPENAI_ENDPOINT,
    ...(env.AZURE_OPENAI_API_VERSION ? { apiVersion: env.AZURE_OPENAI_API_VERSION } : {}),
  });

  const model = azure.chat(env.AZURE_OPENAI_DEPLOYMENT!);
  g.__scoutAzureModel = model;
  return model;
}
