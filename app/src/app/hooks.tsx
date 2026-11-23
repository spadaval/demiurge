import {
  createContext,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";
import type { LayerStore } from "~/layers/state";
import type { Store, WritableStore } from "~/workspace/store";
import type { Workspace } from "~/workspace/workspace";
import type { WorldStore } from "~/world/store";
import type { Bible } from "./bible";
import type { Environment } from "./environment";
import type { Generation } from "./generation";
import type { LayerSource } from "./layers";
import type { Manuscript } from "./manuscript";
import type { WorldIndex } from "./world";

/** Everything the app's views use, created once at startup. */
export interface AppServices {
  readonly workspace: Workspace;
  /** The world-facts store, wired to the workspace (see `createAppWorldStore`). */
  readonly world: WorldStore;
  readonly worldIndex: WorldIndex;
  readonly manuscript: Manuscript;
  readonly layers: LayerStore;
  readonly layerSource: LayerSource;
  readonly environment: Environment;
  readonly generation: Generation;
  /** The story bible, which the World inspector reads. */
  readonly bible: Bible;
  /** Whether the World tab is open, and what it last showed. */
  readonly worldTab: WritableStore<WorldTab>;
}

/** The World tab (DESIGN.md, Sheets): one tab for every inspector sheet. */
export interface WorldTab {
  readonly open: boolean;
  /** The view or record it last showed, as the URL's `at`. */
  readonly at: string;
}

const ServicesContext = createContext<AppServices | null>(null);

export function AppProviders({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext value={services}>{children}</ServicesContext>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("useServices outside AppProviders");
  return services;
}

export const useWorkspace = (): Workspace => useServices().workspace;
export const useEnvironment = (): Environment => useServices().environment;

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
