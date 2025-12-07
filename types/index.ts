// types/index.ts - Enhanced Type Definitions

export interface Prediction {
  id: string;
  timestamp: string; // WIB ISO format
  prediction_time: string; // WIB ISO format
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
  target_time: string; // WIB ISO format
  validated: boolean;
  validation_result?: 'WIN' | 'LOSE' | null;
  validation_time?: string; // WIB ISO format
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

export interface Statistics {
  timeframe_minutes?: number;
  period_days: number;
  total_predictions: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_error: number;
  avg_error_pct: number;
  last_updated: string; // WIB ISO format
}

export interface ModelPerformance {
  id: string;
  timestamp: string; // WIB ISO format
  metrics: {
    lstm?: {
      mae: number;
      rmse: number;
    };
    rf?: {
      accuracy: number;
    };
    gb?: {
      mae: number;
      rmse: number;
    };
  };
}

export interface SystemStatus {
  status: 'online' | 'offline' | 'starting' | 'running' | 'stopping' | 'error';
  timestamp: string; // WIB ISO format
  uptime_hours?: number;
  uptime_seconds?: number;
  memory_mb?: number;
  cpu_percent?: number;
  message?: string;
  heartbeat_count?: number;
  last_heartbeat?: string; // WIB ISO format
  last_activity?: string;
  predictions_count?: number;
  total_predictions?: number;
  successful_predictions?: number;
  failed_predictions?: number;
  health_status?: string;
  process_id?: number;
  active_timeframes?: number;
}

export interface TimeframeCategoryStats {
  category: 'ultra_short' | 'short' | 'medium' | 'long';
  timeframes: number[];
  total_predictions: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_error: number;
  avg_error_pct: number;
}

export interface DashboardData {
  currentPrice: number;
  overallStats: Statistics | null;
  timeframeStats: Statistics[];
  categoryStats?: TimeframeCategoryStats[];
  recentPredictions: Prediction[];
  pendingPredictions: Prediction[];
  modelPerformance: ModelPerformance | null;
  systemStatus: SystemStatus;
  lastUpdate: string; // WIB ISO format
}

// Utility types
export type TimeframeCategory = 'ultra_short' | 'short' | 'medium' | 'long';

export interface TimeframeConfig {
  minutes: number;
  label: string;
  category: TimeframeCategory;
}

// Timeframe mappings
export const TIMEFRAME_CATEGORIES: Record<TimeframeCategory, number[]> = {
  ultra_short: [1, 2, 3, 5],
  short: [10, 15, 20, 30, 45, 60],
  medium: [120, 180, 240, 360, 480, 720],
  long: [1440, 2880, 4320, 5760, 7200, 10080]
};

export const TIMEFRAME_LABELS: Record<number, string> = {
  1: '1min',
  2: '2min',
  3: '3min',
  5: '5min',
  10: '10min',
  15: '15min',
  20: '20min',
  30: '30min',
  45: '45min',
  60: '1h',
  120: '2h',
  180: '3h',
  240: '4h',
  360: '6h',
  480: '8h',
  720: '12h',
  1440: '24h',
  2880: '2d',
  4320: '3d',
  5760: '4d',
  7200: '5d',
  10080: '7d'
};

export const CATEGORY_LABELS: Record<TimeframeCategory, string> = {
  ultra_short: 'Ultra Short (Scalping)',
  short: 'Short Term (Day Trading)',
  medium: 'Medium Term (Swing Trading)',
  long: 'Long Term (Position Trading)'
};

export const CATEGORY_ICONS: Record<TimeframeCategory, string> = {
  ultra_short: '⚡',
  short: '📊',
  medium: '📈',
  long: '🎯'
};

// Helper functions
export function getTimeframeCategory(minutes: number): TimeframeCategory {
  if (minutes <= 5) return 'ultra_short';
  if (minutes <= 60) return 'short';
  if (minutes <= 720) return 'medium';
  return 'long';
}

export function getTimeframeLabel(minutes: number): string {
  return TIMEFRAME_LABELS[minutes] || `${minutes}min`;
}

export function getCategoryLabel(category: TimeframeCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategoryIcon(category: TimeframeCategory): string {
  return CATEGORY_ICONS[category];
}