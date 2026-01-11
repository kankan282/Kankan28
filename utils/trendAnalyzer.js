import * as math from 'mathjs';
import _ from 'lodash';

export class TrendAnalyzer {
  static calculateTrendStrength(numbers, shortWindow = 5, longWindow = 20) {
    if (numbers.length < longWindow) {
      return { strength: 0, direction: 'NEUTRAL', confidence: 0 };
    }
    
    const shortAvg = _.mean(numbers.slice(0, shortWindow));
    const longAvg = _.mean(numbers.slice(0, longWindow));
    
    const percentageDiff = ((shortAvg - longAvg) / longAvg) * 100;
    const direction = percentageDiff > 0 ? 'UPWARD' : percentageDiff < 0 ? 'DOWNWARD' : 'NEUTRAL';
    const strength = Math.abs(percentageDiff);
    
    // Calculate confidence based on consistency
    let consistency = 0;
    if (numbers.length >= shortWindow * 2) {
      const firstHalf = _.mean(numbers.slice(0, shortWindow));
      const secondHalf = _.mean(numbers.slice(shortWindow, shortWindow * 2));
      consistency = Math.abs(firstHalf - secondHalf) < (firstHalf * 0.1) ? 1 : 0;
    }
    
    const confidence = Math.min(strength * 0.5 + consistency * 50, 100);
    
    return { strength, direction, confidence };
  }

  static detectSupportResistance(numbers, sensitivity = 0.02) {
    if (numbers.length < 20) return { support: 0, resistance: 100 };
    
    const sorted = [...numbers].sort((a, b) => a - b);
    
    // Find clusters (potential support/resistance levels)
    const clusters = [];
    let currentCluster = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const diff = (sorted[i] - currentCluster[currentCluster.length - 1]) / sorted[i];
      if (diff < sensitivity) {
        currentCluster.push(sorted[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [sorted[i]];
      }
    }
    clusters.push(currentCluster);
    
    // Find densest clusters (strong support/resistance)
    clusters.sort((a, b) => b.length - a.length);
    
    const support = _.mean(clusters[0] || [0]);
    const resistance = _.mean(clusters[clusters.length - 1] || [100]);
    
    return { support, resistance, clusterCount: clusters.length };
  }

  static calculateVolatility(numbers, period = 20) {
    if (numbers.length < period) return { volatility: 0, riskLevel: 'LOW' };
    
    const returns = [];
    for (let i = 1; i < period; i++) {
      returns.push((numbers[i-1] - numbers[i]) / numbers[i]);
    }
    
    const volatility = math.std(returns) * Math.sqrt(365); // Annualized
    
    let riskLevel = 'LOW';
    if (volatility > 0.3) riskLevel = 'HIGH';
    else if (volatility > 0.15) riskLevel = 'MEDIUM';
    
    return { volatility, riskLevel, annualized: volatility * 100 };
  }

  static predictNextWithTrend(numbers, currentTrend) {
    if (numbers.length < 10) return { prediction: 'BIG', confidence: 50 };
    
    const lastNumber = numbers[0];
    const trend = currentTrend;
    
    let prediction;
    let confidence;
    
    if (trend.direction === 'UPWARD' && trend.strength > 0.5) {
      prediction = lastNumber >= 50 ? 'BIG' : 'SMALL';
      confidence = Math.min(trend.confidence * 1.2, 95);
    } else if (trend.direction === 'DOWNWARD' && trend.strength > 0.5) {
      prediction = lastNumber < 50 ? 'SMALL' : 'BIG';
      confidence = Math.min(trend.confidence * 1.2, 95);
    } else {
      // Weak trend, use mean reversion
      const avg = _.mean(numbers);
      prediction = lastNumber > avg ? 'SMALL' : 'BIG';
      confidence = 60;
    }
    
    return { prediction, confidence };
  }
      }
