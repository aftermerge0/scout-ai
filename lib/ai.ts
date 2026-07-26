import { createAzure, type AzureOpenAIProvider } from "@ai-sdk/azure";
import type { LanguageModel } from "ai";

import { env } from "@/lib/env";

let provider: AzureOpenAIProvider | undefined;

export function azure(): AzureOpenAIProvider {
  provider ??= createAzure({
    resourceName: env.AZURE_RESOURCE_NAME,
    apiKey: env.AZURE_API_KEY,
  });
  return provider;
}

/** Default chat model — arg is the Azure deployment name, not the OpenAI model id. */
export function model(deployment: string = env.AZURE_DEPLOYMENT_NAME ?? ""): LanguageModel {
  return azure()(deployment);
}
