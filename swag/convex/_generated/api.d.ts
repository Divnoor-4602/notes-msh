/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as claims from "../claims.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_emailTemplate from "../lib/emailTemplate.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_validation from "../lib/validation.js";
import type * as links from "../links.js";
import type * as outbox from "../outbox.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  claims: typeof claims;
  emails: typeof emails;
  http: typeof http;
  "lib/admin": typeof lib_admin;
  "lib/emailTemplate": typeof lib_emailTemplate;
  "lib/env": typeof lib_env;
  "lib/validation": typeof lib_validation;
  links: typeof links;
  outbox: typeof outbox;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
