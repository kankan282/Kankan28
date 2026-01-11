import fetch from 'node-fetch';
import { EnsembleEngine } from '../lib/ensembleEngine.js';
import { CacheManager } from '../lib/cacheManager.js';
import { DataFetcher } from '../lib/dataFetcher.js';

// Initialize services
const cache = new CacheManager();
const dataFetcher = new DataFetcher();
const engine = new EnsembleEngine();

// In-memory cache for ultra-fast access (Vercel serverless compatible)
let predictionCache = {
  lastPrediction: null,
  lastResult: null,
  winStreak: 0,
  lossStreak: 0,
  totalPredictions: 0,
  wins: 0,
  accuracy: 0
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Fetch real-time data asynchronously
    const historicalData = await dataFetcher.fetchHistoricalData();
    
    if (!historicalData || historicalData.length < 50) {
      return res.status(200).json({
        status: 'error',
        message: 'Insufficient data for prediction',
        timestamp: new Date().toISOString()
      });
    }

    // Get last known result
    const lastResult = historicalData[0];
    const lastNumber = parseInt(lastResult.result.split(',')[0]);
    const lastActualOutcome = lastNumber >= 50 ? 'BIG' : 'SMALL';

    // Check previous prediction result
    let winLossResult = null;
    if (predictionCache.lastPrediction) {
      const isWin = predictionCache.lastPrediction.prediction === lastActualOutcome;
      winLossResult = isWin ? 'WIN' : 'LOSS';
      
      // Update statistics
      predictionCache.totalPredictions++;
      if (isWin) {
        predictionCache.wins++;
        predictionCache.winStreak++;
        predictionCache.lossStreak = 0;
      } else {
        predictionCache.lossStreak++;
        predictionCache.winStreak = 0;
      }
      predictionCache.accuracy = (predictionCache.wins / predictionCache.totalPredictions * 100).toFixed(2);
    }

    // Generate new prediction using ensemble engine
    const prediction = await engine.predictNextOutcome(historicalData);
    
    // Update cache with new prediction
    predictionCache.lastPrediction = {
      prediction: prediction.outcome,
      confidence: prediction.confidence,
      timestamp: new Date().toISOString(),
      issueNumber: historicalData[0].issue
    };
    predictionCache.lastResult = {
      outcome: lastActualOutcome,
      number: lastNumber,
      issue: lastResult.issue
    };

    // Store in Redis for persistence across serverless instances
    await cache.storePrediction(predictionCache);

    // Prepare response
    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      previous_prediction_result: winLossResult,
      statistics: {
        accuracy: `${predictionCache.accuracy}%`,
        win_streak: predictionCache.winStreak,
        total_predictions: predictionCache.totalPredictions,
        wins: predictionCache.wins,
        losses: predictionCache.totalPredictions - predictionCache.wins
      },
      current_prediction: {
        outcome: prediction.outcome,
        confidence: `${prediction.confidence}%`,
        issue: historicalData[0].issue,
        next_issue_expected: prediction.nextIssueTime,
        model_count: prediction.modelCount,
        trend_direction: prediction.trendDirection,
        suggested_stake: prediction.suggestedStake
      },
      last_result: {
        issue: lastResult.issue,
        number: lastNumber,
        outcome: lastActualOutcome,
        full_result: lastResult.result
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Prediction engine failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
