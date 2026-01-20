import { useMemo } from 'react';
import { useComparison } from '../../contexts/ComparisonContext';
import { MelodicDNA } from './MelodicDNA';
import { FloatingGlassLabels } from './FloatingGlassLabels';
import { BarChart2, Hash, Layers } from 'lucide-react';

export function ComparisonRack() {
  const { state } = useComparison();
  const { source, reference, isComparisonMode } = state;

  // Calculate Spectral Variance Heatmap Data
  const heatmapData = useMemo(() => {
    if (!source.analysisData?.spectral || !reference.analysisData?.spectral || !isComparisonMode) {
      return null;
    }

    const bands = ['Low', 'Mid', 'High'];
    const features = ['energy', 'centroid', 'brightness'];
    
    return bands.map(band => {
      const sVal = source.analysisData!.spectral![features[bands.indexOf(band)] as any] as any;
      const rVal = reference.analysisData!.spectral![features[bands.indexOf(band)] as any] as any;
      
      const sMean = sVal?.mean || 0;
      const rMean = rVal?.mean || 0;
      
      // Delta as percentage
      const delta = rMean !== 0 ? (sMean - rMean) / rMean : 0;
      return { band, delta };
    });
  }, [source.analysisData, reference.analysisData, isComparisonMode]);

  if (!isComparisonMode) return null;

  return (
    <div className="studio-card studio-fadeIn" style={{ 
      padding: '24px', 
      marginBottom: '32px',
      border: '1px solid rgba(14, 165, 233, 0.2)',
      background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.05) 0%, rgba(0,0,0,0) 100%)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ 
          padding: '8px', 
          borderRadius: '8px', 
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          color: '#0EA5E9'
        }}>
          <Layers size={20} />
        </div>
        <h2 className="studio-header" style={{ margin: 0 }}>Comparison Rack</h2>
        <div className="studio-badge studio-badge-success" style={{ marginLeft: 'auto' }}>
          ACTIVE A/B
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Left Column: DNA & Detailed Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <MelodicDNA />
          <FloatingGlassLabels />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Harmonic Delta */}
            <div className="studio-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'rgba(255,255,255,0.4)' }}>
                <Hash size={14} />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Harmonic Delta</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--studio-text-tertiary)' }}>Key Variance</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: source.analysisData?.key?.key === reference.analysisData?.key?.key ? '#10B981' : '#F59E0B' }}>
                    {source.analysisData?.key?.key === reference.analysisData?.key?.key ? 'MATCH' : 'MODULATED'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--studio-text-tertiary)' }}>BPM Delta</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    {Math.abs((source.analysisData?.tempo?.bpm || 0) - (reference.analysisData?.tempo?.bpm || 0)).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Badges */}
            <div className="studio-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--studio-text-secondary)' }}>Live Source</span>
                  <span className="studio-badge studio-badge-info">CYAN LAYER</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--studio-text-secondary)' }}>Ghost Ref</span>
                  <span className="studio-badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>DIMMED</span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Spectral Variance Heatmap */}
        <div className="studio-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'rgba(255,255,255,0.4)' }}>
            <BarChart2 size={14} />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Spectral Variance</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {heatmapData?.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--studio-text-tertiary)' }}>{item.band} Band</span>
                  <span style={{ color: item.delta > 0 ? '#0EA5E9' : '#E11D48' }}>
                    {item.delta > 0 ? '+' : ''}{(item.delta * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: `${Math.abs(item.delta * 50)}%`,
                    backgroundColor: item.delta > 0 ? '#0EA5E9' : '#E11D48',
                    transform: item.delta < 0 ? 'translateX(-100%)' : 'none',
                    transition: 'all 0.5s ease'
                  }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '11px', color: 'var(--studio-text-tertiary)', lineHeight: '1.4' }}>
            {heatmapData && Math.abs(heatmapData[2].delta) > 0.2 ? (
              <p>Significant high-end variance detected. Reference is {heatmapData[2].delta > 0 ? 'darker' : 'brighter'} than source.</p>
            ) : (
              <p>Spectral balance is relatively consistent between tracks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
