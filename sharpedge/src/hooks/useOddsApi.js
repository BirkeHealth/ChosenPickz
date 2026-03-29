import { useState, useEffect, useCallback } from 'react';

// TODO: Set VITE_ODDS_API_KEY in .env file
// The Odds API: https://api.the-odds-api.com/v4/
// Supported sports: basketball_ncaab, americanfootball_ncaaf, americanfootball_nfl, basketball_nba, baseball_mlb
const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';

export function useOddsApi(sport = 'upcoming') {
  const [state, setState] = useState({ data: null, loading: false, error: null });

  const fetchOdds = useCallback((currentSport, signal) => {
    if (!API_KEY) {
      setState({ data: null, loading: false, error: 'No API key configured. Set VITE_ODDS_API_KEY in .env' });
      return;
    }
    const url = `${BASE_URL}/sports/${currentSport}/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=${API_KEY}`;
    setState({ data: null, loading: true, error: null });
    fetch(url, { signal })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(json => setState({ data: json, loading: false, error: null }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          setState({ data: null, loading: false, error: err.message });
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOdds(sport, controller.signal);
    return () => controller.abort();
  }, [sport, fetchOdds]);

  return { data: state.data, loading: state.loading, error: state.error };
}
