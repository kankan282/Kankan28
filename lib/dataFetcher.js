import fetch from 'node-fetch';
import _ from 'lodash';

export class DataFetcher {
  constructor() {
    this.baseUrl = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json';
    this.cacheDuration = 3000; // 3 seconds cache for real-time data
    this.lastFetchTime = 0;
    this.cachedData = null;
  }

  async fetchHistoricalData(limit = 200) {
    const now = Date.now();
    
    // Use cache if within duration
    if (this.cachedData && (now - this.lastFetchTime) < this.cacheDuration) {
      return this.cachedData.slice(0, limit);
    }

    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform and normalize data
      if (data.data && data.data.list) {
        this.cachedData = data.data.list
          .map(item => ({
            issue: item.issue,
            result: item.result,
            timestamp: new Date().toISOString(),
            number: parseInt(item.result.split(',')[0]) || 0,
            outcome: this._determineOutcome(item.result)
          }))
          .reverse(); // Most recent first
        
        this.lastFetchTime = now;
        return this.cachedData.slice(0, limit);
      }
      
      throw new Error('Invalid data format received');
      
    } catch (error) {
      console.error('Data fetch error:', error);
      // Return cached data even if stale as fallback
      return this.cachedData ? this.cachedData.slice(0, limit) : [];
    }
  }

  _determineOutcome(resultString) {
    const firstNum = parseInt(resultString.split(',')[0]) || 0;
    return firstNum >= 50 ? 'BIG' : 'SMALL';
  }

  analyzeTrends(data) {
    if (!data || data.length < 10) return null;
    
    const outcomes = data.map(d => d.outcome);
    const numbers = data.map(d => d.number);
    
    // Calculate basic statistics
    const bigCount = outcomes.filter(o => o === 'BIG').length;
    const smallCount = outcomes.filter(o => o === 'SMALL').length;
    
    // Calculate streaks
    let currentStreak = 1;
    let maxStreak = 1;
    let currentType = outcomes[0];
    
    for (let i = 1; i < outcomes.length; i++) {
      if (outcomes[i] === outcomes[i-1]) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
        currentType = outcomes[i];
      }
    }
    
    // Calculate average numbers
    const avgNumber = _.mean(numbers);
    const stdDev = Math.sqrt(_.sumBy(numbers, n => Math.pow(n - avgNumber, 2)) / numbers.length);
    
    return {
      total_samples: data.length,
      big_percentage: ((bigCount / data.length) * 100).toFixed(2),
      small_percentage: ((smallCount / data.length) * 100).toFixed(2),
      current_streak: currentStreak,
      streak_type: currentType,
      max_streak: maxStreak,
      average_number: avgNumber.toFixed(2),
      standard_deviation: stdDev.toFixed(2),
      volatility: (stdDev / avgNumber * 100).toFixed(2) + '%'
    };
  }
          }
