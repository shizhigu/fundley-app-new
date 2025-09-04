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
import type * as documents from "../documents.js";
import type * as messages from "../messages.js";
import type * as metrics from "../metrics.js";
import type * as migrations from "../migrations.js";
import type * as organizations from "../organizations.js";
import type * as streams from "../streams.js";
import type * as users from "../users.js";
import type * as visualizationCache from "../visualizationCache.js";
import type * as votes from "../votes.js";
import type * as votes_old from "../votes_old.js";

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
  documents: typeof documents;
  messages: typeof messages;
  metrics: typeof metrics;
  migrations: typeof migrations;
  organizations: typeof organizations;
  streams: typeof streams;
  users: typeof users;
  visualizationCache: typeof visualizationCache;
  votes: typeof votes;
  votes_old: typeof votes_old;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
