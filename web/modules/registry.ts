import type { ModuleDef } from "./types";
import { biomarkerModule } from "./biomarker/manifest";

export const MODULES: ReadonlyArray<ModuleDef<unknown>> = [
  biomarkerModule as ModuleDef<unknown>,
];

export function getModule(id: string): ModuleDef<unknown> | undefined {
  return MODULES.find((m) => m.id === id);
}
