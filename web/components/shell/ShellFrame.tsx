"use client";

import { SettingsTab } from "@/components/SettingsTab";
import { useShellNav, SETTINGS_VIEW_ID } from "@/hooks/useShellNav";
import { MODULES } from "@/modules/registry";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { MobileModuleDrawer } from "./MobileModuleDrawer";

export function ShellFrame() {
  const nav = useShellNav(MODULES);

  const activeModuleState = nav.activeModule
    ? nav.moduleStates[nav.activeModule.id]
    : undefined;
  const fullBleed = nav.activeModule?.fullBleed?.(activeModuleState) ?? false;

  return (
    <>
      {!fullBleed && <MobileTopBar onMenuClick={nav.openMobileDrawer} />}

      <div className="flex flex-1 overflow-hidden">
        {!fullBleed && (
          <Sidebar
            modules={MODULES}
            activeViewId={nav.activeViewId}
            onSelect={nav.switchView}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {MODULES.map((module) => {
            const isActive = module.id === nav.activeViewId;
            if (!nav.mountedViews.has(module.id)) return null;
            return (
              <div
                key={module.id}
                className={isActive ? "flex-1 flex flex-col overflow-hidden" : "hidden"}
              >
                {module.render({
                  state: nav.moduleStates[module.id],
                  setState: (next) => nav.setModuleState(module.id, next),
                })}
              </div>
            );
          })}
          {nav.mountedViews.has(SETTINGS_VIEW_ID) && (
            <div
              className={
                nav.activeViewId === SETTINGS_VIEW_ID
                  ? "flex-1 overflow-auto bg-[var(--color-surface-secondary)]"
                  : "hidden"
              }
            >
              <SettingsTab />
            </div>
          )}
        </div>
      </div>

      <MobileModuleDrawer
        open={nav.mobileDrawerOpen}
        onClose={nav.closeMobileDrawer}
        modules={MODULES}
        activeViewId={nav.activeViewId}
        onSelect={nav.switchView}
      />
    </>
  );
}
