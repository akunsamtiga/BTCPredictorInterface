import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, AreaChart, ReferenceLine, Scatter, ScatterChart, ZAxis
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, 
  Calendar, Filter, Download, ChevronLeft, ChevronRight,
  Activity, Target, Zap
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
  price_change_pct: number;
  trend: string;
  confidence: number;
  validated: boolean;
  validation_result?: 'WIN' | 'LOSE' | null;  
  actual_price?: number;
  target_time: string;
}

interface PriceData {
  timestamp: string;
  price: number;
  prediction?: {
    id: string;
    predicted_price: number;
    trend: string;
    confidence: number;
  };
}

// ============================================================================
// 1. REAL-TIME PRICE CHART WITH PREDICTIONS OVERLAY
// ============================================================================

const RealTimePriceChart = ({ predictions }: { predictions: Prediction[] }) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h');

  // Simulate real-time price updates
  useEffect(() => {
    const generatePriceData = () => {
      const now = Date.now();
      const ranges = { '1h': 60, '6h': 360, '24h': 1440 };
      const minutes = ranges[timeRange];
      
      const data: PriceData[] = [];
      const basePrice = 95000;
      
      for (let i = minutes; i >= 0; i -= 5) {
        const time = new Date(now - i * 60000);
        const randomWalk = (Math.random() - 0.5) * 500;
        const price = basePrice + randomWalk;
        
        // Check if there's a prediction at this time
        const prediction = predictions.find(p => {
          const predTime = new Date(p.prediction_time).getTime();
          return Math.abs(predTime - time.getTime()) < 5 * 60000; // Within 5 min
        });
        
        data.push({
          timestamp: time.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          price,
          prediction: prediction ? {
            id: prediction.id,
            predicted_price: prediction.predicted_price,
            trend: prediction.trend,
            confidence: prediction.confidence
          } : undefined
        });
      }
      
      return data;
    };

    setPriceData(generatePriceData());
    const interval = setInterval(() => {
      setPriceData(generatePriceData());
    }, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [timeRange, predictions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">{data.timestamp}</p>
        <p className="text-blue-400 text-sm">
          Price: ${data.price.toFixed(2)}
        </p>
        {data.prediction && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className={`text-xs ${
              data.prediction.trend.includes('CALL') 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              {data.prediction.trend}
            </p>
            <p className="text-yellow-400 text-xs">
              Predicted: ${data.prediction.predicted_price.toFixed(2)}
            </p>
            <p className="text-gray-400 text-xs">
              Confidence: {data.prediction.confidence.toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    );
  };

  const predictionPoints = priceData.filter(d => d.prediction);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Live Price with Predictions
        </h2>
        <div className="flex gap-2">
          {(['1h', '6h', '24h'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={priceData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            domain={['dataMin - 200', 'dataMax + 200']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorPrice)"
          />
          
          {/* Scatter plot for predictions */}
          {predictionPoints.map((point, i) => (
            <ReferenceLine
              key={i}
              x={point.timestamp}
              stroke={point.prediction?.trend.includes('CALL') ? '#10b981' : '#ef4444'}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-400">Actual Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500"></div>
          <span className="text-gray-400">CALL Prediction</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500"></div>
          <span className="text-gray-400">PUT Prediction</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. TRADE HISTORY TIMELINE
// ============================================================================

const TradeHistoryTimeline = ({ predictions }: { predictions: Prediction[] }) => {
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [filter, setFilter] = useState<'all' | 'win' | 'lose' | 'pending'>('all');
  const [timeView, setTimeView] = useState<'24h' | '7d' | '30d'>('24h');

  // Group predictions by hour
  const groupedPredictions = React.useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - (
      timeView === '24h' ? 24 * 60 * 60 * 1000 :
      timeView === '7d' ? 7 * 24 * 60 * 60 * 1000 :
      30 * 24 * 60 * 60 * 1000
    ));

    const filtered = predictions
      .filter(p => new Date(p.prediction_time) > cutoff)
      .filter(p => {
        if (filter === 'all') return true;
        if (filter === 'pending') return !p.validated;
        return p.validation_result?.toLowerCase() === filter;
      });

    // Group by hour
    const grouped: { [key: string]: Prediction[] } = {};
    filtered.forEach(pred => {
      const hour = new Date(pred.prediction_time).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        hour12: false
      });
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(pred);
    });

    return Object.entries(grouped)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [predictions, filter, timeView]);

  const getStats = (preds: Prediction[]) => {
    const validated = preds.filter(p => p.validated);
    const wins = validated.filter(p => p.validation_result === 'WIN').length;
    const total = validated.length;
    return {
      total: preds.length,
      wins,
      losses: total - wins,
      pending: preds.length - total,
      winRate: total > 0 ? (wins / total * 100).toFixed(1) : '0'
    };
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Trade History Timeline
        </h2>
        
        <div className="flex gap-2">
          {/* Time View */}
          <select
            value={timeView}
            onChange={(e) => setTimeView(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
          >
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
          >
            <option value="all">All</option>
            <option value="win">Wins Only</option>
            <option value="lose">Losses Only</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {groupedPredictions.map(([hour, preds]) => {
          const stats = getStats(preds);
          
          return (
            <div key={hour} className="relative">
              {/* Hour Header */}
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-blue-600 rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-semibold">{hour}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {stats.total} trades
                  </span>
                  {stats.wins > 0 && (
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {stats.wins}W
                    </span>
                  )}
                  {stats.losses > 0 && (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {stats.losses}L
                    </span>
                  )}
                  {stats.pending > 0 && (
                    <span className="text-yellow-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {stats.pending}P
                    </span>
                  )}
                  {Number(stats.winRate) > 0 && (
                    <span className={`font-semibold ${
                      Number(stats.winRate) >= 70 ? 'text-green-400' :
                      Number(stats.winRate) >= 50 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {stats.winRate}%
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4 border-l-2 border-gray-700 pl-4">
                {preds.map((pred) => {
                  const isWin = pred.validation_result === 'WIN';
                  const isLose = pred.validation_result === 'LOSE';
                  const isPending = !pred.validated;
                  
                  return (
                    <button
                      key={pred.id}
                      onClick={() => setSelectedPrediction(pred)}
                      className={`text-left p-3 rounded-lg border transition-all hover:scale-105 ${
                        isWin ? 'bg-green-500/10 border-green-500/50' :
                        isLose ? 'bg-red-500/10 border-red-500/50' :
                        'bg-yellow-500/10 border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">
                          {new Date(pred.prediction_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {pred.trend.includes('CALL') ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      
                      <div className="text-sm font-semibold text-white mb-1">
                        ${pred.predicted_price.toFixed(2)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {pred.timeframe_minutes}m
                        </span>
                        {isPending ? (
                          <Clock className="w-3 h-3 text-yellow-400" />
                        ) : isWin ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Prediction Detail Modal */}
      {selectedPrediction && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPrediction(null)}
        >
          <div 
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Prediction Details</h3>
              <button
                onClick={() => setSelectedPrediction(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Time:</span>
                <span className="text-white">
                  {new Date(selectedPrediction.prediction_time).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timeframe:</span>
                <span className="text-white">{selectedPrediction.timeframe_minutes}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price:</span>
                <span className="text-white">${selectedPrediction.current_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Predicted Price:</span>
                <span className="text-white">${selectedPrediction.predicted_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Change:</span>
                <span className={selectedPrediction.price_change_pct > 0 ? 'text-green-400' : 'text-red-400'}>
                  {selectedPrediction.price_change_pct.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trend:</span>
                <span className={selectedPrediction.trend.includes('CALL') ? 'text-green-400' : 'text-red-400'}>
                  {selectedPrediction.trend}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence:</span>
                <span className="text-white">{selectedPrediction.confidence.toFixed(1)}%</span>
              </div>
              
              {selectedPrediction.validated && (
                <>
                  <div className="border-t border-gray-700 pt-3"></div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Actual Price:</span>
                    <span className="text-white">${selectedPrediction.actual_price?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Result:</span>
                    <span className={selectedPrediction.validation_result === 'WIN' ? 'text-green-400' : 'text-red-400'}>
                      {selectedPrediction.validation_result}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. PERFORMANCE HEATMAP
// ============================================================================

const PerformanceHeatmap = ({ predictions }: { predictions: Prediction[] }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Calculate heatmap data
  const heatmapData = React.useMemo(() => {
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    
    const dailyStats: { [key: string]: {
      total: number;
      wins: number;
      losses: number;
      winRate: number;
      avgConfidence: number;
    }} = {};

    predictions.forEach(pred => {
      const predDate = new Date(pred.prediction_time);
      if (predDate < startOfMonth || predDate > endOfMonth) return;
      
      const dateKey = predDate.toISOString().split('T')[0];
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          total: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          avgConfidence: 0
        };
      }
      
      dailyStats[dateKey].total++;
      dailyStats[dateKey].avgConfidence += pred.confidence;
      
      if (pred.validated) {
        if (pred.validation_result === 'WIN') {
          dailyStats[dateKey].wins++;
        } else {
          dailyStats[dateKey].losses++;
        }
      }
    });

    // Calculate win rates
    Object.keys(dailyStats).forEach(key => {
      const stats = dailyStats[key];
      const validated = stats.wins + stats.losses;
      stats.winRate = validated > 0 ? (stats.wins / validated) * 100 : 0;
      stats.avgConfidence = stats.avgConfidence / stats.total;
    });

    return dailyStats;
  }, [predictions, selectedMonth]);

  // Generate calendar grid
  const calendarDays = React.useMemo(() => {
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    
    const days: Array<{ date: Date | null; dateKey: string | null }> = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, dateKey: null });
    }
    
    // Add actual days
    for (let day = 1; day <= endOfMonth.getDate(); day++) {
      const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
      days.push({
        date,
        dateKey: date.toISOString().split('T')[0]
      });
    }
    
    return days;
  }, [selectedMonth]);

  const getColorIntensity = (winRate: number) => {
    if (winRate >= 80) return 'bg-green-600';
    if (winRate >= 70) return 'bg-green-500';
    if (winRate >= 60) return 'bg-green-400';
    if (winRate >= 50) return 'bg-yellow-500';
    if (winRate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const changeMonth = (delta: number) => {
    setSelectedMonth(new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + delta,
      1
    ));
  };

  const hoveredStats = hoveredDay ? heatmapData[hoveredDay] : null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Performance Heatmap
        </h2>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          
          <span className="text-white font-semibold min-w-[150px] text-center">
            {selectedMonth.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
          
          <button
            onClick={() => changeMonth(1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mb-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-gray-400 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            if (!day.date || !day.dateKey) {
              return <div key={i} className="aspect-square" />;
            }

            const stats = heatmapData[day.dateKey];
            const hasData = stats && stats.total > 0;
            
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg border transition-all cursor-pointer ${
                  hasData
                    ? `${getColorIntensity(stats.winRate)} border-gray-600 hover:scale-110 hover:shadow-lg`
                    : 'bg-gray-700/30 border-gray-700'
                }`}
                onMouseEnter={() => setHoveredDay(day.dateKey)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className="w-full h-full flex items-center justify-center text-xs text-white font-medium">
                  {day.date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Display */}
      {hoveredStats ? (
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">
            {hoveredDay && new Date(hoveredDay).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400 text-xs mb-1">Total Trades</div>
              <div className="text-white font-semibold">{hoveredStats.total}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Win Rate</div>
              <div className={`font-semibold ${
                hoveredStats.winRate >= 70 ? 'text-green-400' :
                hoveredStats.winRate >= 50 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {hoveredStats.winRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Wins / Losses</div>
              <div className="text-white font-semibold">
                {hoveredStats.wins} / {hoveredStats.losses}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Avg Confidence</div>
              <div className="text-blue-400 font-semibold">
                {hoveredStats.avgConfidence.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 text-center text-gray-400 text-sm">
          Hover over a day to see detailed statistics
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-400">Win Rate:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-xs text-gray-400">0-40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-xs text-gray-400">40-50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-xs text-gray-400">50-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span className="text-xs text-gray-400">60-70%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-400">70-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-xs text-gray-400">80%+</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ALL-IN-ONE WRAPPER COMPONENT
// ============================================================================

interface EnhancedChartsProps {
  predictions: Prediction[];
}

export function EnhancedCharts({ predictions }: EnhancedChartsProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
        <p className="text-gray-400">No prediction data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Price Chart */}
      <RealTimePriceChart predictions={predictions} />

      {/* Trade History Timeline */}
      <TradeHistoryTimeline predictions={predictions} />

      {/* Performance Heatmap */}
      <PerformanceHeatmap predictions={predictions} />
    </div>
  );
}

// ============================================================================
// EXPORTS - Individual components & wrapper
// ============================================================================

export { RealTimePriceChart };
export { TradeHistoryTimeline };
export { PerformanceHeatmap };