import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import resend from "@convex-dev/resend/convex.config";

// The app owns HTTP routing so the outbox API can keep stable /api/* URLs.
// registerStaticRoutes in convex/http.ts serves the SPA from everything else.
const app = defineApp();
app.use(staticHosting);
app.use(resend);

export default app;
