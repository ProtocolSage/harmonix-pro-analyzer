import { Layers, RefreshCw } from 'lucide-react';
import { useComparison } from '../../contexts/ComparisonContext';
import type { TopBarProps } from '../../types/layout';

export function TopBar({
  projectName = 'Song_Analysis_Project',
  currentTime = '00:00.000',
  activeTab = 'settings',
  onTabChange,
}: TopBarProps) {
  const { state: compState, toggleComparisonMode, swapRoles } = useComparison();
  const [timeMain, timeMs] = currentTime.split('.');

  return (
    <div className="shell-topbar">
      <div className="hp-topbar-left">
        <div className="hp-file-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <span className="hp-file-name">{projectName}</span>
        <span className="hp-file-status">{compState.activeSlot === 'source' ? 'LIVE' : 'REFERENCE'}</span>
      </div>

      <div className="hp-timecode">
        <span>{timeMain}</span>
        {timeMs && <span className="hp-timecode-ms">.{timeMs}</span>}
      </div>

      <div className="hp-topbar-actions">
        {compState.isComparisonMode && (
          <button
            type="button"
            onClick={swapRoles}
            className="hp-btn hp-btn-ghost"
            style={{ color: 'var(--studio-accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Swap Source/Reference (Hotkey: S)"
          >
            <RefreshCw size={14} />
            <span>SWAP</span>
          </button>
        )}
        
        <button
          type="button"
          onClick={() => toggleComparisonMode()}
          className={`hp-btn hp-btn-ghost ${compState.isComparisonMode ? 'is-active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={14} />
          <span>Comparison Mode</span>
        </button>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 8px' }} />

        <button
          type="button"
          onClick={() => onTabChange?.('settings')}
          className={`hp-btn hp-btn-ghost ${activeTab === 'settings' ? 'is-active' : ''}`}
        >
          Analysis Settings
        </button>
        <button
          type="button"
          onClick={() => onTabChange?.('results')}
          className={`hp-btn hp-btn-primary ${activeTab === 'results' ? 'is-active' : ''}`}
        >
          Export Results
        </button>
      </div>
    </div>
  );
}

TopBar.displayName = 'TopBar';
