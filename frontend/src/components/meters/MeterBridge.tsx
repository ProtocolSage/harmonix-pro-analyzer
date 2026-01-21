import { PeakMeter } from './PeakMeter';
import { PhaseCorrelation } from './PhaseCorrelation';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';

export function MeterBridge() {
  return (
    <div className="flex items-center gap-4 p-2 bg-slate-950/50 rounded-lg border border-slate-800 backdrop-blur-sm">
      <PeakMeter width={20} height={100} />
      <div className="flex flex-col justify-between h-[100px] gap-2">
        <SpectrumAnalyzer width={160} height={60} />
        <PhaseCorrelation width={160} height={12} />
      </div>
    </div>
  );
}
