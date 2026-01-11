import { createClient } from 'redis';

export class CacheManager {
  constructor() {
    this.redisClient = null;
    this.localCache = new Map();
    this.initRedis();
  }

  async initRedis() {
    try {
      // For Vercel, use serverless Redis or Redis Cloud
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        this.redisClient = null;
      });
      
      await this.redisClient.connect();
    } catch (error) {
      console.warn('Redis not available, using local cache only');
      this.redisClient = null;
    }
  }

  async storePrediction(data) {
    const key = 'wingo:predictions:latest';
    const timestamp = Date.now();
    
    // Store locally
    this.localCache.set(key, { data, timestamp });
    
    // Store in Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify({ data, timestamp }), {
          EX: 300 // 5 minutes TTL
        });
      } catch (error) {
        console.warn('Redis store failed:', error.message);
      }
    }
  }

  async getPrediction() {
    const key = 'wingo:predictions:latest';
    
    // Try Redis first
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.localCache.set(key, parsed);
          return parsed.data;
        }
      } catch (error) {
        console.warn('Redis fetch failed:', error.message);
      }
    }
    
    // Fallback to local cache
    const local = this.localCache.get(key);
    if (local && (Date.now() - local.timestamp < 300000)) { // 5 minutes
      return local.data;
    }
    
    return null;
  }

  async storeHistory(data) {
    const key = 'wingo:history';
    
    // Store in Redis
    if (this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(data), {
          EX: 30 // 30 seconds TTL for history
        });
      } catch (error) {
        console.warn('Redis history store failed');
      }
    }
  }

  async getHistory() {
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get('wingo:history');
        if (cached) return JSON.parse(cached);
      } catch (error) {
        // Ignore cache miss
      }
    }
    return null;
  }
}
