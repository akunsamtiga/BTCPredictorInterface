// app/api/predictions/route.ts - Enhanced API with Category Stats
import { NextResponse } from 'next/server';
import { initFirebaseAdmin } from '@/lib/firebase';
import type { 
  Prediction, 
  Statistics, 
  ModelPerformance, 
  DashboardData,
  SystemStatus,
  TimeframeCategoryStats,
  TimeframeCategory
} from '@/types';
import { getTimeframeCategory, TIMEFRAME_CATEGORIES } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCurrentBTCPrice(): Promise<number> {
  try {
    const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD', {
      next: { revalidate: 0 }
    });
    const data = await response.json();
    return data.USD || 0;
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return 0;
  }
}

async function getSystemStatus(db: any): Promise<SystemStatus> {
  try {
    const statusDoc = await db.collection('system_status').doc('heartbeat').get();
    
    if (statusDoc.exists) {
      const data = statusDoc.data();
      
      // Parse timestamp (already in WIB from Python)
      let lastTimestamp: Date;
      try {
        lastTimestamp = new Date(data.timestamp);
      } catch {
        lastTimestamp = new Date();
      }
      
      const now = new Date();
      const minutesSinceLastHeartbeat = (now.getTime() - lastTimestamp.getTime()) / 1000 / 60;
      
      // Determine status
      let status: SystemStatus['status'] = 'offline';
      
      if (data.status === 'offline') {
        status = 'offline';
      } else if (data.status === 'error') {
        status = 'error';
      } else if (data.status === 'starting') {
        status = 'starting';
      } else if (data.status === 'running') {
        status = 'running';
      } else if (minutesSinceLastHeartbeat < 2) {
        status = 'online';
      } else if (minutesSinceLastHeartbeat < 10) {
        status = 'online';
      } else {
        status = 'offline';
      }
      
      return {
        status,
        timestamp: data.timestamp,
        uptime_hours: data.uptime_hours,
        uptime_seconds: data.uptime_seconds,
        memory_mb: data.memory_mb,
        cpu_percent: data.cpu_percent,
        message: data.message,
        heartbeat_count: data.heartbeat_count,
        last_heartbeat: data.last_heartbeat,
        last_activity: data.last_activity,
        predictions_count: data.predictions_count,
        total_predictions: data.total_predictions,
        successful_predictions: data.successful_predictions,
        failed_predictions: data.failed_predictions,
        health_status: data.health_status,
        process_id: data.process_id,
        active_timeframes: data.active_timeframes
      };
    } else {
      return {
        status: 'offline',
        timestamp: new Date().toISOString(),
        message: 'No heartbeat data found'
      };
    }
  } catch (error) {
    console.error('Error fetching system status:', error);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Error fetching status'
    };
  }
}

function calculateCategoryStats(predictions: Prediction[]): TimeframeCategoryStats[] {
  const categories: TimeframeCategory[] = ['ultra_short', 'short', 'medium', 'long'];
  
  return categories.map(category => {
    const timeframes = TIMEFRAME_CATEGORIES[category];
    const categoryPredictions = predictions.filter(p => 
      timeframes.includes(p.timeframe_minutes)
    );
    
    const total = categoryPredictions.length;
    const wins = categoryPredictions.filter(p => p.validation_result === 'WIN').length;
    const losses = categoryPredictions.filter(p => p.validation_result === 'LOSE').length;
    
    const totalError = categoryPredictions.reduce((sum, p) => sum + (p.price_error || 0), 0);
    const totalErrorPct = categoryPredictions.reduce((sum, p) => sum + (p.price_error_pct || 0), 0);
    
    return {
      category,
      timeframes,
      total_predictions: total,
      wins,
      losses,
      win_rate: total > 0 ? (wins / total) * 100 : 0,
      avg_error: total > 0 ? totalError / total : 0,
      avg_error_pct: total > 0 ? totalErrorPct / total : 0
    };
  });
}

