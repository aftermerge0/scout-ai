import { Inngest } from "inngest";

import { env } from "@/lib/env";

// In production, Inngest auto-detects INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY
// from the environment. Locally, force dev mode so events/functions route to
// the Inngest Dev Server (`bunx inngest-cli dev`) without needing real keys.
export const inngest = new Inngest({ id: "scout", isDev: env.NODE_ENV !== "production" });
