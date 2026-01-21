import React, { useState } from 'react';

// Harmonix Pro Analyzer - Redesign v2
// Design: Clean light theme, teal accent, transparent icons, feature-aligned

const HarmonixRedesignV2 = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeNav, setActiveNav] = useState('analyze');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFile, setHasFile] = useState(true); // Simulating loaded state
  
  // Tab config matching actual analysis features
  const analysisTabs = [
    { id: 'overview', label: 'Overview', desc: 'Key metrics at a glance' },
    { id: 'spectral', label: 'Spectral', desc: 'Frequency analysis' },
    { id: 'musical', label: 'Musical', desc: 'Melody & harmony' },
    { id: 'rhythm', label: 'Rhythm', desc: 'Tempo & groove' },
    { id: 'technical', label: 'Technical', desc: 'File info' },
  ];

  // Nav items with transparent SVG icons
  const navItems = [
    { id: 'analyze', label: 'Analyze', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }, // Lightning bolt
    { id: 'visualize', label: 'Visualize', icon: 'M3 3v18h18M9 17V9m4 8v-5m4 5v-8' }, // Chart
    { id: 'library', label: 'Library', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }, // Stack
    { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }, // Clock
    { id: 'compare', label: 'Compare', icon: 'M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01' }, // List
  ];

  const sections = [
    { id: 'intro', label: 'Intro', color: '#0D9488' },
    { id: 'verse1', label: 'Verse', color: '#0891B2' },
    { id: 'chorus1', label: 'Chorus', color: '#F59E0B' },
    { id: 'verse2', label: 'Verse', color: '#0891B2' },
    { id: 'chorus2', label: 'Chorus', color: '#F59E0B' },
    { id: 'bridge', label: 'Bridge', color: '#10B981' },
  ];

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#F8FAFC',
      minHeight: '100vh',
      color: '#1E293B',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid #E2E8F0;
        }
        
        .nav-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          background: transparent;
          position: relative;
        }
        
        .nav-icon:hover {
          background: rgba(13, 148, 136, 0.08);
        }
        
        .nav-icon.active {
          background: rgba(13, 148, 136, 0.12);
        }
        
        .nav-icon.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: #0D9488;
          border-radius: 0 2px 2px 0;
        }
        
        .nav-icon svg {
          width: 22px;
          height: 22px;
          stroke: #94A3B8;
          stroke-width: 1.5;
          fill: none;
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.05));
          transition: all 0.15s ease;
        }
        
        .nav-icon:hover svg,
        .nav-icon.active svg {
          stroke: #0D9488;
        }
        
        .nav-label {
          font-size: 9px;
          font-weight: 500;
          color: #94A3B8;
          margin-top: 2px;
          transition: color 0.15s ease;
        }
        
        .nav-icon:hover .nav-label,
        .nav-icon.active .nav-label {
          color: #0D9488;
        }
        
        .tab-btn {
          padding: 10px 16px;
          background: transparent;
          border: none;
          font-size: 13px;
          font-weight: 500;
          color: #64748B;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }
        
        .tab-btn:hover {
          color: #334155;
        }
        
        .tab-btn.active {
          color: #0D9488;
          border-bottom-color: #0D9488;
        }
        
        .metric-card {
          background: #F8FAFC;
          border-radius: 10px;
          padding: 16px;
          border: 1px solid #E2E8F0;
        }
        
        .metric-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        
        .metric-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .transport-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: #F1F5F9;
          color: #64748B;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        
        .transport-btn:hover {
          background: #E2E8F0;
          color: #334155;
        }
        
        .transport-btn.primary {
          width: 52px;
          height: 52px;
          background: #0D9488;
          color: white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
        }
        
        .transport-btn.primary:hover {
          background: #0F766E;
          transform: scale(1.05);
        }
        
        .progress-bar {
          height: 4px;
          background: #E2E8F0;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        
        .section-tag {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        
        .waveform-container {
          background: linear-gradient(180deg, #FAFBFC 0%, #F1F5F9 100%);
          border-radius: 8px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 1px;
          height: 120px;
        }
        
        .waveform-bar {
          flex: 1;
          border-radius: 1px;
          transition: all 0.1s ease;
        }
        
        .toggle-switch {
          width: 40px;
          height: 22px;
          border-radius: 11px;
          padding: 2px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .toggle-knob {
          width: 18px;
          height: 18px;
          border-radius: 9px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          transition: margin-left 0.2s ease;
        }
        
        .confidence-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .confidence-ring::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: currentColor;
          transform: rotate(-90deg);
        }
      `}</style>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '72px 1fr 340px',
        gridTemplateRows: '56px 1fr 100px',
        height: '100vh',
        gap: 0,
      }}>
        
        {/* Sidebar - Transparent Icons */}
        <div style={{
          gridRow: '1 / -1',
          background: 'white',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: '4px',
        }}>
          {/* Logo */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zM21 16c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"/>
            </svg>
          </div>
          
          {/* Navigation */}
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-icon ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
          
          {/* Bottom actions */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nav-icon">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
              </svg>
              <span className="nav-label">Record</span>
            </div>
            <div className="nav-icon">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              <span className="nav-label">Settings</span>
            </div>
          </div>
        </div>

        {/* Top Bar */}
        <div style={{
          gridColumn: '2 / 4',
          background: 'white',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          {/* File Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Pablo_vete_a_dormir.wav</span>
            <span style={{
              padding: '3px 8px',
              background: '#ECFDF5',
              color: '#059669',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
            }}>ANALYZED</span>
          </div>
          
          {/* Timecode */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            fontWeight: 600,
            color: '#1E293B',
          }}>
            01:24<span style={{ color: '#94A3B8' }}>.350</span>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{
              padding: '8px 14px',
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 13,
              color: '#475569',
              cursor: 'pointer',
            }}>
              Analysis Settings
            </button>
            <button style={{
              padding: '8px 14px',
              background: '#0D9488',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              color: 'white',
              cursor: 'pointer',
            }}>
              Export Results
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          padding: '20px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          
          {/* Waveform + Timeline */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Timeline */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 20px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#94A3B8',
            }}>
              {['0:00', '0:45', '1:30', '2:15', '3:00', '3:45'].map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
            
            {/* Waveform */}
            <div className="waveform-container">
              {Array.from({ length: 100 }, (_, i) => {
                const height = 15 + Math.sin(i * 0.18) * 30 + Math.random() * 25;
                const progress = i / 100;
                const isPlayed = progress < 0.38;
                return (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{
                      height: `${height}%`,
                      background: isPlayed ? '#0D9488' : '#CBD5E1',
                      opacity: isPlayed ? 1 : 0.5,
                    }}
                  />
                );
              })}
            </div>
            
            {/* Section markers */}
            <div style={{
              display: 'flex',
              height: 32,
              borderTop: '1px solid #E2E8F0',
            }}>
              {sections.map((s, i) => (
                <div key={s.id} style={{
                  flex: i === 2 || i === 4 ? 1.2 : 1,
                  background: `${s.color}10`,
                  borderRight: i < sections.length - 1 ? '1px solid white' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: s.color,
                }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Analysis Tabs */}
          <div className="card">
            {/* Tab Headers */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 16px',
            }}>
              {analysisTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div style={{ padding: '20px' }}>
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {/* BPM */}
                  <div className="metric-card">
                    <div className="metric-label" style={{ marginBottom: 8, color: '#0D9488' }}>Tempo</div>
                    <div className="metric-value" style={{ color: '#0D9488' }}>120</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>BPM • 94% conf</div>
                  </div>
                  
                  {/* Key */}
                  <div className="metric-card">
                    <div className="metric-label" style={{ marginBottom: 8, color: '#F59E0B' }}>Key</div>
                    <div className="metric-value" style={{ color: '#F59E0B' }}>C<span style={{ fontSize: 16, fontWeight: 500 }}> Major</span></div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>87% confidence</div>
                  </div>
                  
                  {/* Time Sig */}
                  <div className="metric-card">
                    <div className="metric-label" style={{ marginBottom: 8, color: '#0891B2' }}>Time Sig</div>
                    <div className="metric-value" style={{ color: '#0891B2' }}>4/4</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Common time</div>
                  </div>
                  
                  {/* Loudness */}
                  <div className="metric-card">
                    <div className="metric-label" style={{ marginBottom: 8, color: '#10B981' }}>Loudness</div>
                    <div className="metric-value" style={{ color: '#10B981' }}>-8.6</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>LUFS integrated</div>
                  </div>
                </div>
              )}
              
              {activeTab === 'spectral' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Left - Metrics */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Spectral Features</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="metric-card">
                        <div className="metric-label">Centroid</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 600, color: '#0891B2', marginTop: 8 }}>2,400 <span style={{ fontSize: 12, color: '#94A3B8' }}>Hz</span></div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Rolloff</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 600, color: '#0891B2', marginTop: 8 }}>3,800 <span style={{ fontSize: 12, color: '#94A3B8' }}>Hz</span></div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Brightness</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 600, color: '#0891B2', marginTop: 8 }}>67.2<span style={{ fontSize: 12, color: '#94A3B8' }}>%</span></div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Energy</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 600, color: '#0891B2', marginTop: 8 }}>0.842</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right - Visualization placeholder */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Frequency Distribution</h4>
                    <div style={{ background: '#F8FAFC', borderRadius: 8, height: 140, display: 'flex', alignItems: 'end', padding: '12px', gap: 3 }}>
                      {Array.from({ length: 24 }, (_, i) => {
                        const h = Math.max(10, 90 - Math.pow(i - 6, 2) * 0.8 + Math.random() * 10);
                        return (
                          <div key={i} style={{
                            flex: 1,
                            height: `${h}%`,
                            background: `linear-gradient(to top, #0891B2, #22D3EE)`,
                            borderRadius: 2,
                            opacity: 0.9,
                          }} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'musical' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Melody */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Melody Analysis</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="metric-label">Pitch Range</div>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 600, color: '#F59E0B', marginTop: 4 }}>24 ST</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>220 - 880 Hz</div>
                      </div>
                      <div className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="metric-label">Complexity</div>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 600, color: '#F59E0B', marginTop: 4 }}>68%</div>
                        </div>
                        <div style={{ width: 80 }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '68%', background: '#F59E0B' }} />
                          </div>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Contour</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginTop: 4 }}>Ascending • 82% smooth</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Harmony */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Harmonic Analysis</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="metric-card">
                        <div className="metric-label" style={{ marginBottom: 12 }}>Functional Harmony</div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 600, color: '#10B981' }}>45%</div>
                            <div style={{ fontSize: 10, color: '#64748B' }}>Tonic</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 600, color: '#0891B2' }}>30%</div>
                            <div style={{ fontSize: 10, color: '#64748B' }}>Subdominant</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 600, color: '#F59E0B' }}>25%</div>
                            <div style={{ fontSize: 10, color: '#64748B' }}>Dominant</div>
                          </div>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label" style={{ marginBottom: 8 }}>Detected Progressions</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: '#334155' }}>I → IV → V → I</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Cadential • 89% strength</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'rhythm' && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Groove Analysis</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Swing', value: 23, color: '#0D9488' },
                      { label: 'Syncopation', value: 45, color: '#0891B2' },
                      { label: 'Quantization', value: 78, color: '#10B981' },
                      { label: 'Evenness', value: 82, color: '#F59E0B' },
                    ].map((item) => (
                      <div key={item.label} className="metric-card">
                        <div className="metric-label">{item.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 24, fontWeight: 600, color: item.color, margin: '8px 0' }}>{item.value}%</div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${item.value}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'technical' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Duration', value: '3:55.000' },
                    { label: 'Sample Rate', value: '44,100 Hz' },
                    { label: 'Channels', value: 'Stereo' },
                    { label: 'Bit Depth', value: '16-bit' },
                    { label: 'File Size', value: '38.2 MB' },
                    { label: 'Format', value: 'WAV' },
                  ].map((item) => (
                    <div key={item.label} className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#64748B' }}>{item.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Export Panel */}
          <div className="card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>Export Analysis</span>
                <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 12 }}>Download in multiple formats</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['JSON', 'CSV', 'PDF Report'].map((f) => (
                  <button key={f} style={{
                    padding: '6px 12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inspector Panel */}
        <div style={{
          gridRow: '2 / 3',
          background: 'white',
          borderLeft: '1px solid #E2E8F0',
          overflow: 'auto',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Analysis Settings</h3>
          </div>
          
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Algorithm */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Algorithm</label>
              <select style={{
                width: '100%',
                padding: '10px 12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                color: '#1E293B',
              }}>
                <option>Essentia</option>
                <option>Librosa</option>
              </select>
            </div>
            
            {/* Window Size */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Window Size</label>
              <select style={{
                width: '100%',
                padding: '10px 12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                color: '#1E293B',
              }}>
                <option>2048</option>
                <option>4096</option>
              </select>
            </div>
            
            {/* Hop Size */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hop Size</label>
              <select style={{
                width: '100%',
                padding: '10px 12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                color: '#1E293B',
              }}>
                <option>512</option>
                <option>1024</option>
              </select>
            </div>
            
            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
              {[
                { label: 'Key Detection', on: true },
                { label: 'BPM Extraction', on: true },
                { label: 'Segment Analysis', on: false },
                { label: 'ML Classification', on: true },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>{item.label}</span>
                  <div 
                    className="toggle-switch"
                    style={{ background: item.on ? '#0D9488' : '#E2E8F0' }}
                  >
                    <div className="toggle-knob" style={{ marginLeft: item.on ? 18 : 0 }} />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Engine Status */}
            <div style={{ marginTop: 8, padding: 12, background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#10B981' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>Engine Ready</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>ML Models: 4/4 loaded</div>
            </div>
          </div>
        </div>

        {/* Transport Bar */}
        <div style={{
          gridColumn: '2 / 4',
          background: 'white',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          {/* Section Chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {sections.map((s) => (
              <button
                key={s.id}
                className="section-tag"
                style={{
                  background: `${s.color}10`,
                  color: s.color,
                  borderColor: s.color,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          
          {/* Transport Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="transport-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
            </button>
            <button className="transport-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="19 20 9 12 19 4 19 20"/>
                <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button 
              className="transport-btn primary"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>
            <button className="transport-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 4 15 12 5 20 5 4"/>
                <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button className="transport-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 014-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
            </button>
          </div>
          
          {/* Meters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { label: 'L', value: '-2.5', color: '#10B981' },
              { label: 'R', value: '-10.2', color: '#F59E0B' },
              { label: 'LUFS', value: '-8.6', color: '#0D9488' },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 600, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HarmonixRedesignV2;
