import { useReducer, useEffect } from 'react';

/**
 * useOddsApi — Fetches odds data through the server-side proxy at /api/odds.
 *
 * The API key is injected by the backend (routes/odds.js) so it is never
 * exposed to the browser. Set ODDS_API_KEY as a server environment variable.
 *
 * @param {string} sport  – sport key OR "upcoming" for all-sports upcoming games
 * @param {string} [mode] – "upcoming" | "live" | "today" (default: "upcoming")
 */

const PROXY_BASE = '/api/odds';

const initialState = { data: null, loading: false, error: null };

function oddsReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':   return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS': return { data: action.payload, loading: false, error: null };
    case 'FETCH_ERROR':   return { ...state, loading: false, error: action.payload };
    default:              return state;
  }
}

export function useOddsApi(sport = 'upcoming', mode = 'upcoming') {
  const [state, dispatch] = useReducer(oddsReducer, initialState);

  useEffect(() => {
    const controller = new AbortController();
    const params     = new URLSearchParams({ sport, mode });
    const url        = `${PROXY_BASE}?${params}`;

    dispatch({ type: 'FETCH_START' });
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) return res.json().then(body => {
          throw new Error((body && body.error) || `API error: ${res.status}`);
        });
        return res.json();
      })
      .then(json => dispatch({ type: 'FETCH_SUCCESS', payload: json }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'FETCH_ERROR', payload: err.message });
        }
      });
    return () => controller.abort();
  }, [sport, mode]);

  return { data: state.data, loading: state.loading, error: state.error };
}
