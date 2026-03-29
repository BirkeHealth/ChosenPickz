import { useState, useEffect } from 'react';

// TODO: Set VITE_ODDS_API_KEY in .env file
// The Odds API: https://api.the-odds-api.com/v4/
// Supported sports: basketball_ncaab, americanfootball_ncaaf, americanfootball_nfl, basketball_nba, baseball_mlb
const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';

export function useOddsApi(sport = 'upcoming') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!API_KEY) {
      setError('No API key configured. Set VITE_ODDS_API_KEY in .env');
      return;
    }
    setLoading(true);
    const url = `${BASE_URL}/sports/${sport}/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=${API_KEY}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [sport]);

  return { data, loading, error };
}
