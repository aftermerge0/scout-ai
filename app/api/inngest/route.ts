import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { evaluateCompany } from "@/inngest/functions/evaluate-company";

// Internal endpoint used by Inngest to discover and invoke functions.
// The frontend must never call this route directly.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [evaluateCompany],
});
