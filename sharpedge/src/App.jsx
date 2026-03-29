import { useState } from 'react';
import { mockPicks, sportColors } from './data/mockPicks';

// TODO: Uncomment to use live The Odds API data
// import { useOddsApi } from './hooks/useOddsApi';

const SPORT_TABS = [
  { label: 'All Picks', value: 'ALL' },
  { label: '🏈 NFL', value: 'NFL' },
  { label: '🏀 NBA', value: 'NBA' },
  { label: '⚾ MLB', value: 'MLB' },
];

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    featured: false,
    features: [
      '2 picks per day',
      'NFL & NBA only',
      'Email delivery',
      'Basic stats access',
    ],
    missing: ['Discord access', 'Live odds alerts', 'Parlay plays', '1-on-1 DMs'],
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mo',
    featured: true,
    badge: 'Most Popular',
    features: [
      '5+ picks per day',
      'All sports covered',
      'Discord community access',
      'Live odds alerts',
      'Parlay plays included',
      'Priority email support',
    ],
    missing: ['1-on-1 DM coaching', 'VIP exclusive picks'],
  },
  {
    name: 'VIP',
    price: '$149',
    period: '/mo',
    featured: false,
    features: [
      'Everything in Pro',
      'VIP exclusive picks',
      '1-on-1 DM coaching',
      'Same-day alerts',
      'Monthly live Q&A',
      'Priority support',
    ],
    missing: [],
  },
];

function ConfidenceMeter({ level }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: i <= level ? '#d4a843' : '#2a2a3a',
          }}
        />
      ))}
    </div>
  );
}

function LeagueBadge({ sport }) {
  const colors = sportColors[sport] || sportColors.default;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded font-dm"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {sport}
    </span>
  );
}