export async function GET() {
  console.log('📡 API Route called: /api/predictions');
  
  try {
    console.log('1️⃣ Initializing Firebase Admin...');
    const db = initFirebaseAdmin();
    console.log('✅ Firebase Admin initialized');
    
    // Get system status (heartbeat)
    console.log('2️⃣ Fetching system status...');
    const systemStatus = await getSystemStatus(db);
    console.log(`✅ System Status: ${systemStatus.status}`);
    
    // Get current BTC price
    console.log('3️⃣ Fetching current BTC price...');
    const currentPrice = await getCurrentBTCPrice();
    console.log(`✅ Current BTC Price: $${currentPrice}`);
    
    // Get recent predictions (last 30)
    console.log('4️⃣ Fetching recent predictions...');
    const predictionsSnapshot = await db
      .collection('bitcoin_predictions')
      .orderBy('timestamp', 'desc')
      .limit(30)
      .get();
    
    const recentPredictions: Prediction[] = predictionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Prediction));
    
    console.log(`✅ Found ${recentPredictions.length} recent predictions`);
    
    // Get pending predictions
    console.log('5️⃣ Fetching pending predictions...');
    const now = new Date();
    const pendingSnapshot = await db
      .collection('bitcoin_predictions')
      .where('validated', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    const pendingPredictions: Prediction[] = pendingSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Prediction))
      .filter(pred => {
        try {
          const targetTime = new Date(pred.target_time);
          return targetTime <= now;
        } catch {
          return false;
        }
      });
    
    console.log(`✅ Found ${pendingPredictions.length} pending predictions`);
    
    // Calculate statistics (last 7 days)
    console.log('6️⃣ Calculating statistics...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const validatedSnapshot = await db
      .collection('bitcoin_predictions')
      .where('validated', '==', true)
      .get();
    
    const validatedPredictions = validatedSnapshot.docs
      .map(doc => doc.data() as Prediction)
      .filter(pred => {
        try {
          const predTime = new Date(pred.prediction_time);
          return predTime >= sevenDaysAgo;
        } catch {
          return false;
        }
      });
    
    const totalPredictions = validatedPredictions.length;
    const wins = validatedPredictions.filter(p => p.validation_result === 'WIN').length;
    const losses = validatedPredictions.filter(p => p.validation_result === 'LOSE').length;
    
    const totalError = validatedPredictions.reduce((sum, p) => sum + (p.price_error || 0), 0);
    const totalErrorPct = validatedPredictions.reduce((sum, p) => sum + (p.price_error_pct || 0), 0);
    
    const overallStats: Statistics = {
      period_days: 7,
      total_predictions: totalPredictions,
      wins,
      losses,
      win_rate: totalPredictions > 0 ? (wins / totalPredictions) * 100 : 0,
      avg_error: totalPredictions > 0 ? totalError / totalPredictions : 0,
      avg_error_pct: totalPredictions > 0 ? totalErrorPct / totalPredictions : 0,
      last_updated: new Date().toISOString()
    };
    
    console.log(`✅ Overall stats: ${totalPredictions} predictions, ${wins} wins, ${losses} losses`);
    
    // Calculate category stats
    console.log('7️⃣ Calculating category statistics...');
    const categoryStats = calculateCategoryStats(validatedPredictions);
    console.log(`✅ Category stats calculated for ${categoryStats.length} categories`);
    
    // Calculate statistics per timeframe
    console.log('8️⃣ Calculating timeframe statistics...');
    const activeTimeframes = [5, 10, 15, 30, 60, 120, 240, 480, 720, 1440];
    const timeframeStats: Statistics[] = activeTimeframes.map(tf => {
      const tfPredictions = validatedPredictions.filter(p => p.timeframe_minutes === tf);
      const tfTotal = tfPredictions.length;
      const tfWins = tfPredictions.filter(p => p.validation_result === 'WIN').length;
      const tfLosses = tfPredictions.filter(p => p.validation_result === 'LOSE').length;
      
      const tfTotalError = tfPredictions.reduce((sum, p) => sum + (p.price_error || 0), 0);
      const tfTotalErrorPct = tfPredictions.reduce((sum, p) => sum + (p.price_error_pct || 0), 0);
      
      return {
        timeframe_minutes: tf,
        period_days: 7,
        total_predictions: tfTotal,
        wins: tfWins,
        losses: tfLosses,
        win_rate: tfTotal > 0 ? (tfWins / tfTotal) * 100 : 0,
        avg_error: tfTotal > 0 ? tfTotalError / tfTotal : 0,
        avg_error_pct: tfTotal > 0 ? tfTotalErrorPct / tfTotal : 0,
        last_updated: new Date().toISOString()
      };
    });
    
    console.log('✅ Timeframe stats calculated');
    
    // Get latest model performance
    console.log('9️⃣ Fetching model performance...');
    const modelPerfSnapshot = await db
      .collection('model_performance')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    const modelPerformance: ModelPerformance | null = modelPerfSnapshot.empty
      ? null
      : {
          id: modelPerfSnapshot.docs[0].id,
          ...modelPerfSnapshot.docs[0].data()
        } as ModelPerformance;
    
    console.log(`✅ Model performance: ${modelPerformance ? 'found' : 'not found'}`);
    
    const dashboardData: DashboardData = {
      currentPrice,
      overallStats,
      timeframeStats,
      categoryStats,
      recentPredictions,
      pendingPredictions,
      modelPerformance,
      systemStatus,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('✅ Dashboard data prepared successfully');
    console.log('📤 Sending response...\n');
    
    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ ERROR IN API ROUTE');
    console.error('❌ ========================================');
    console.error('Error object:', error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    console.error('❌ ========================================\n');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch data',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : typeof error,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}