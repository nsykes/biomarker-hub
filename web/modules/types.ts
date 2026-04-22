import type { ReactNode } from "react";

export interface ModuleContext<TState = unknown> {
  state: TState;
  setState: (next: TState) => void;
}

export interface ModuleDef<TState = unknown> {
  id: string;
  name: string;
  renderIcon: (props: { active: boolean }) => ReactNode;
  initialState: TState;
  fullBleed?: (state: TState) => boolean;
  parseUrlState: (params: URLSearchParams) => TState;
  stringifyUrlState: (state: TState) => Record<string, string>;
  render: (ctx: ModuleContext<TState>) => ReactNode;
}
