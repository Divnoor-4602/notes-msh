import { createAuth } from "../../convex/auth";
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { headers } from "next/headers";

export const getToken = () => {
  return getTokenNextjs(createAuth);
};

// Create auth instance for server-side use
// We need to pass a mock context since we're not in a Convex function
const mockCtx = {} as any;
export const auth = createAuth(mockCtx, { optionsOnly: false });
