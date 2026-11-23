/**
 * Which model a story agent session talks to, and with what. A session has a
 * role, and each role is bound to its own backend profile and sampler, so
 * structural work (planning, reworking, talking the story through) can go to
 * a reasoning model with the story tools while prose drafting goes to a
 * finetune or a local model that never sees a tool.
 *
 * Bindings are configuration of this browser, like the backend profile
 * (`generate/profile.ts`): the runner is given them when it is created, and a
 * session records only its role. The API key stays in the profile and never
 * reaches a stored request.
 */

import type { BackendProfile, Sampler } from "../llm/types";

export const AGENT_ROLES = ["plan", "prose"] as const;

/**
 * `plan`: structural work and talk, with the story tools. `prose`: drafting
 * a scene's prose.
 */
export type AgentRole = (typeof AGENT_ROLES)[number];

/**
 * Which story tools a session offers: every tool, the read queries only, or
 * none (for a model that can't call tools, or shouldn't).
 */
export type ToolAccess = "all" | "queries" | "none";

/** The tools each role offers unless its binding says otherwise. */
export const DEFAULT_TOOL_ACCESS: Record<AgentRole, ToolAccess> = {
  plan: "all",
  prose: "none",
};

/** The model a role talks to. */
export type ModelBinding = {
  profile: BackendProfile;
  /** Laid over the profile's own sampler; later keys win. */
  sampler?: Sampler;
  /** Defaults to `DEFAULT_TOOL_ACCESS` for the role. */
  tools?: ToolAccess;
  /** Stream the response, for `onEvent` deltas. Off unless set. */
  stream?: boolean;
};

/** One binding per role. Two roles may share a profile. */
export type ProfileBindings = Record<AgentRole, ModelBinding>;

export const toolAccess = (role: AgentRole, binding: ModelBinding) =>
  binding.tools ?? DEFAULT_TOOL_ACCESS[role];