function PickCard({ pick }) {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: '#1c1c28',
        border: '1px solid #2a2a3a',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <LeagueBadge sport={pick.sport} />
        <span className="text-xs font-dm" style={{ color: '#8888a0' }}>
          {pick.gameTime}
        </span>
      </div>

      {/* Teams */}
      <div className="text-center">
        <div className="text-2xl font-bebas tracking-wider" style={{ color: '#e8e8f0' }}>
          {pick.awayTeam.abbr} <span style={{ color: '#8888a0' }}>@</span> {pick.homeTeam.abbr}
        </div>
        <div className="text-xs font-dm mt-0.5" style={{ color: '#8888a0' }}>
          {pick.awayTeam.name} @ {pick.homeTeam.name}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-end justify-between mt-auto">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-dm uppercase tracking-wide" style={{ color: '#8888a0' }}>
              {pick.betType}
            </span>
            {!pick.locked ? (
              <span className="text-sm font-bebas tracking-wide" style={{ color: '#d4a843' }}>
                {pick.pickValue}
              </span>
            ) : (
              <span className="text-sm font-dm italic" style={{ color: '#8888a0' }}>
                Members Only
              </span>
            )}
          </div>
          <ConfidenceMeter level={pick.confidence} />
        </div>

        <div>
          {!pick.locked ? (
            <span
              className="text-xs font-bold px-2 py-1 rounded font-dm"
              style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
              }}
            >
              FREE
            </span>
          ) : (
            <button
              onClick={scrollToPricing}
              className="text-xs font-dm font-semibold px-3 py-1.5 rounded transition-all duration-200 cursor-pointer"
              style={{
                background: 'rgba(212,168,67,0.1)',
                color: '#d4a843',
                border: '1px solid rgba(212,168,67,0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(212,168,67,0.2)';
                e.currentTarget.style.borderColor = '#d4a843';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(212,168,67,0.1)';
                e.currentTarget.style.borderColor = 'rgba(212,168,67,0.3)';
              }}
            >
              Unlock 🔒
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PricingCard({ plan }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 relative"
      style={{
        background: plan.featured ? 'rgba(212,168,67,0.06)' : '#1c1c28',
        border: plan.featured ? '2px solid #d4a843' : '1px solid #2a2a3a',
      }}
    >
      {plan.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full font-dm"
          style={{ background: '#d4a843', color: '#0a0a0f' }}
        >
          {plan.badge}
        </div>
      )}

      <div>
        <h3
          className="text-xl font-bebas tracking-widest"
          style={{ color: plan.featured ? '#d4a843' : '#e8e8f0' }}
        >
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-0.5 mt-1">
          <span
            className="text-4xl font-bebas"
            style={{ color: plan.featured ? '#d4a843' : '#e8e8f0' }}
          >
            {plan.price}
          </span>
          <span className="text-sm font-dm" style={{ color: '#8888a0' }}>
            {plan.period}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm font-dm" style={{ color: '#e8e8f0' }}>
            <span style={{ color: '#22c55e' }}>✓</span>
            {f}
          </li>
        ))}
        {plan.missing?.map((f, i) => (
          <li key={`m-${i}`} className="flex items-start gap-2 text-sm font-dm" style={{ color: '#8888a0' }}>
            <span>✗</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        className="w-full py-3 rounded-lg font-dm font-semibold text-sm transition-all duration-200 mt-2"
        style={
          plan.featured
            ? { background: '#d4a843', color: '#0a0a0f' }
            : { background: 'transparent', color: '#d4a843', border: '1px solid #d4a843' }
        }
        onMouseEnter={e => {
          if (plan.featured) {
            e.currentTarget.style.background = '#f0c060';
          } else {
            e.currentTarget.style.background = 'rgba(212,168,67,0.1)';
          }
        }}
        onMouseLeave={e => {
          if (plan.featured) {
            e.currentTarget.style.background = '#d4a843';
          } else {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        Get {plan.name}
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ALL');

  // TODO: Uncomment to use live data from The Odds API
  // const { data: oddsData, loading, error } = useOddsApi('upcoming');
  // const picks = oddsData ? transformOddsData(oddsData) : mockPicks;

  const filteredPicks =
    activeTab === 'ALL' ? mockPicks : mockPicks.filter(p => p.sport === activeTab);

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      {/* ─── NAVBAR ─── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: '#111118', borderBottom: '1px solid #2a2a3a' }}
      >
        {/* Logo */}
        <div className="text-2xl font-bebas tracking-widest" style={{ color: '#d4a843' }}>
          SharpEdge
        </div>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-6">
          {['Picks', 'Odds', 'Record', 'Discord'].map(link => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-sm font-dm transition-colors duration-200"
              style={{ color: '#8888a0' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-3">
          <button
            className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-dm font-semibold transition-all duration-200"
            style={{ color: '#d4a843', border: '1px solid #d4a843', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,168,67,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Log In
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-dm font-semibold transition-all duration-200"
            style={{ background: '#d4a843', color: '#0a0a0f' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0c060')}
            onMouseLeave={e => (e.currentTarget.style.background = '#d4a843')}
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get Access
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section
        id="picks"
        className="flex flex-col items-center text-center px-6 pt-20 pb-16"
        style={{ background: 'linear-gradient(180deg, #111118 0%, #0a0a0f 100%)' }}
      >
        {/* Live Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-dm font-medium mb-8"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#22c55e',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#22c55e' }}
          />
          Live picks available now
        </div>

        {/* H1 */}
        <h1 className="text-5xl md:text-7xl font-bebas tracking-wider leading-tight mb-6" style={{ color: '#e8e8f0' }}>
          Beat the Books.{' '}
          <span style={{ color: '#d4a843' }}>Every Single Day.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg font-dm max-w-xl mb-12 leading-relaxed"
          style={{ color: '#8888a0' }}
        >
          Expert sports picks backed by data, analytics, and a proven track record.
          Stop guessing — start winning.
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
          {[
            { value: '68%', label: 'Win Rate' },
            { value: '+312', label: 'Units Profit' },
            { value: '1,200+', label: 'Members' },
            { value: '5 Yrs', label: 'Track Record' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bebas" style={{ color: '#d4a843' }}>
                {stat.value}
              </div>
              <div className="text-sm font-dm mt-1" style={{ color: '#8888a0' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SPORT FILTER TABS ─── */}
      <section className="px-6 py-8 flex justify-center">
        <div
          className="inline-flex gap-2 p-1 rounded-full"
          style={{ background: '#111118', border: '1px solid #2a2a3a' }}
        >
          {SPORT_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="px-4 py-2 rounded-full text-sm font-dm font-medium transition-all duration-200"
              style={
                activeTab === tab.value
                  ? {
                      background: '#16161f',
                      color: '#d4a843',
                      border: '1px solid rgba(212,168,67,0.4)',
                    }
                  : {
                      background: 'transparent',
                      color: '#8888a0',
                      border: '1px solid transparent',
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── PICKS GRID ─── */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        {filteredPicks.length === 0 ? (
          <div className="text-center py-16 font-dm" style={{ color: '#8888a0' }}>
            No picks available for this sport right now.
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {filteredPicks.map(pick => (
              <PickCard key={pick.id} pick={pick} />
            ))}
          </div>
        )}
      </section>

      {/* ─── PRICING ─── */}
      <section
        id="pricing"
        className="px-6 py-20"
        style={{ background: '#111118' }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-4xl md:text-5xl font-bebas tracking-wider text-center mb-4"
            style={{ color: '#e8e8f0' }}
          >
            Choose Your <span style={{ color: '#d4a843' }}>Plan</span>
          </h2>
          <p className="text-center font-dm mb-12" style={{ color: '#8888a0' }}>
            Join thousands of winners. Cancel anytime.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_PLANS.map(plan => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHOP EMBED ─── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-sm font-dm" style={{ color: '#8888a0' }}>
            Powered by Whop — secure checkout & instant access
          </p>
        </div>
        <div
          className="rounded-xl p-6 text-center"
          style={{
            border: '2px dashed #2a2a3a',
            background: '#111118',
          }}
        >
          <p className="font-dm mb-4" style={{ color: '#8888a0' }}>
            📦 Whop checkout embed will appear here. Replace{' '}
            <code
              className="px-1 rounded text-xs"
              style={{ background: '#1c1c28', color: '#d4a843' }}
            >
              YOUR-STORE
            </code>{' '}
            with your Whop store slug.
          </p>
          <pre
            className="text-left text-xs rounded-lg p-4 overflow-x-auto"
            style={{ background: '#0a0a0f', color: '#22c55e', border: '1px solid #2a2a3a' }}
          >
{`<iframe
  src="https://whop.com/YOUR-STORE/checkout/?embed=1"
  width="100%"
  height="600"
  frameborder="0"
  allow="payment"
></iframe>`}
          </pre>
          {/* TODO: Replace YOUR-STORE with real Whop store slug and uncomment iframe */}
          {/* 
          <iframe
            src="https://whop.com/YOUR-STORE/checkout/?embed=1"
            width="100%"
            height="600"
            frameBorder="0"
            allow="payment"
            title="Whop Checkout"
          />
          */}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer
        className="px-6 py-10"
        style={{ background: '#111118', borderTop: '1px solid #2a2a3a' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
          <div className="text-xl font-bebas tracking-widest" style={{ color: '#d4a843' }}>
            SharpEdge
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {['About', 'Contact', 'Terms', 'Privacy', 'Responsible Gambling'].map(link => (
              <a
                key={link}
                href="#"
                className="text-sm font-dm transition-colors duration-200"
                style={{ color: '#8888a0' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}
              >
                {link}
              </a>
            ))}
          </div>

          <div className="text-center">
            <p className="text-xs font-dm" style={{ color: '#8888a0' }}>
              © 2025 SharpEdge. All rights reserved.
            </p>
            <p className="text-xs font-dm mt-1" style={{ color: '#8888a0' }}>
              Must be 21+. Please gamble responsibly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
