import { useMemo, useState, useEffect } from 'react';
import { useComparison } from '../../contexts/ComparisonContext';
import { usePlayback } from '../../contexts/PlaybackContext';

export function FloatingGlassLabels() {
  const { state: compState } = useComparison();
  const { state: playbackState } = usePlayback();
  const { currentTime } = playbackState;

  // Find current chords
  const sourceChord = useMemo(() => {
    const chords = compState.source.analysisData?.harmonic?.chords;
    if (!chords) return null;
    return chords.find(c => currentTime >= c.start && currentTime <= c.end)?.chord || null;
  }, [compState.source.analysisData, currentTime]);

  const refChord = useMemo(() => {
    const chords = compState.reference.analysisData?.harmonic?.chords;
    if (!chords) return null;
    return chords.find(c => currentTime >= c.start && currentTime <= c.end)?.chord || null;
  }, [compState.reference.analysisData, currentTime]);

  // State for animated display
  const [displaySource, setDisplaySource] = useState(sourceChord);
  const [displayRef, setDisplayRef] = useState(refChord);
  const [sourceFade, setSourceFade] = useState(1);
  const [refFade, setRefFade] = useState(1);

  // Transition Source
  useEffect(() => {
    if (sourceChord !== displaySource) {
      setSourceFade(0);
      const timer = setTimeout(() => {
        setDisplaySource(sourceChord);
        setSourceFade(1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sourceChord, displaySource]);

  // Transition Reference
  useEffect(() => {
    if (refChord !== displayRef) {
      setRefFade(0);
      const timer = setTimeout(() => {
        setDisplayRef(refChord);
        setRefFade(1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [refChord, displayRef]);

  if (!compState.isComparisonMode) return null;

  return (
    <div className="floating-chords" style={{
      display: 'flex',
      gap: '16px',
      marginTop: '16px'
    }}>
      {/* Source Label */}
      <div style={{
        flex: 1,
        background: 'rgba(14, 165, 233, 0.1)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(14, 165, 233, 0.2)',
        borderRadius: '12px',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: sourceChord ? 1 : 0.5,
        transition: 'all 0.3s ease'
      }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#0EA5E9' }}>Source Chord</span>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          fontFamily: 'var(--font-mono)',
          color: 'white',
          opacity: sourceFade,
          transition: 'opacity 0.15s ease'
        }}>
          {displaySource || '--'}
        </span>
      </div>

      {/* Reference Label */}
      <div style={{
        flex: 1,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: refChord ? 1 : 0.5,
        transition: 'all 0.3s ease'
      }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>Reference Chord</span>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.8)',
          opacity: refFade,
          transition: 'opacity 0.15s ease'
        }}>
          {displayRef || '--'}
        </span>
      </div>
    </div>
  );
}
