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
    const isMimeAllowed = allowedTypes.some(type => file.type === type || file.type.startsWith(`${type};`));
    const isExtensionAllowed = !!file.name.match(/\.(mp3|wav|flac|aiff|ogg|webm|mp4|aac)$/i);

    if (!isMimeAllowed && !isExtensionAllowed) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type || 'Unknown'}. Please use MP3, WAV, FLAC, AIFF, OGG, WebM, MP4, or AAC.`
      };
    }

    // Security check: Prevent MIME type spoofing (e.g. malware.mp3 with application/x-executable)
    // If extension matches but MIME type is present and NOT allowed, reject it.
    // We allow empty MIME types or application/octet-stream as they are often used for valid files.
    if (isExtensionAllowed && file.type && !isMimeAllowed && file.type !== 'application/octet-stream') {
      return {
        isValid: false,
        error: `Security Warning: File extension matches audio but type (${file.type}) is invalid.`
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

  return (
    <div className="hp-upload">
      <div
        className={[
          "hp-dropzone",
          !engineReady ? "hp-dropzone--disabled" : "",
          isProcessing ? "hp-dropzone--processing" : "",
          isDragOver ? "hp-dropzone--active" : "",
          selectedFile && validation?.isValid ? "hp-dropzone--success" : "",
          validation && !validation.isValid ? "hp-dropzone--error" : "",
        ].join(" ").trim()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => engineReady && !isProcessing && fileInputRef.current?.click()}
      >
        <div className="hp-upload-icon">
          {isProcessing ? (
            <div className="hp-spinner" />
          ) : (
            <Upload className="hp-upload-icon__svg" strokeWidth={1.6} />
          )}
        </div>

        <div className="hp-upload-text">
          <h3>{isProcessing ? "Analyzing Audio..." : "Drop your audio file"}</h3>
          <p>{!engineReady ? "Initializing engine..." : "or click to browse"}</p>
          <span>MP3, WAV, FLAC, AIFF • Max 100MB</span>
        </div>

        {engineReady && !isProcessing && (
          <div className="hp-upload-status">
            <CheckCircle className="hp-upload-status__icon" />
            <span>Engine Ready</span>
          </div>
        )}

        {validation && !validation.isValid && (
          <div className="hp-upload-warning">
            <AlertCircle className="hp-upload-status__icon" />
            <span>{validation.error}</span>
            <button type="button" onClick={clearFile} className="hp-upload-clear" aria-label="Clear file">
              <X className="hp-upload-clear__icon" />
            </button>
          </div>
        )}

        {validation?.warnings && validation.warnings.length > 0 && (
          <ul className="hp-upload-hints">
            {validation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        {selectedFile && validation?.isValid && (
          <div className="hp-upload-file">
            <File className="hp-upload-status__icon" />
            <div>
              <div className="hp-upload-file__name">{selectedFile.name}</div>
              <div className="hp-upload-file__meta">{formatFileSize(selectedFile.size)}</div>
            </div>
            <button type="button" onClick={clearFile} className="hp-upload-clear" aria-label="Clear file">
              <X className="hp-upload-clear__icon" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.aiff,.ogg,.webm,.mp4,.aac"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={!engineReady || isProcessing}
        />
      </div>
    </div>
  );
}
