/**
 * AppShell - 5-region DAW layout container
 * Phase 0-1: CSS Grid implementation matching reference mockup
 */

import type { AppShellProps } from '../../types/layout';

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      {children}
    </div>
  );
}

AppShell.displayName = 'AppShell';
