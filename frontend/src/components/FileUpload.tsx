import { useState, useCallback, useRef } from 'react';
import { Upload, File, AlertCircle, CheckCircle, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  engineReady: boolean;
}

interface FileValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export function FileUpload({ onFileSelect, isProcessing, engineReady }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): FileValidation => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
      'audio/flac', 'audio/x-flac', 'audio/aiff', 'audio/x-aiff',
      'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac'
    ];

    const warnings: string[] = [];

    // Check file type
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|flac|aiff|ogg|webm|mp4|aac)$/i)) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type || 'Unknown'}. Please use MP3, WAV, FLAC, AIFF, OGG, WebM, MP4, or AAC.`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 100MB.`
      };
    }

    // Add warnings for various conditions
    if (file.size > 50 * 1024 * 1024) {
      warnings.push('Large file detected. Analysis may take longer.');
    }

    if (file.name.includes(' ')) {
      warnings.push('Filename contains spaces. Consider using underscores.');
    }

    if (file.type.includes('compressed') || file.name.toLowerCase().includes('mp3')) {
      warnings.push('Compressed audio detected. Lossless formats (WAV, FLAC) provide better analysis accuracy.');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    const validation = validateFile(file);
    setValidation(validation);
    setSelectedFile(file);

    if (validation.isValid) {
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!engineReady || isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [engineReady, isProcessing, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (engineReady && !isProcessing) {
      setIsDragOver(true);
    }
  }, [engineReady, isProcessing]);

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

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setValidation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusMessage = () => {
    if (!engineReady) return "Waiting for analysis engine...";
    if (isProcessing) return "Analysis in progress...";
    if (selectedFile && validation?.isValid) return "File ready for analysis";
    if (validation && !validation.isValid) return "File validation failed";
    return "Drop audio files or click to browse";
  };

  const getDropzoneClasses = () => {
    let classes = "daw-dropzone";

    if (!engineReady) classes += " daw-dropzone-disabled";
    else if (isProcessing) classes += " daw-dropzone-processing";
    else if (isDragOver) classes += " daw-dropzone-active";
    else if (selectedFile && validation?.isValid) classes += " daw-dropzone-success";
    else if (validation && !validation.isValid) classes += " daw-dropzone-error";

    return classes;
  };

  return (
    <div className="daw-file-upload-container">
      {/* Main Dropzone */}
      <div
        className={getDropzoneClasses()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => engineReady && !isProcessing && fileInputRef.current?.click()}
      >
        <div className="daw-dropzone-content">
          {/* Icon */}
          <div className="daw-dropzone-icon">
            {isProcessing ? (
              <div className="daw-spinner"></div>
            ) : selectedFile && validation?.isValid ? (
              <CheckCircle className="daw-icon-success" />
            ) : validation && !validation.isValid ? (
              <AlertCircle className="daw-icon-error" />
            ) : (
              <Upload className="daw-icon-upload" />
            )}
          </div>

          {/* Status Text */}
          <h3 className="daw-dropzone-title">{getStatusMessage()}</h3>

          <p className="daw-dropzone-subtitle">
            {!engineReady ? (
              "Engine initialization required"
            ) : isProcessing ? (
              "Please wait for current analysis to complete"
            ) : (
              "Supports MP3, WAV, FLAC, AIFF, OGG, WebM, MP4, AAC up to 100MB"
            )}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.aiff,.ogg,.webm,.mp4,.aac"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={!engineReady || isProcessing}
        />
      </div>

      {/* File Details Card */}
      {selectedFile && (
        <div className="daw-panel">
          <div className="daw-file-details">
            <div className="daw-file-info">
              <File className="daw-file-icon" />
              <div className="daw-file-text">
                <p className="daw-file-name">{selectedFile.name}</p>
                <p className="daw-file-meta">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                </p>
              </div>
            </div>
            <button
              className="daw-btn-icon daw-btn-ghost"
              onClick={clearFile}
              disabled={isProcessing}
              title="Clear file"
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Validation Messages */}
          {validation && (
            <div className="daw-validation-messages">
              {!validation.isValid && validation.error && (
                <div className="daw-alert daw-alert-error">
                  <AlertCircle className="daw-alert-icon" />
                  <span>{validation.error}</span>
                </div>
              )}

              {validation.warnings && validation.warnings.map((warning, idx) => (
                <div key={idx} className="daw-alert daw-alert-warning">
                  <AlertCircle className="daw-alert-icon" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Statistics */}
      <div className="daw-panel">
        <div className="daw-upload-stats">
          <div className="daw-upload-stat">
            <div className="daw-upload-stat-label">Max Size</div>
            <div className="daw-upload-stat-value">100MB</div>
          </div>
          <div className="daw-upload-stat">
            <div className="daw-upload-stat-label">Formats</div>
            <div className="daw-upload-stat-value">8 Types</div>
          </div>
          <div className="daw-upload-stat">
            <div className="daw-upload-stat-label">Quality</div>
            <div className="daw-upload-stat-value">Any SR</div>
          </div>
        </div>
      </div>

      <style>{`
        .daw-file-upload-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        /* Dropzone Styles */
        .daw-dropzone {
          border: var(--border-thick) dashed var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-12);
          transition: all var(--duration-normal) var(--ease-out);
          cursor: pointer;
          background: var(--daw-bg-raised);
          position: relative;
          overflow: hidden;
        }

        .daw-dropzone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent, rgba(255, 215, 0, 0.03));
          opacity: 0;
          transition: opacity var(--duration-normal) var(--ease-out);
        }

        .daw-dropzone:hover::before {
          opacity: 1;
        }

        .daw-dropzone-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .daw-dropzone-processing {
          cursor: not-allowed;
          border-color: var(--daw-spectrum-blue);
          box-shadow: 0 0 24px rgba(33, 150, 243, 0.3);
        }

        .daw-dropzone-active {
          transform: scale(1.02);
          border-color: var(--daw-gold-bright);
          background: var(--daw-bg-elevated);
          box-shadow: var(--shadow-glow-gold);
        }

        .daw-dropzone-success {
          border-color: var(--daw-success-bright);
          background: linear-gradient(135deg, var(--daw-bg-raised), rgba(16, 185, 129, 0.05));
        }

        .daw-dropzone-error {
          border-color: var(--daw-error-bright);
          background: linear-gradient(135deg, var(--daw-bg-raised), rgba(239, 68, 68, 0.05));
        }

        .daw-dropzone-content {
          text-align: center;
        }

        /* Icon Styles */
        .daw-dropzone-icon {
          margin-bottom: var(--space-6);
          display: flex;
          justify-content: center;
        }

        .daw-spinner {
          width: 64px;
          height: 64px;
          border: 4px solid var(--daw-bg-elevated);
          border-top: 4px solid var(--daw-spectrum-blue);
          border-radius: var(--radius-full);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .daw-icon-success {
          width: 64px;
          height: 64px;
          color: var(--daw-success-bright);
          filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.5));
        }

        .daw-icon-error {
          width: 64px;
          height: 64px;
          color: var(--daw-error-bright);
        }

        .daw-icon-upload {
          width: 64px;
          height: 64px;
          color: var(--daw-gold-bright);
          opacity: 0.7;
          transition: all var(--duration-normal) var(--ease-out);
        }

        .daw-dropzone:hover .daw-icon-upload {
          opacity: 1;
          transform: translateY(-4px);
        }

        /* Text Styles */
        .daw-dropzone-title {
          font-size: var(--text-xl);
          font-weight: var(--weight-semibold);
          color: var(--daw-metal-platinum);
          margin-bottom: var(--space-2);
        }

        .daw-dropzone-subtitle {
          font-size: var(--text-sm);
          color: var(--daw-metal-steel);
          margin-top: var(--space-2);
        }

        /* File Details */
        .daw-file-details {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
        }

        .daw-file-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex: 1;
          min-width: 0;
        }

        .daw-file-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: var(--daw-spectrum-blue);
        }

        .daw-file-text {
          min-width: 0;
          flex: 1;
        }

        .daw-file-name {
          font-weight: var(--weight-medium);
          color: var(--daw-metal-platinum);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin: 0;
        }

        .daw-file-meta {
          font-size: var(--text-sm);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
          margin: var(--space-1) 0 0 0;
        }

        /* Validation Messages */
        .daw-validation-messages {
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .daw-alert {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-sm);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: var(--border-thin) solid;
        }

        .daw-alert-error {
          color: var(--daw-error-bright);
          background: rgba(239, 68, 68, 0.1);
          border-color: var(--daw-error-muted);
        }

        .daw-alert-warning {
          color: var(--daw-warning-bright);
          background: rgba(251, 191, 36, 0.1);
          border-color: var(--daw-warning-muted);
        }

        .daw-alert-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        /* Upload Statistics */
        .daw-upload-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-6);
        }

        .daw-upload-stat {
          text-align: center;
        }

        .daw-upload-stat-label {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          margin-bottom: var(--space-2);
        }

        .daw-upload-stat-value {
          font-size: var(--text-xl);
          font-weight: var(--weight-bold);
          font-family: var(--font-mono);
          color: var(--daw-gold-bright);
        }

        @media (max-width: 768px) {
          .daw-dropzone {
            padding: var(--space-8);
          }

          .daw-dropzone-icon {
            margin-bottom: var(--space-4);
          }

          .daw-icon-success,
          .daw-icon-error,
          .daw-icon-upload,
          .daw-spinner {
            width: 48px;
            height: 48px;
          }

          .daw-dropzone-title {
            font-size: var(--text-base);
          }

          .daw-dropzone-subtitle {
            font-size: var(--text-xs);
          }

          .daw-upload-stats {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }
        }
      `}</style>
    </div>
  );
}
