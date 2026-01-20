import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, RefreshCw, Trash2 } from 'lucide-react';
import { useComparison } from '../../contexts/ComparisonContext';

interface ReferenceTrackLoaderProps {
  engineReady: boolean;
  onReferenceSelect: (file: File) => void;
}

export function ReferenceTrackLoader({ engineReady, onReferenceSelect }: ReferenceTrackLoaderProps) {
  const { state, clearReference } = useComparison();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    onReferenceSelect(file);
  }, [onReferenceSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!engineReady) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [engineReady, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (engineReady) {
      setIsDragOver(true);
    }
  }, [engineReady]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const { reference } = state;

  return (
    <div className="studio-card" style={{ padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 className="studio-subheader" style={{ margin: 0, fontSize: '14px' }}>Reference Track</h3>
        {reference.file && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleFile(reference.file!)}
              className="studio-btn-icon" 
              title="Reload Reference"
              style={{ padding: '4px' }}
            >
              <RefreshCw size={14} />
            </button>
            <button 
              onClick={clearReference}
              className="studio-btn-icon" 
              title="Clear Reference"
              style={{ padding: '4px', color: 'var(--studio-error)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {!reference.file ? (
        <div
          className={`hp-dropzone hp-dropzone--compact ${isDragOver ? 'hp-dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => engineReady && fileInputRef.current?.click()}
          style={{ 
            height: '80px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px dashed var(--studio-divider)',
            borderRadius: '8px',
            cursor: engineReady ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}
        >
          <Upload size={20} style={{ color: 'var(--studio-text-tertiary)', marginBottom: '4px' }} />
          <span style={{ fontSize: '12px', color: 'var(--studio-text-secondary)' }}>
            Load Reference Track
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            disabled={!engineReady}
          />
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '10px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          border: '1px solid var(--studio-divider)'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '6px', 
            backgroundColor: 'rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <File size={16} style={{ color: 'var(--studio-text-tertiary)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 500, 
              color: 'var(--studio-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {reference.file.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--studio-text-tertiary)' }}>
              {reference.status === 'loading' ? 'Analyzing...' : 'Ghost Layer Active'}
            </div>
          </div>
          {reference.status === 'loading' && (
            <div className="hp-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
          )}
        </div>
      )}
    </div>
  );
}
