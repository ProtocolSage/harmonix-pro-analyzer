import React from 'react';
import { Music2, Activity } from 'lucide-react';

export function StudioHeader() {
  return (
    <header className="studio-card-glass" style={{
      marginBottom: '32px',
      borderRadius: '16px',
      background: 'var(--studio-glass-bg)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--studio-glass-border)',
      boxShadow: 'var(--studio-shadow-lg)'
    }}>
      <div className="flex items-center justify-between" style={{ padding: '24px 32px' }}>
        <div className="flex items-center gap-4">
          <div style={{
            background: 'linear-gradient(135deg, var(--studio-accent-gold), var(--studio-accent-cyan))',
            padding: '12px',
            borderRadius: '12px',
            boxShadow: 'var(--studio-shadow-glow)'
          }}>
            <Activity className="w-8 h-8" style={{ color: 'var(--studio-bg-primary)' }} />
          </div>
          <div>
            <h1 className="studio-header" style={{ marginBottom: 0 }}>
              <span style={{
                background: 'linear-gradient(135deg, var(--studio-accent-gold), var(--studio-accent-cyan))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Harmonix Pro
              </span>
            </h1>
            <p className="studio-subheader" style={{ marginTop: '4px', fontSize: '12px' }}>
              Professional Audio Analysis Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="studio-badge studio-badge-info">
            <Music2 className="w-3 h-3" />
            <span>Studio Grade</span>
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--studio-text-tertiary)',
            fontFamily: 'var(--font-mono)',
            textAlign: 'right'
          }}>
            <div>Powered by Essentia.js</div>
            <div style={{ marginTop: '2px' }}>TensorFlow.js ML</div>
          </div>
        </div>
      </div>

      <div className="studio-divider-gold" style={{ margin: 0 }}></div>
    </header>
  );
}
