// components/SystemStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SystemStatusProps {
  lastPredictionTime?: string;
  className?: string;
}

type StatusType = 'online' | 'warning' | 'offline' | 'unknown';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  pulseColor?: string;
}

export default function SystemStatus({ lastPredictionTime, className = '' }: SystemStatusProps) {
  const [status, setStatus] = useState<StatusType>('unknown');
  const [minutesSinceLastPrediction, setMinutesSinceLastPrediction] = useState<number>(0);

  useEffect(() => {
    if (!lastPredictionTime) {
      setStatus('unknown');
      return;
    }

    const updateStatus = () => {
      try {
        const lastPredTime = new Date(lastPredictionTime);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastPredTime.getTime()) / (1000 * 60));
        
        setMinutesSinceLastPrediction(diffMinutes);

        // Determine status based on time since last prediction
        if (diffMinutes < 10) {
          setStatus('online');
        } else if (diffMinutes < 30) {
          setStatus('warning');
        } else {
          setStatus('offline');
        }
      } catch (error) {
        console.error('Error calculating status:', error);
        setStatus('unknown');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastPredictionTime]);

  const statusConfig: Record<StatusType, StatusConfig> = {
    online: {
      label: 'ONLINE',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50',
      pulseColor: 'bg-green-500',
      icon: <CheckCircle className="w-4 h-4" />
    },
    warning: {
      label: 'DELAYED',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/50',
      pulseColor: 'bg-yellow-500',
      icon: <Clock className="w-4 h-4" />
    },
    offline: {
      label: 'OFFLINE',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
      icon: <AlertCircle className="w-4 h-4" />
    },
    unknown: {
      label: 'CHECKING',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/50',
      icon: <Activity className="w-4 h-4 animate-pulse" />
    }
  };

  const config = statusConfig[status];

  const getStatusMessage = () => {
    if (status === 'unknown') {
      return 'Checking system status...';
    }
    if (status === 'online') {
      return `Active ${minutesSinceLastPrediction}m ago`;
    }
    if (status === 'warning') {
      return `Last seen ${minutesSinceLastPrediction}m ago`;
    }
    return `Inactive for ${minutesSinceLastPrediction}m`;
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Main Status Badge */}
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border
        ${config.bgColor} ${config.borderColor}
        transition-all duration-300
      `}>
        {/* Pulse Indicator (only for online status) */}
        {status === 'online' && config.pulseColor && (
          <div className="relative flex items-center justify-center">
            <span className={`
              absolute inline-flex h-3 w-3 rounded-full ${config.pulseColor} opacity-75
              animate-ping
            `} />
            <span className={`
              relative inline-flex h-2 w-2 rounded-full ${config.pulseColor}
            `} />
          </div>
        )}
        
        {/* Icon */}
        <span className={config.color}>
          {config.icon}
        </span>
        
        {/* Status Label */}
        <span className={`
          font-semibold text-sm tracking-wide
          ${config.color}
        `}>
          {config.label}
        </span>
      </div>

      {/* Status Message */}
      <div className="text-sm text-gray-400">
        {getStatusMessage()}
      </div>
    </div>
  );
}