import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import autumn from "@useautumn/convex/convex.config";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(autumn);
app.use(resend);

export default app;
