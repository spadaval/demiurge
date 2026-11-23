/**
 * Sending a session's next turn with the writer's edits from the agent slip
 * (`generate/agent-slip.tsx`): its system prompt and sampler, each scoped to
 * this session or saved as the profile's default for new sessions, and its
 * context packet, for this turn only.
 *
 * A default is saved first, then the session is changed, then the message is
 * sent, so a refusal at any point sends nothing the writer didn't see.
 */

import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type { Sampler } from "../llm/types";
import type { ContextPacket } from "./context";
import type { AgentDefaultsStore } from "./defaults";
import type { AgentSession } from "./records";
import type {
  AgentError,
  AgentRunner,
  RunOptions,
  RunOutcome,
  SessionChanges,
} from "./runner";

/** Who an edit to the prompt or sampler is for. */
export type EditScope = "session" | "default";

/** The writer's edits for the next turn; an absent part wasn't edited. */
export type NextTurnEdits = {
  systemPrompt?: { text: string; scope: EditScope };
  sampler?: { value: Sampler; scope: EditScope };
  /** The packet the writer was shown, and the text they left it as. */
  context?: { packet: ContextPacket; text: string };
};

export type NextTurnError =
  | AgentError
  /** The browser refused to store a profile default. */
  | { kind: "default_not_saved"; message: string };

export type NextTurnServices = {
  runner: AgentRunner;
  defaults: AgentDefaultsStore;
  /** The profile's stable name, which its defaults are kept under. */
  profile: string;
};

/**
 * Applies `edits` and sends `message` as the session's next turn. A prompt
 * or sampler edit applies to this session either way; with scope `default`
 * it is also saved for every new session of the role with this profile.
 */
export function sendNextTurn(
  { runner, defaults, profile }: NextTurnServices,
  session: AgentSession,
  message: string,
  edits: NextTurnEdits,
  options: RunOptions = {},
): ResultAsync<RunOutcome, NextTurnError> {
  const { systemPrompt, sampler, context } = edits;
  const asDefault = {
    ...(systemPrompt?.scope === "default"
      ? { systemPrompt: systemPrompt.text }
      : {}),
    ...(sampler?.scope === "default" ? { sampler: sampler.value } : {}),
  };
  if (Object.keys(asDefault).length > 0) {
    const saved = defaults.save(profile, session.role, asDefault);
    if (saved.isErr()) {
      return errAsync({ kind: "default_not_saved", message: saved.error });
    }
  }
  const changes: SessionChanges = {
    ...(systemPrompt === undefined ? {} : { systemPrompt: systemPrompt.text }),
    ...(sampler === undefined ? {} : { sampler: sampler.value }),
  };
  const configured: ResultAsync<unknown, NextTurnError> =
    Object.keys(changes).length === 0
      ? okAsync(session)
      : runner.configure(session.id, changes);
  return configured.andThen(() =>
    runner.send(session.id, message, {
      ...options,
      ...(context === undefined ? {} : { context }),
    }),
  );
}
