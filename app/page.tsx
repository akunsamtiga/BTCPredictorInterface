'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  BarChart3,
  Brain,
  Target,
  AlertCircle,
  Cpu,
  HardDrive,
  Zap,
  Server,
  TrendingUpDown,
  Gauge,
  Calendar,
  Timer
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Prediction {
  id: string;
  timestamp: string;
  prediction_time: string;
  timeframe_minutes: number;
  current_price: number;
  predicted_price: number;
  price_change: number;
  price_change_pct: number;
  price_range_low: number;
  price_range_high: number;
  trend: string;
  confidence: number;
  method: string;
  target_time: string;
  validated: boolean;
  validation_result?: 'WIN' | 'LOSE' | null;
  validation_time?: string;
  actual_price?: number;
  price_error?: number;
  price_error_pct?: number;
  direction_correct?: boolean;
  model_agreement?: number;
  lstm_prediction?: number;
  gb_prediction?: number;
  rf_direction?: string;
  rf_confidence?: number;
}

interface Statistics {
  timeframe_minutes?: number;
  period_days: number;
  total_predictions: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_error: number;
  avg_error_pct: number;
  last_updated: string;
}

interface TimeframeCategoryStats {
  category: 'ultra_short' | 'short' | 'medium' | 'long';
  timeframes: number[];
  total_predictions: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_error: number;
  avg_error_pct: number;
}

interface ModelPerformance {
  id: string;
  timestamp: string;
  metrics: {
    lstm?: { mae: number; rmse: number };
    rf?: { accuracy: number };
    gb?: { mae: number; rmse: number };
  };
}

interface SystemStatus {
  status: 'online' | 'offline' | 'starting' | 'running' | 'stopping' | 'error';
  timestamp: string;
  uptime_hours?: number;
  uptime_seconds?: number;
  memory_mb?: number;
  cpu_percent?: number;
  message?: string;
  heartbeat_count?: number;
  last_heartbeat?: string;
  last_activity?: string;
  predictions_count?: number;
  total_predictions?: number;
  successful_predictions?: number;
  failed_predictions?: number;
  health_status?: string;
  process_id?: number;
  active_timeframes?: number;
}

