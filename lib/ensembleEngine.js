import _ from 'lodash';
import * as math from 'mathjs';

export class EnsembleEngine {
  constructor() {
    this.modelWeights = {};
    this.initializeModels();
  }

  initializeModels() {
    // Initialize 120 micro-models with different weights
    this.models = [
      // Trend Following Models (40%)
      ...this.createTrendModels(48),
      
      // Mean Reversion Models (25%)
      ...this.createMeanReversionModels(30),
      
      // Pattern Recognition Models (20%)
      ...this.createPatternModels(24),
      
      // Statistical Arbitrage Models (15%)
      ...this.createStatisticalModels(18)
    ];
  }

  createTrendModels(count) {
    const models = [];
    for (let i = 0; i < count; i++) {
      const windowSize = 5 + (i % 15);
      const threshold = 0.5 + (i * 0.01);
      models.push({
        type: 'TREND_FOLLOWING',
        id: `TREND_${i}`,
        weight: 0.4 / count,
        window: windowSize,
        threshold: threshold,
        predict: (data) => this.trendFollowingPrediction(data, windowSize, threshold)
      });
    }
    return models;
  }

  createMeanReversionModels(count) {
    const models = [];
    for (let i = 0; i < count; i++) {
      const lookback = 10 + (i % 20);
      const deviation = 1.0 + (i * 0.05);
      models.push({
        type: 'MEAN_REVERSION',
        id: `MR_${i}`,
        weight: 0.25 / count,
        lookback: lookback,
        deviation: deviation,
        predict: (data) => this.meanReversionPrediction(data, lookback, deviation)
      });
    }
    return models;
  }

  createPatternModels(count) {
    const models = [];
    for (let i = 0; i < count; i++) {
      const patternLength = 3 + (i % 7);
      const confidence = 0.6 + (i * 0.02);
      models.push({
        type: 'PATTERN_RECOGNITION',
        id: `PATTERN_${i}`,
        weight: 0.2 / count,
        patternLength: patternLength,
        confidence: confidence,
        predict: (data) => this.patternRecognitionPrediction(data, patternLength)
      });
    }
    return models;
  }

  createStatisticalModels(count) {
    const models = [];
    for (let i = 0; i < count; i++) {
      const method = i % 4;
      models.push({
        type: 'STATISTICAL',
        id: `STAT_${i}`,
        weight: 0.15 / count,
        method: method,
        predict: (data) => this.statisticalPrediction(data, method)
      });
    }
    return models;
  }

  async predictNextOutcome(historicalData) {
    // Extract numbers and outcomes
    const numbers = historicalData.map(d => d.number);
    const outcomes = historicalData.map(d => d.outcome);
    
    // Run all models in parallel
    const predictions = await Promise.all(
      this.models.map(async model => ({
        modelId: model.id,
        prediction: await model.predict(historicalData),
        weight: model.weight,
        type: model.type
      }))
    );

    // Aggregate predictions with weighted voting
    let bigVotes = 0;
    let smallVotes = 0;
    const modelResults = [];

    predictions.forEach(p => {
      if (p.prediction === 'BIG') {
        bigVotes += p.weight;
      } else if (p.prediction === 'SMALL') {
        smallVotes += p.weight;
      }
      modelResults.push({
        model: p.modelId,
        prediction: p.prediction,
        weight: p.weight
      });
    });

    // Calculate confidence
    const totalVotes = bigVotes + smallVotes;
    const confidence = Math.max(bigVotes, smallVotes) / totalVotes * 100;
    const outcome = bigVotes > smallVotes ? 'BIG' : 'SMALL';

    // Determine trend direction
    const trend = this.analyzeTrend(numbers);
    
    // Calculate suggested stake based on confidence and trend strength
    const suggestedStake = this.calculateStake(confidence, trend.strength);

    return {
      outcome,
      confidence: confidence.toFixed(2),
      modelCount: this.models.length,
      trendDirection: trend.direction,
      trendStrength: trend.strength,
      suggestedStake,
      nextIssueTime: this.calculateNextIssueTime(),
      modelBreakdown: {
        bigVotes: (bigVotes * 100).toFixed(2) + '%',
        smallVotes: (smallVotes * 100).toFixed(2) + '%',
        activeModels: modelResults.length
      }
    };
  }

  trendFollowingPrediction(data, windowSize, threshold) {
    if (data.length < windowSize + 1) return 'BIG'; // Default
    
    const recentNumbers = data.slice(0, windowSize).map(d => d.number);
    const previousNumbers = data.slice(windowSize, windowSize * 2).map(d => d.number);
    
    const recentAvg = _.mean(recentNumbers);
    const previousAvg = _.mean(previousNumbers);
    
    const trendStrength = (recentAvg - previousAvg) / previousAvg;
    
    if (Math.abs(trendStrength) > threshold) {
      return trendStrength > 0 ? 'BIG' : 'SMALL';
    }
    
    // If weak trend, use momentum
    const momentum = recentNumbers[0] - recentNumbers[recentNumbers.length - 1];
    return momentum > 0 ? 'BIG' : 'SMALL';
  }

