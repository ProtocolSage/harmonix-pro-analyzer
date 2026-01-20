/**
 * AppShell - 5-region DAW layout container
 * Phase 0-1: CSS Grid implementation matching reference mockup
 */

import { useTheme } from '../../contexts/UIContext';
import type { AppShellProps } from '../../types/layout';

export function AppShell({ children }: AppShellProps) {
  const theme = useTheme();
  
  return (
    <div className={`app-shell obsidian-chassis ${theme === 'light' ? 'light-mode' : ''}`}>
      {children}
    </div>
  );
}

AppShell.displayName = 'AppShell';
