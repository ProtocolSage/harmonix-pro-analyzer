import { Music } from 'lucide-react';

export function EmptyExportState() {
  return (
    <div className="hp-export-empty">
      <Music className="hp-export-empty__icon" />
      <h3>No Analysis Data</h3>
      <p>Upload and analyze an audio file to enable export functionality.</p>
    </div>
  );
}
