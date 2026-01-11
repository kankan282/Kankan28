import { DataFetcher } from '../lib/dataFetcher.js';

const dataFetcher = new DataFetcher();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const limit = parseInt(req.query.limit) || 100;
    const historicalData = await dataFetcher.fetchHistoricalData(limit);
    
    // Analyze historical trends
    const analysis = dataFetcher.analyzeTrends(historicalData);
    
    res.status(200).json({
      status: 'success',
      count: historicalData.length,
      data: historicalData,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch history',
      error: error.message
    });
  }
                         }
