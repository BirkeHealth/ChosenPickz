import { useReducer, useEffect } from 'react';

// TODO: Set VITE_ODDS_API_KEY in .env file
// The Odds API: https://api.the-odds-api.com/v4/
// Supported sports: basketball_ncaab, americanfootball_ncaaf, americanfootball_nfl, basketball_nba, baseball_mlb
const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';

const initialState = { data: null, loading: false, error: null };

function oddsReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START': return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS': return { data: action.payload, loading: false, error: null };
    case 'FETCH_ERROR': return { ...state, loading: false, error: action.payload };
    case 'NO_KEY': return { data: null, loading: false, error: action.payload };
    default: return state;
  }
}

export function useOddsApi(sport = 'upcoming') {
  const [state, dispatch] = useReducer(oddsReducer, initialState);

  useEffect(() => {
    if (!API_KEY) {
      dispatch({ type: 'NO_KEY', payload: 'No API key configured. Set VITE_ODDS_API_KEY in .env' });
      return;
    }
    const controller = new AbortController();
    const url = `${BASE_URL}/sports/${sport}/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=${API_KEY}`;
    dispatch({ type: 'FETCH_START' });
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(json => dispatch({ type: 'FETCH_SUCCESS', payload: json }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'FETCH_ERROR', payload: err.message });
        }
      });
    return () => controller.abort();
  }, [sport]);

  return { data: state.data, loading: state.loading, error: state.error };
}

