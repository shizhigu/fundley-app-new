/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as chats from "../chats.js";
import type * as cleanup from "../cleanup.js";
import type * as latexMetrics from "../latexMetrics.js";
import type * as messages from "../messages.js";
import type * as metrics from "../metrics.js";
import type * as organizations from "../organizations.js";
import type * as streams from "../streams.js";
import type * as users from "../users.js";
import type * as visualizationCache from "../visualizationCache.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chats: typeof chats;
  cleanup: typeof cleanup;
  latexMetrics: typeof latexMetrics;
  messages: typeof messages;
  metrics: typeof metrics;
  organizations: typeof organizations;
  streams: typeof streams;
  users: typeof users;
  visualizationCache: typeof visualizationCache;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
