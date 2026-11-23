/**
 * What a new story agent session starts with, per backend profile and role:
 * a system prompt, a model and a sampler the writer saved as that profile's
 * default from the agent slip ("Profile default"). An edit scoped to "This session"
 * goes on the session record instead (`AgentRunner.configure`).
 *
 * Like the profile itself (`generate/profile.ts`), this is configuration of
 * this browser, kept per world in a key-value store (localStorage), keyed by
 * the profile's stable `name`, so relabelling the profile keeps its defaults.
 */

import { err, ok, type Result } from "neverthrow";
import type { Sampler } from "../llm/types";
import type { KeyValueStore } from "../workspace/tabs";
import { AGENT_ROLES, type AgentRole } from "./profiles";
import { defaultSystemPrompt } from "./prompt";

/** A role's saved defaults; a field that is absent was never saved. */
export type RoleDefaults = {
  systemPrompt?: string;
  model?: string;
  sampler?: Sampler;
};

/** Changes to a role's defaults; `model: null` goes back to the profile's. */
export type DefaultChanges = {
  systemPrompt?: string;
  model?: string | null;
  sampler?: Sampler;
};

/** What a new session of `role` with a profile starts with. */
export type SessionDefaults = {
  systemPrompt: string;
  /** In place of the profile's model; none when nothing was saved. */
  model?: string;
  /** Laid over the role binding's sampler; none when nothing was saved. */
  sampler?: Sampler;
};

export interface AgentDefaultsStore {
  /** The saved defaults, with the built-in system prompt for what isn't. */
  get(profile: string, role: AgentRole): SessionDefaults;
  /**
   * Saves `changes` over what is saved for the profile and role. Err with
   * the reason if the browser refused.
   */
  save(
    profile: string,
    role: AgentRole,
    changes: DefaultChanges,
  ): Result<void, string>;
}

type Saved = Record<string, Partial<Record<AgentRole, RoleDefaults>>>;

// Keeps the old product name, as every other key does.
const keyFor = (worldId: string) => `worldcrafter:${worldId}:agent-defaults`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** One role's stored defaults, keeping only the fields in the right shape. */
function roleDefaults(value: unknown): RoleDefaults {
  if (!isObject(value)) return {};
  const { systemPrompt, model, sampler } = value;
  return {
    ...(typeof systemPrompt === "string" ? { systemPrompt } : {}),
    ...(typeof model === "string" ? { model } : {}),
    // Read back from JSON, so every value is a JSON value.
    ...(isObject(sampler) ? { sampler: sampler as Sampler } : {}),
  };
}

function parse(text: string | null): Saved {
  let value: unknown;
  try {
    value = JSON.parse(text ?? "null");
  } catch {
    // Unreadable counts as nothing saved; the built-in defaults apply.
    return {};
  }
  if (!isObject(value)) return {};
  const saved: Saved = {};
  for (const [profile, roles] of Object.entries(value)) {
    if (!isObject(roles)) continue;
    const entry: Partial<Record<AgentRole, RoleDefaults>> = {};
    for (const role of AGENT_ROLES) {
      if (roles[role] !== undefined) entry[role] = roleDefaults(roles[role]);
    }
    saved[profile] = entry;
  }
  return saved;
}

export function createAgentDefaultsStore(
  keyValue: KeyValueStore,
  worldId: string,
): AgentDefaultsStore {
  const key = keyFor(worldId);
  return {
    get(profile, role) {
      const saved = parse(keyValue.getItem(key))[profile]?.[role] ?? {};
      return {
        systemPrompt: saved.systemPrompt ?? defaultSystemPrompt(role),
        ...(saved.model === undefined ? {} : { model: saved.model }),
        ...(saved.sampler === undefined ? {} : { sampler: saved.sampler }),
      };
    },
    save(profile, role, changes) {
      const saved = parse(keyValue.getItem(key));
      const roles = saved[profile] ?? {};
      const { model, ...rest } = changes;
      const next: RoleDefaults = { ...roles[role], ...rest };
      if (model === null) delete next.model;
      else if (model !== undefined) next.model = model;
      roles[role] = next;
      saved[profile] = roles;
      try {
        keyValue.setItem(key, JSON.stringify(saved));
      } catch (cause) {
        return err(
          `The browser refused to store the default (${cause instanceof Error ? cause.message : String(cause)}).`,
        );
      }
      return ok(undefined);
    },
  };
}
