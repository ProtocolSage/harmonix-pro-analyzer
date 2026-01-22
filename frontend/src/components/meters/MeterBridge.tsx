import { VUMeter } from './PeakMeter';
import { PhaseCorrelation } from './PhaseCorrelation';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';

export function MeterBridge() {
  return (
    <div className="flex items-center gap-6 p-3 studio-card-glass" style={{
      background: 'var(--studio-glass-bg)',
      borderRadius: '12px',
      border: '1px solid var(--studio-glass-border)',
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--studio-shadow-lg)'
    }}>
      {/* Precision VU Stack */}
      <VUMeter width={80} height={140} />
      
      {/* Analytics Stack */}
      <div className="flex flex-col justify-between h-[140px] gap-3">
        <div className="flex-1 rounded-lg overflow-hidden border border-white/5 bg-black/20">
          <SpectrumAnalyzer width={240} height={90} />
        </div>
        
        <div className="h-8 rounded-md overflow-hidden border border-white/5 bg-black/20 px-2 py-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[7px] font-mono text-studio-text-tertiary uppercase tracking-widest">Correlation</span>
          </div>
          <PhaseCorrelation width={220} height={8} />
        </div>
      </div>
    </div>
  );
}
