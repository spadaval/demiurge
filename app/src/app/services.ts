import { createProfileStore } from "~/generate/profile";
import { createLayerStore } from "~/layers/state";
import type { Fetch } from "~/llm/types";
import { createConnectedStorage } from "~/workspace/connected-storage";
import { createStore } from "~/workspace/store";
import type { KeyValueStore } from "~/workspace/tabs";
import type { Workspace } from "~/workspace/workspace";
import { createBible } from "./bible";
import type { Environment } from "./environment";
import { createGeneration } from "./generation";
import type { AppServices } from "./hooks";
import type { LayerSource } from "./layers";
import { createAppManuscript } from "./manuscript";
import { createAppTalk } from "./talk";
import { createAppWorldStore, createWorldIndex } from "./world";

export interface AppServicesInput {
  readonly workspace: Workspace;
  /** Workspace UI state and configuration per world (localStorage in the browser). */
  readonly keyValue: KeyValueStore;
  readonly layerSource: LayerSource;
  readonly environment: Environment;
  /** Sends generation requests. Defaults to the global `fetch`. */
  readonly fetch?: Fetch;
}

/** Creates the app's services around a workspace and loads what they show. */
export async function createAppServices(
  input: AppServicesInput,
): Promise<AppServices> {
  const { workspace, keyValue } = input;
  const world = createAppWorldStore(workspace);
  const worldIndex = createWorldIndex(world);
  const manuscript = createAppManuscript(workspace, world);
  const bible = createBible(
    createConnectedStorage(workspace.connection, workspace.readOnly),
  );
  const profile = createProfileStore(keyValue, workspace.worldId);
  // Talk turns write the bible through the bible service's storage, so what
  // the model changes shows in open scenes and the World inspector at once.
  const talk = createAppTalk({
    storage: bible.storage,
    profile,
    readOnly: workspace.readOnly,
    ...(input.fetch ? { fetch: input.fetch } : {}),
  });
  await Promise.all([
    worldIndex.refresh(),
    manuscript.refresh(),
    bible.refresh(),
    talk.refresh(),
  ]);
  return {
    workspace,
    world,
    worldIndex,
    manuscript,
    layers: createLayerStore(keyValue, workspace.worldId),
    layerSource: input.layerSource,
    environment: input.environment,
    bible,
    worldTab: createStore({ open: false, at: "cast" }),
    generation: createGeneration({
      workspace,
      storage: bible.storage,
      world,
      manuscript,
      profile,
      ...(input.fetch ? { fetch: input.fetch } : {}),
    }),
    talk,
  };
}
