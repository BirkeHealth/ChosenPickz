const axios = require('axios');

/**
 * Handler for GET /api/odds
 * Fetches Moneyline (h2h), Spread, and Over/Under (totals) odds
 * from the Odds API using the server-side ODDS_API_KEY env variable.
 */
async function oddsHandler(req, res) {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    console.error('ODDS_API_KEY environment variable is not set');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Odds API key is not configured on the server' }));
    return;
  }

  try {
    const response = await axios.get(
      'https://api.the-odds-api.com/v4/sports/upcoming/odds',
      {
        params: {
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american',
          apiKey,
        },
      }
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));
  } catch (error) {
    console.error('Odds API request failed:', error.message);
    const status = (error.response && error.response.status) || 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch odds data' }));
  }
}

module.exports = oddsHandler;
