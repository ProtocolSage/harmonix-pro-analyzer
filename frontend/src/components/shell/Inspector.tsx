/**
 * Inspector - Right panel (380px)
 * Phase 2: Tabbed panel with Settings/Results slots (controlled/uncontrolled)
 */

import { useState } from 'react';
import type { InspectorProps, InspectorTab } from '../../types/layout';

export function Inspector({
  activeTab: controlledTab,
  onTabChange,
  settingsSlot,
  resultsSlot
}: InspectorProps) {
  // Internal state for uncontrolled mode
  const [internalTab, setInternalTab] = useState<InspectorTab>('settings');

  // Use controlled tab if provided, otherwise internal state
  const activeTab = controlledTab ?? internalTab;
  const handleTabChange = (tab: InspectorTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <div className="shell-inspector">
      <div className="hp-inspector-header">
        <h3>{activeTab === 'settings' ? 'Analysis Settings' : 'Results'}</h3>
      </div>
      <div className="hp-inspector-body">
        {activeTab === 'settings' ? (settingsSlot ?? <SettingsPanel />) : (resultsSlot ?? <ResultsPanel />)}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [toggles, setToggles] = useState({
    keyDetection: true,
    bpmExtraction: true,
    segmentAnalysis: false,
    mlClassification: true,
  });

  const toggleSetting = (key: keyof typeof toggles) => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="hp-inspector-stack">
      <div className="hp-field">
        <label className="hp-label" htmlFor="hp-algorithm">Algorithm</label>
        <select id="hp-algorithm" defaultValue="essentia" className="hp-select">
          <option value="essentia">Essentia</option>
          <option value="librosa">Librosa</option>
        </select>
      </div>

      <div className="hp-field">
        <label className="hp-label" htmlFor="hp-window">Window Size</label>
        <select id="hp-window" defaultValue="2048" className="hp-select">
          <option value="2048">2048</option>
          <option value="4096">4096</option>
        </select>
      </div>

      <div className="hp-field">
        <label className="hp-label" htmlFor="hp-hop">Hop Size</label>
        <select id="hp-hop" defaultValue="512" className="hp-select">
          <option value="512">512</option>
          <option value="1024">1024</option>
        </select>
      </div>

      <div className="hp-toggle-list">
        {[
          { key: 'keyDetection', label: 'Key Detection' },
          { key: 'bpmExtraction', label: 'BPM Extraction' },
          { key: 'segmentAnalysis', label: 'Segment Analysis' },
          { key: 'mlClassification', label: 'ML Classification' },
        ].map((item) => (
          <div key={item.key} className="hp-toggle-row">
            <span className="hp-toggle-label">{item.label}</span>
            <button
              type="button"
              className={`hp-toggle ${toggles[item.key as keyof typeof toggles] ? 'is-on' : ''}`}
              aria-pressed={toggles[item.key as keyof typeof toggles]}
              onClick={() => toggleSetting(item.key as keyof typeof toggles)}
            >
              <span className="hp-toggle-knob" />
            </button>
          </div>
        ))}
      </div>

      <div className="hp-status-card">
        <div className="hp-status-title">
          <span className="hp-status-dot" />
          Engine Ready
        </div>
        <div className="hp-status-subtitle">ML Models: 4/4 loaded</div>
      </div>
    </div>
  );
}

function ResultsPanel() {
  return (
    <div className="hp-inspector-stack">
      <div className="hp-metric-card">
        <div className="hp-metric-label">Tempo</div>
        <div className="hp-metric-value hp-metric-value--small" style={{ ['--metric-color' as string]: '#0D9488' }}>
          120.5<span>BPM</span>
        </div>
        <div className="hp-metric-sub">94% confidence</div>
        <div className="hp-progress hp-progress--wide">
          <div className="hp-progress-fill" style={{ width: '94%', background: '#0D9488' }} />
        </div>
      </div>

      <div className="hp-metric-card">
        <div className="hp-metric-label">Key</div>
        <div className="hp-metric-value hp-metric-value--small" style={{ ['--metric-color' as string]: '#F59E0B' }}>
          C<span>Major</span>
        </div>
        <div className="hp-metric-sub">87% confidence</div>
        <div className="hp-progress hp-progress--wide">
          <div className="hp-progress-fill" style={{ width: '87%', background: '#F59E0B' }} />
        </div>
      </div>

      <div className="hp-metric-card">
        <div className="hp-metric-label">Loudness</div>
        <div className="hp-metric-value hp-metric-value--small" style={{ ['--metric-color' as string]: '#0891B2' }}>
          -14.3<span>LUFS</span>
        </div>
        <div className="hp-metric-sub">Integrated loudness</div>
        <div className="hp-progress hp-progress--wide">
          <div className="hp-progress-fill" style={{ width: '68%', background: '#0891B2' }} />
        </div>
      </div>
    </div>
  );
}

Inspector.displayName = 'Inspector';