  meanReversionPrediction(data, lookback, deviation) {
    const numbers = data.slice(0, lookback).map(d => d.number);
    const mean = _.mean(numbers);
    const std = math.std(numbers);
    const current = numbers[0];
    const zScore = (current - mean) / std;
    
    if (zScore > deviation) {
      return 'SMALL'; // Expect reversion down
    } else if (zScore < -deviation) {
      return 'BIG'; // Expect reversion up
    }
    
    // Near mean, follow short-term trend
    const shortTerm = numbers.slice(0, 3);
    const shortAvg = _.mean(shortTerm);
    return shortAvg >= mean ? 'BIG' : 'SMALL';
  }

  patternRecognitionPrediction(data, patternLength) {
    if (data.length < patternLength * 2) return 'BIG';
    
    const recentPattern = data.slice(0, patternLength).map(d => d.outcome);
    
    // Look for similar patterns in history
    let bigPatterns = 0;
    let smallPatterns = 0;
    
    for (let i = patternLength; i < Math.min(data.length, 50); i++) {
      const historicalPattern = data.slice(i, i + patternLength).map(d => d.outcome);
      
      if (this.patternsMatch(recentPattern, historicalPattern)) {
        const nextOutcome = data[i - 1].outcome;
        if (nextOutcome === 'BIG') bigPatterns++;
        else smallPatterns++;
      }
    }
    
    if (bigPatterns + smallPatterns === 0) {
      return this.trendFollowingPrediction(data, 5, 0.3);
    }
    
    return bigPatterns > smallPatterns ? 'BIG' : 'SMALL';
  }

  patternsMatch(pattern1, pattern2) {
    if (pattern1.length !== pattern2.length) return false;
    for (let i = 0; i < pattern1.length; i++) {
      if (pattern1[i] !== pattern2[i]) return false;
    }
    return true;
  }

  statisticalPrediction(data, method) {
    const numbers = data.slice(0, 20).map(d => d.number);
    
    switch(method) {
      case 0: // Exponential Moving Average
        const ema = this.calculateEMA(numbers, 0.3);
        return numbers[0] > ema ? 'BIG' : 'SMALL';
        
      case 1: // RSI-like logic
        const rsi = this.calculateRSI(numbers, 14);
        return rsi > 50 ? 'BIG' : 'SMALL';
        
      case 2: // Fibonacci retracement
        const fibLevel = this.fibonacciLevel(numbers);
        return fibLevel > 0.5 ? 'BIG' : 'SMALL';
        
      case 3: // Bollinger Bands
        const bbPosition = this.bollingerPosition(numbers);
        return bbPosition > 0 ? 'BIG' : 'SMALL';
        
      default:
        return 'BIG';
    }
  }

  calculateEMA(numbers, alpha) {
    let ema = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      ema = alpha * numbers[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  calculateRSI(numbers, period) {
    if (numbers.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = numbers[i-1] - numbers[i];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  fibonacciLevel(numbers) {
    const high = Math.max(...numbers);
    const low = Math.min(...numbers);
    const current = numbers[0];
    const range = high - low;
    
    if (range === 0) return 0.5;
    return (current - low) / range;
  }

  bollingerPosition(numbers, period = 20, stdDev = 2) {
    if (numbers.length < period) return 0;
    
    const slice = numbers.slice(0, period);
    const mean = _.mean(slice);
    const std = math.std(slice);
    const upperBand = mean + (stdDev * std);
    const lowerBand = mean - (stdDev * std);
    const current = numbers[0];
    
    if (current > upperBand) return 1; // Above upper band
    if (current < lowerBand) return -1; // Below lower band
    return (current - mean) / (upperBand - mean); // Position within bands
  }

  analyzeTrend(numbers) {
    if (numbers.length < 10) return { direction: 'NEUTRAL', strength: 0 };
    
    const shortTerm = _.mean(numbers.slice(0, 5));
    const mediumTerm = _.mean(numbers.slice(0, 15));
    const longTerm = _.mean(numbers.slice(0, 30));
    
    let direction = 'NEUTRAL';
    let strength = 0;
    
    if (shortTerm > mediumTerm && mediumTerm > longTerm) {
      direction = 'UPWARD';
      strength = (shortTerm - longTerm) / longTerm;
    } else if (shortTerm < mediumTerm && mediumTerm < longTerm) {
      direction = 'DOWNWARD';
      strength = (longTerm - shortTerm) / longTerm;
    }
    
    return { direction, strength: Math.abs(strength) };
  }

  calculateStake(confidence, trendStrength) {
    // Dynamic stake sizing based on confidence
    const baseStake = 1;
    const confidenceMultiplier = confidence / 100;
    const trendMultiplier = 1 + (trendStrength * 2);
    
    let stake = baseStake * confidenceMultiplier * trendMultiplier;
    
    // Categorize stake
    if (confidence > 75 && trendStrength > 0.1) {
      return { amount: stake.toFixed(2), level: 'HIGH_CONFIDENCE', risk: 'LOW' };
    } else if (confidence > 65) {
      return { amount: (stake * 0.7).toFixed(2), level: 'MEDIUM', risk: 'MEDIUM' };
    } else {
      return { amount: (stake * 0.3).toFixed(2), level: 'LOW', risk: 'HIGH' };
    }
  }

  calculateNextIssueTime() {
    // WinGo 1M draws every minute
    const now = new Date();
    now.setSeconds(now.getSeconds() + 60);
    return now.toISOString();
  }
  }
