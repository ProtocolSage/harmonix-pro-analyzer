import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, Music } from 'lucide-react';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number; // 0-100
  timeElapsed?: number; // seconds
  timeRemaining?: number; // seconds
}

interface ProgressStepperProps {
  steps: ProgressStep[];
  currentStep?: string;
  orientation?: 'horizontal' | 'vertical';
  showProgress?: boolean;
  showTimers?: boolean;
}

export function ProgressStepper({ 
  steps, 
  currentStep, 
  orientation = 'vertical',
  showProgress = true,
  showTimers = false
}: ProgressStepperProps) {
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-white/30" />;
    }
  };

  const getStepColors = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-400 border-green-400/50';
      case 'error':
        return 'text-red-400 border-red-400/50';
      case 'active':
        return 'text-blue-400 border-blue-400/50';
      default:
        return 'text-white/60 border-white/30';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (orientation === 'horizontal') {
    return (
      <div className="glassmorphic-card p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`flex flex-col items-center text-center ${getStepColors(step)}`}>
                <div className="mb-2">
                  {getStepIcon(step)}
                </div>
                <div className="text-sm font-medium">{step.label}</div>
                {step.description && (
                  <div className="text-xs text-white/60 mt-1">{step.description}</div>
                )}
                {showProgress && step.progress !== undefined && step.status === 'active' && (
                  <div className="mt-2 text-xs text-blue-400">
                    {Math.round(step.progress)}%
                  </div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-white/20 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glassmorphic-card p-6">
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              {getStepIcon(step)}
              {index < steps.length - 1 && (
                <div className="w-px h-8 bg-white/20 mt-2" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${getStepColors(step)}`}>
                {step.label}
              </div>
              {step.description && (
                <div className="text-white/60 text-sm mt-1">
                  {step.description}
                </div>
              )}
              
              {/* Progress bar for active step */}
              {showProgress && step.progress !== undefined && step.status === 'active' && (
                <div className="mt-2">
                  <div className="flex justify-between items-center text-xs text-white/60 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(step.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-400 transition-all duration-300 ease-out"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Timer information */}
              {showTimers && (step.timeElapsed || step.timeRemaining) && (
                <div className="mt-2 flex items-center space-x-4 text-xs text-white/60">
                  {step.timeElapsed && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Elapsed: {formatTime(step.timeElapsed)}</span>
                    </div>
                  )}
                  {step.timeRemaining && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Remaining: {formatTime(step.timeRemaining)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  color = '#3B82F6',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  children
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {Math.round(progress)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LinearProgressProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
  indeterminate?: boolean;
}

export function LinearProgress({
  progress,
  height = 8,
  color = '#3B82F6',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showPercentage = false,
  animated = false,
  indeterminate = false
}: LinearProgressProps) {
  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between items-center text-sm text-white/70 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      
      <div 
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor }}
      >
        {indeterminate ? (
          <div 
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              animation: 'indeterminate-progress 2s ease-in-out infinite',
              width: '30%'
            }}
          />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              animated ? 'animate-pulse' : ''
            }`}
            style={{
              width: `${progress}%`,
              backgroundColor: color
            }}
          />
        )}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  text?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ 
  status, 
  text, 
  showIcon = true, 
  size = 'md' 
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          text: 'text-blue-400',
          icon: <Loader2 className="animate-spin" />,
          defaultText: 'Loading...'
        };
      case 'success':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          text: 'text-green-400',
          icon: <CheckCircle />,
          defaultText: 'Success'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          text: 'text-red-400',
          icon: <AlertCircle />,
          defaultText: 'Error'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          text: 'text-yellow-400',
          icon: <AlertCircle />,
          defaultText: 'Warning'
        };
      default:
        return {
          bg: 'bg-gray-500/10 border-gray-500/30',
          text: 'text-gray-400',
          icon: <Music />,
          defaultText: 'Idle'
        };
    }
  };

  const config = getStatusConfig();
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`
      inline-flex items-center space-x-2 border rounded-full font-medium
      ${config.bg} ${config.text} ${sizeClasses[size]}
    `}>
      {showIcon && (
        <div className={iconSizes[size]}>
          {config.icon}
        </div>
      )}
      <span>{text || config.defaultText}</span>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'text-blue-400',
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Loader2 className={`${sizeClasses[size]} ${color} animate-spin`} />
      {text && (
        <div className="text-white/60 text-sm">{text}</div>
      )}
    </div>
  );
}