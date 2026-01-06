import React from 'react';

interface DAWTopBarProps {
  fileName?: string;
  fileSize?: number;
  engineStatus: 'initializing' | 'loading' | 'ready' | 'error';
  onSettingsClick?: () => void;
}

export const DAWTopBar: React.FC<DAWTopBarProps> = ({
  fileName,
  fileSize,
  engineStatus,
  onSettingsClick
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusColor = () => {
    switch (engineStatus) {
      case 'ready':
        return 'daw-badge-success';
      case 'loading':
      case 'initializing':
        return 'daw-badge-warning';
      case 'error':
        return 'daw-badge-error';
      default:
        return 'daw-badge-info';
    }
  };

  const getStatusText = () => {
    switch (engineStatus) {
      case 'ready':
        return 'Ready';
      case 'loading':
        return 'Loading';
      case 'initializing':
        return 'Initializing';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="daw-top-bar">
      {/* Logo Section */}
      <div className="daw-top-bar-section">
        <div className="daw-logo">
          <div className="daw-logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="url(#logo-gradient)" />
              <path
                d="M8 12L16 8L24 12V20L16 24L8 20V12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-daw-bg-deepest"
              />
              <path
                d="M16 8V16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-daw-bg-deepest"
              />
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="var(--daw-gold-bright)" />
                  <stop offset="100%" stopColor="var(--daw-gold-deep)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="daw-logo-text">
            <div className="daw-logo-title">Harmonix Pro</div>
            <div className="daw-logo-subtitle">Analyzer</div>
          </div>
        </div>
      </div>

      {/* File Info Section */}
      <div className="daw-top-bar-section daw-top-bar-center">
        {fileName ? (
          <div className="daw-file-info">
            <div className="daw-file-name">{fileName}</div>
            {fileSize && (
              <div className="daw-file-size">{formatFileSize(fileSize)}</div>
            )}
          </div>
        ) : (
          <div className="daw-file-info-empty">
            <span className="daw-text-muted">No file loaded</span>
          </div>
        )}
      </div>

      {/* Status & Controls Section */}
      <div className="daw-top-bar-section daw-top-bar-right">
        <div className={`daw-badge ${getStatusColor()}`}>
          <div className="daw-status-indicator"></div>
          {getStatusText()}
        </div>

        <button
          className="daw-btn-icon daw-btn-ghost"
          onClick={onSettingsClick}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.1667 12.5C16.0553 12.7513 16.0259 13.0302 16.0825 13.2984C16.1391 13.5666 16.2791 13.8114 16.4834 14C16.9167 14.4167 17.5 15 17.5 15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8334 17.5C15 17.5 14.4167 16.9167 14 16.4833C13.8115 16.279 13.5667 16.139 13.2985 16.0824C13.0302 16.0258 12.7513 16.0552 12.5 16.1667C12.2513 16.2781 11.9724 16.3075 11.7042 16.2509C11.436 16.1943 11.1912 16.0543 11 15.85V15.85C10.6489 15.4515 10.1592 15.2071 9.63337 15.1667C9.10752 15.1262 8.58634 15.2923 8.16671 15.6333L7.50004 16.1667C7.10861 16.4579 6.62287 16.6025 6.13337 16.575C5.87509 16.5612 5.62182 16.4957 5.38945 16.3824C5.15708 16.269 4.95015 16.11 4.78088 15.9145C4.61161 15.7189 4.48344 15.4908 4.40395 15.2437C4.32446 14.9967 4.29531 14.7359 4.31837 14.4767C4.38337 13.9667 4.62504 13.5 4.91671 13.1L5.45004 12.4333C5.79104 12.0137 5.95714 11.4925 5.91666 10.9667C5.87619 10.4408 5.63185 9.95111 5.23337 9.6V9.6C5.02909 9.40848 4.88907 9.16367 4.83248 8.89545C4.77588 8.62724 4.80527 8.34832 4.91671 8.1L5.23337 7.5C5.34481 7.24868 5.53392 7.03723 5.77337 6.9C6.01283 6.76277 6.28917 6.70083 6.56671 6.72333C7.07671 6.78833 7.54337 7.03 7.91671 7.32167H7.91671C8.33634 7.66267 8.85752 7.82877 9.38337 7.78829C9.90922 7.74782 10.3989 7.50348 10.75 7.105V7.105C10.9415 6.90073 11.1863 6.76071 11.4545 6.70411C11.7228 6.64752 12.0017 6.67691 12.25 6.78833L12.9167 7.105C13.168 7.21644 13.3795 7.40555 13.5167 7.645C13.6539 7.88446 13.7159 8.16079 13.6934 8.43833C13.6284 8.94833 13.87 9.415 14.1617 9.78833V9.78833C14.5037 10.2079 15.0249 10.374 15.5507 10.3335C16.0766 10.293 16.5663 10.0487 16.9167 9.65V9.65C17.3501 9.23333 17.9334 8.65 18.7667 8.65C19.2088 8.65 19.6327 8.82561 19.9453 9.13817C20.2578 9.45073 20.4334 9.87463 20.4334 10.3167C20.4334 11.15 19.8501 11.7333 19.4334 12.1667C19.2291 12.3581 19.0891 12.6029 19.0325 12.8711C18.9759 13.1393 19.0053 13.4182 19.1167 13.6667V13.6667C19.2281 13.918 19.4172 14.1295 19.6567 14.2667C19.8961 14.4039 20.1725 14.4659 20.45 14.4433C20.7275 14.4208 20.9913 14.3145 21.2034 14.1383"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <style>{`
        .daw-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          padding: 0 var(--space-6);
          background: var(--daw-bg-deep);
          border-bottom: var(--border-thin) solid var(--border-default);
          box-shadow: var(--shadow-md);
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
        }

        .daw-top-bar-section {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .daw-top-bar-center {
          flex: 1;
          justify-content: center;
        }

        .daw-top-bar-right {
          justify-content: flex-end;
        }

        /* Logo Styles */
        .daw-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .daw-logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .daw-logo-text {
          display: flex;
          flex-direction: column;
          line-height: var(--leading-tight);
        }

        .daw-logo-title {
          font-size: var(--text-base);
          font-weight: var(--weight-bold);
          color: var(--daw-metal-platinum);
          letter-spacing: var(--tracking-tight);
        }

        .daw-logo-subtitle {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-widest);
        }

        /* File Info Styles */
        .daw-file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-1);
        }

        .daw-file-name {
          font-size: var(--text-base);
          font-weight: var(--weight-semibold);
          color: var(--daw-metal-platinum);
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .daw-file-size {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        .daw-file-info-empty {
          font-size: var(--text-sm);
          color: var(--daw-metal-iron);
        }

        /* Status Indicator Animation */
        .daw-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: currentColor;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @media (max-width: 768px) {
          .daw-logo-text {
            display: none;
          }

          .daw-file-name {
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
};