interface DashboardData {
  currentPrice: number;
  overallStats: Statistics | null;
  timeframeStats: Statistics[];
  categoryStats?: TimeframeCategoryStats[];
  recentPredictions: Prediction[];
  pendingPredictions: Prediction[];
  modelPerformance: ModelPerformance | null;
  systemStatus: SystemStatus;
  lastUpdate: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMEFRAME_LABELS: Record<number, string> = {
  1: '1m', 2: '2m', 3: '3m', 5: '5m', 10: '10m', 15: '15m', 20: '20m',
  30: '30m', 45: '45m', 60: '1h', 120: '2h', 180: '3h', 240: '4h',
  360: '6h', 480: '8h', 720: '12h', 1440: '1d', 2880: '2d', 
  4320: '3d', 5760: '4d', 7200: '5d', 10080: '7d'
};

const CATEGORY_CONFIG = {
  ultra_short: {
    name: 'Ultra Short (Scalping)',
    icon: '⚡',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  short: {
    name: 'Short Term (Day Trading)',
    icon: '📊',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  medium: {
    name: 'Medium Term (Swing Trading)',
    icon: '📈',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  long: {
    name: 'Long Term (Position Trading)',
    icon: '🎯',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) return '$0.00';
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getTimeframeLabel = (minutes: number): string => {
  return TIMEFRAME_LABELS[minutes] || `${minutes}min`;
};

const getWinRateColor = (winRate: number): string => {
  if (winRate >= 70) return 'text-green-400';
  if (winRate >= 60) return 'text-blue-400';
  if (winRate >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

const getWinRateBarColor = (winRate: number): string => {
  if (winRate >= 70) return 'from-green-500 to-emerald-500';
  if (winRate >= 60) return 'from-blue-500 to-cyan-500';
  if (winRate >= 50) return 'from-yellow-500 to-orange-500';
  return 'from-red-500 to-rose-500';
};

// ============================================================================
// SYSTEM STATUS COMPONENT
// ============================================================================

function SystemStatusCard({ systemStatus }: { systemStatus?: SystemStatus }) {
  const [minutesSince, setMinutesSince] = useState(0);
  const [status, setStatus] = useState<'online' | 'warning' | 'offline' | 'unknown'>('unknown');

  useEffect(() => {
    if (!systemStatus?.timestamp) {
      setStatus('unknown');
      return;
    }

    const updateStatus = () => {
      try {
        const lastTime = new Date(systemStatus.timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / 60000);
        setMinutesSince(diffMinutes);

        if (systemStatus.status === 'offline' || systemStatus.status === 'error') {
          setStatus('offline');
        } else if (diffMinutes < 2) {
          setStatus('online');
        } else if (diffMinutes < 10) {
          setStatus('warning');
        } else {
          setStatus('offline');
        }
      } catch {
        setStatus('unknown');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, [systemStatus]);

  const statusConfig = {
    online: {
      label: 'ONLINE', color: 'text-green-400', bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50', pulseColor: 'bg-green-500',
      icon: <CheckCircle className="w-4 h-4" />
    },
    warning: {
      label: 'DELAYED', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/50', pulseColor: 'bg-yellow-500',
      icon: <Clock className="w-4 h-4" />
    },
    offline: {
      label: 'OFFLINE', color: 'text-red-400', bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50', icon: <AlertCircle className="w-4 h-4" />
    },
    unknown: {
      label: 'CHECKING', color: 'text-gray-400', bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/50', icon: <Activity className="w-4 h-4 animate-pulse" />
    }
  }[status];

  const getMessage = () => {
    if (status === 'unknown') return 'Checking system status...';
    if (status === 'online') return minutesSince === 0 ? 'Active now' : `Active ${minutesSince}m ago`;
    if (status === 'warning') return `Last seen ${minutesSince}m ago`;
    return `Inactive for ${minutesSince}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor} transition-all duration-300`}>
          {status === 'online' && statusConfig.pulseColor && (
            <div className="relative flex items-center justify-center">
              <span className={`absolute inline-flex h-3 w-3 rounded-full ${statusConfig.pulseColor} opacity-75 animate-ping`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${statusConfig.pulseColor}`} />
            </div>
          )}
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <span className={`font-semibold text-sm tracking-wide ${statusConfig.color}`}>{statusConfig.label}</span>
        </div>
        <div className="text-sm text-gray-400">{getMessage()}</div>
      </div>

      {status === 'online' && systemStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {systemStatus.uptime_hours !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Uptime</span>
              </div>
              <div className="text-white font-semibold">{systemStatus.uptime_hours.toFixed(1)}h</div>
            </div>
          )}
          {systemStatus.memory_mb !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Memory</span>
              </div>
              <div className="text-white font-semibold">{systemStatus.memory_mb.toFixed(0)} MB</div>
            </div>
          )}
          {systemStatus.cpu_percent !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Cpu className="w-3.5 h-3.5" />
                <span>CPU</span>
              </div>
              <div className="text-white font-semibold">{systemStatus.cpu_percent.toFixed(1)}%</div>
            </div>
          )}
          {systemStatus.total_predictions !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Target className="w-3.5 h-3.5" />
                <span>Predictions</span>
              </div>
              <div className="text-white font-semibold">{systemStatus.total_predictions}</div>
            </div>
          )}
        </div>
      )}

      {status === 'online' && systemStatus && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          {systemStatus.health_status && (
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Health: {systemStatus.health_status}</span>
            </div>
          )}
          {systemStatus.heartbeat_count !== undefined && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Heartbeats: {systemStatus.heartbeat_count}</span>
            </div>
          )}
          {systemStatus.successful_predictions !== undefined && systemStatus.failed_predictions !== undefined && (
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Success: {systemStatus.successful_predictions} / Fail: {systemStatus.failed_predictions}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CATEGORY STATS COMPONENT
// ============================================================================

function CategoryStatsGrid({ categoryStats }: { categoryStats?: TimeframeCategoryStats[] }) {
  if (!categoryStats || categoryStats.length === 0) return null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUpDown className="w-5 h-5 text-blue-500" />
        Performance by Category
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryStats.map((cat) => {
          const config = CATEGORY_CONFIG[cat.category];
          return (
            <div
              key={cat.category}
              className={`${config.bgColor} rounded-lg p-4 border ${config.borderColor} hover:border-opacity-50 transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{config.icon}</span>
                  <span className={`text-sm font-medium ${config.color}`}>
                    {cat.category.toUpperCase()}
                  </span>
                </div>
                {cat.total_predictions > 0 && (
                  <div className={`text-lg font-bold ${getWinRateColor(cat.win_rate)}`}>
                    {cat.win_rate.toFixed(1)}%
                  </div>
                )}
              </div>

              {cat.total_predictions > 0 ? (
                <>
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex justify-between text-gray-400">
                      <span>Total:</span>
                      <span className="text-white font-medium">{cat.total_predictions}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Wins:</span>
                      <span className="text-green-400 font-medium">{cat.wins}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Losses:</span>
                      <span className="text-red-400 font-medium">{cat.losses}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Avg Error:</span>
                      <span className="text-blue-400 font-medium">{cat.avg_error_pct.toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getWinRateBarColor(cat.win_rate)}`}
                      style={{ width: `${cat.win_rate}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-sm text-center py-2">No predictions yet</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/predictions', { cache: 'no-store' });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      setData(result);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  const getTrendIcon = (trend: string) => {
    return trend.includes('CALL') || trend.includes('Bullish')
      ? <TrendingUp className="w-5 h-5 text-green-400" />
      : <TrendingDown className="w-5 h-5 text-red-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Failed to load data</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with System Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-8 h-8 text-blue-500" />
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Bitcoin Predictor Dashboard
                </h1>
              </div>
              <p className="text-gray-400 mb-4">Multi-timeframe ML-powered predictions</p>
              <SystemStatusCard systemStatus={data.systemStatus} />
            </div>
            
            <div className="text-right">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                {formatPrice(data.currentPrice)}
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-2 justify-end">
                <Activity className="w-4 h-4" />
                Current BTC Price
              </div>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        {data.overallStats && data.overallStats.total_predictions > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Overall Performance (Last 7 Days)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total</div>
                <div className="text-2xl font-bold text-white">{data.overallStats.total_predictions}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Wins</div>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {data.overallStats.wins}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Losses</div>
                <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  {data.overallStats.losses}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Win Rate</div>
                <div className={`text-2xl font-bold ${getWinRateColor(data.overallStats.win_rate)}`}>
                  {data.overallStats.win_rate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Avg Error</div>
                <div className="text-2xl font-bold text-blue-400">{data.overallStats.avg_error_pct.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Category Statistics */}
        <CategoryStatsGrid categoryStats={data.categoryStats} />

        {/* Timeframe Performance */}
        {data.timeframeStats && data.timeframeStats.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Performance by Timeframe
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.timeframeStats.map((stat) => (
                <div
                  key={stat.timeframe_minutes}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold text-white">
                      {getTimeframeLabel(stat.timeframe_minutes!)}
                    </div>
                    {stat.total_predictions > 0 && (
                      <div className={`text-lg font-bold ${getWinRateColor(stat.win_rate)}`}>
                        {stat.win_rate.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  
                  {stat.total_predictions > 0 ? (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total:</span>
                          <span className="text-white font-medium">{stat.total_predictions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Wins:</span>
                          <span className="text-green-400 font-medium">{stat.wins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Losses:</span>
                          <span className="text-red-400 font-medium">{stat.losses}</span>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getWinRateBarColor(stat.win_rate)}`}
                          style={{ width: `${stat.win_rate}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500 text-sm">No predictions yet</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Predictions */}
        {data.recentPredictions && data.recentPredictions.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Recent Predictions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">TF</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Predicted</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Trend</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Conf</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPredictions.slice(0, 10).map((pred) => (
                    <tr
                      key={pred.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {formatDate(pred.prediction_time)}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-medium">
                        {getTimeframeLabel(pred.timeframe_minutes)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-white font-mono">
                        {formatPrice(pred.predicted_price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getTrendIcon(pred.trend)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-gray-300">{pred.confidence.toFixed(0)}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pred.validated ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                            Validated
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pred.validated && pred.validation_result ? (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              pred.validation_result === 'WIN' ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {pred.validation_result === 'WIN' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {pred.validation_result}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Validations */}
        {data.pendingPredictions && data.pendingPredictions.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5 text-yellow-500" />
              Pending Validations ({data.pendingPredictions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.pendingPredictions.slice(0, 6).map((pred) => (
                <div
                  key={pred.id}
                  className="bg-gray-900/50 rounded-lg p-4 border border-yellow-500/30 hover:border-yellow-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-yellow-400">
                      {getTimeframeLabel(pred.timeframe_minutes)}
                    </span>
                    {getTrendIcon(pred.trend)}
                  </div>
                  <div className="text-lg font-bold text-white mb-1">
                    {formatPrice(pred.predicted_price)}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Target: {formatDate(pred.target_time)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Confidence: {pred.confidence.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Performance */}
        {data.modelPerformance && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              Model Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.modelPerformance.metrics.lstm && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    LSTM
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">MAE:</span>
                      <span className="text-white font-medium">
                        ${data.modelPerformance.metrics.lstm.mae.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">RMSE:</span>
                      <span className="text-white font-medium">
                        ${data.modelPerformance.metrics.lstm.rmse.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {data.modelPerformance.metrics.rf && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Random Forest
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accuracy:</span>
                      <span className="text-white font-medium">
                        {(data.modelPerformance.metrics.rf.accuracy * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {data.modelPerformance.metrics.gb && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Gradient Boosting
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">MAE:</span>
                      <span className="text-white font-medium">
                        ${data.modelPerformance.metrics.gb.mae.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">RMSE:</span>
                      <span className="text-white font-medium">
                        ${data.modelPerformance.metrics.gb.rmse.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Last training: {formatDate(data.modelPerformance.timestamp)}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {(!data.overallStats || data.overallStats.total_predictions === 0) && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Validated Predictions Yet</h3>
              <p className="text-gray-400">
                Predictions are being generated. Check back soon for performance statistics.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchData();
                }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Now
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                  autoRefresh
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <Activity className="w-4 h-4" />
                Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last updated: {formatDate(lastRefresh.toISOString())}
            </div>
          </div>
        </div>

        {/* System Info Footer */}
        <div className="text-center text-xs text-gray-600 py-4 space-y-1">
          <div>Bitcoin Predictor Dashboard v2.0</div>
          <div>Multi-Timeframe ML Predictions | WIB Timezone (UTC+7)</div>
          <div>Auto-refresh every 30 seconds when enabled</div>
        </div>
      </div>
    </div>
  );
}