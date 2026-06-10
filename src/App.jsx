import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const watchlistStorageKey = 'investment-lab-watchlist';

const startingWatchlist = [
  {
    id: 1,
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    thesis: 'A broad market ETF to learn how index investing works.',
    risk: 'Can still fall when the whole market falls.',
    reviewDate: '2026-08-22',
    status: 'Watching',
    buyPrice: 250,
    currentPrice: 262,
    units: 4,
  },
  {
    id: 2,
    ticker: 'MSFT',
    name: 'Microsoft',
    thesis: 'Large software business with cloud and AI exposure.',
    risk: 'High expectations may already be priced in.',
    reviewDate: '2026-09-15',
    status: 'Researching',
    buyPrice: 420,
    currentPrice: 405,
    units: 1,
  },
];

const emptyForm = {
  ticker: '',
  name: '',
  thesis: '',
  risk: '',
  reviewDate: '',
  status: 'Watching',
  buyPrice: '',
  currentPrice: '',
  units: '',
};

const researchChecklist = [
  {
    key: 'goal',
    label: 'Goal',
    prompt: 'What is this investment meant to help me do?',
  },
  {
    key: 'timeHorizon',
    label: 'Time horizon',
    prompt: 'How many years could I hold it?',
  },
  {
    key: 'role',
    label: 'Role',
    prompt: 'Core holding, diversifier, defensive asset, or learning idea?',
  },
  {
    key: 'fees',
    label: 'Fees',
    prompt: 'What is the management fee and are there trading costs?',
  },
  {
    key: 'holdings',
    label: 'Holdings',
    prompt: 'What companies, countries, sectors, or bonds does it contain?',
  },
  {
    key: 'riskResearch',
    label: 'Risk',
    prompt: 'What could go wrong and how much could it fall?',
  },
  {
    key: 'overlap',
    label: 'Overlap',
    prompt: 'Do I already own similar exposure somewhere else?',
  },
  {
    key: 'decision',
    label: 'Decision',
    prompt: 'Watch, simulate, pass, or research more?',
  },
];

const movementPromptGroups = {
  IVV: {
    title: 'US large companies',
    prompts: [
      'Did the S&P 500 move overnight?',
      'Did major holdings like Apple, Microsoft, Nvidia, Amazon, or Meta move?',
      'Did AUD/USD currency movement change the Australian-dollar price?',
      'Was there US inflation, interest-rate, jobs, earnings, or Federal Reserve news?',
    ],
  },
  VGS: {
    title: 'Global developed markets',
    prompts: [
      'Did broad global share markets move?',
      'Did US markets drive most of the move?',
      'Did AUD/USD or other currency movement affect the Australian-dollar price?',
      'Was the move broad across countries, or concentrated in one region?',
    ],
  },
  IOO: {
    title: 'Global mega-cap companies',
    prompts: [
      'Did a few very large global companies drive the move?',
      'Did US technology or healthcare stocks move strongly?',
      'Did currency movement affect the Australian-dollar price?',
      'Is this behaving differently from broader global exposure like VGS?',
    ],
  },
  VAS: {
    title: 'Australian shares',
    prompts: [
      'Did the Australian market move today?',
      'Did banks, miners, or energy companies drive the move?',
      'Was there RBA, inflation, jobs, housing, China, or commodity news?',
      'Is this behaving differently from global ETFs like IVV or VGS?',
    ],
  },
  A200: {
    title: 'Australian shares',
    prompts: [
      'Did the Australian market move today?',
      'Did banks, miners, or energy companies drive the move?',
      'Was there RBA, inflation, jobs, housing, China, or commodity news?',
      'Is this moving similarly to VAS, and if not, why might that be?',
    ],
  },
  VAF: {
    title: 'Australian bonds',
    prompts: [
      'Did bond yields move today?',
      'Did interest-rate expectations change?',
      'Was there RBA, inflation, or government bond market news?',
      'Did this move differently from share ETFs, and what does that teach me about defensive assets?',
    ],
  },
  NDQ: {
    title: 'Technology-heavy US growth',
    prompts: [
      'Did technology stocks move more than the broader market?',
      'Did AI, chip, software, earnings, or valuation news matter today?',
      'Did interest-rate expectations affect growth stocks?',
      'Is NDQ moving more sharply than IVV or VGS because it is more concentrated?',
    ],
  },
  VDHG: {
    title: 'Diversified high-growth portfolio',
    prompts: [
      'Did global shares, Australian shares, or bonds drive most of the move?',
      'Is the movement smaller than concentrated ETFs because it is diversified?',
      'Did currency movement affect the international holdings?',
      'What does this teach me about all-in-one diversified funds?',
    ],
  },
};

const movementReviewRules = {
  IVV: {
    expected: [
      { label: 'US market', terms: ['us market', 's&p', 's&p 500', 'sp500', 'america', 'wall street'] },
      { label: 'large US companies', terms: ['apple', 'microsoft', 'nvidia', 'amazon', 'meta', 'large companies', 'big tech'] },
      { label: 'currency', terms: ['currency', 'aud', 'usd', 'exchange rate', 'australian dollar'] },
      { label: 'rates or inflation', terms: ['rate', 'rates', 'inflation', 'fed', 'federal reserve', 'jobs'] },
    ],
  },
  VGS: {
    expected: [
      { label: 'global markets', terms: ['global', 'world', 'international', 'developed markets'] },
      { label: 'US influence', terms: ['us', 's&p', 'america', 'wall street'] },
      { label: 'currency', terms: ['currency', 'aud', 'usd', 'exchange rate'] },
      { label: 'regional concentration', terms: ['region', 'country', 'japan', 'europe', 'uk'] },
    ],
  },
  IOO: {
    expected: [
      { label: 'mega-cap companies', terms: ['mega', 'large companies', 'apple', 'microsoft', 'nvidia', 'amazon'] },
      { label: 'technology exposure', terms: ['technology', 'tech', 'ai', 'software', 'chip'] },
      { label: 'currency', terms: ['currency', 'aud', 'usd', 'exchange rate'] },
      { label: 'concentration', terms: ['concentrated', 'concentration', 'top holdings', 'only 100'] },
    ],
  },
  VAS: {
    expected: [
      { label: 'Australian market', terms: ['australia', 'asx', 'australian market'] },
      { label: 'banks or miners', terms: ['bank', 'banks', 'miner', 'miners', 'resources', 'commodity', 'iron ore'] },
      { label: 'RBA or local economy', terms: ['rba', 'inflation', 'rates', 'housing', 'jobs', 'china'] },
      { label: 'comparison with global ETFs', terms: ['ivv', 'vgs', 'global', 'us market'] },
    ],
  },
  A200: {
    expected: [
      { label: 'Australian market', terms: ['australia', 'asx', 'australian market'] },
      { label: 'banks or miners', terms: ['bank', 'banks', 'miner', 'miners', 'resources', 'commodity', 'iron ore'] },
      { label: 'RBA or local economy', terms: ['rba', 'inflation', 'rates', 'housing', 'jobs', 'china'] },
      { label: 'comparison with VAS', terms: ['vas', 'similar', 'same market', 'overlap'] },
    ],
  },
  VAF: {
    expected: [
      { label: 'bond yields', terms: ['bond', 'bonds', 'yield', 'yields'] },
      { label: 'interest rates', terms: ['rate', 'rates', 'interest', 'rba'] },
      { label: 'inflation', terms: ['inflation', 'cpi'] },
      { label: 'defensive assets', terms: ['defensive', 'shares', 'diversification', 'less risky'] },
    ],
  },
  NDQ: {
    expected: [
      { label: 'technology stocks', terms: ['tech', 'technology', 'ai', 'software', 'chip', 'nvidia'] },
      { label: 'growth stock sensitivity', terms: ['growth', 'valuation', 'expensive', 'rates', 'interest'] },
      { label: 'concentration', terms: ['concentrated', 'concentration', 'nasdaq', 'top holdings'] },
      { label: 'comparison with broader ETFs', terms: ['ivv', 'vgs', 'broader', 'broad market'] },
    ],
  },
  VDHG: {
    expected: [
      { label: 'diversified mix', terms: ['diversified', 'mix', 'portfolio', 'allocation'] },
      { label: 'shares and bonds', terms: ['shares', 'bonds', 'equities', 'fixed interest'] },
      { label: 'currency', terms: ['currency', 'aud', 'usd', 'exchange rate'] },
      { label: 'which part moved', terms: ['global', 'australian', 'international', 'bond'] },
    ],
  },
};

const defaultMovementPromptGroup = {
  title: 'Market movement',
  prompts: [
    'Did the overall market move, or was this specific to the investment?',
    'Was there company, sector, interest-rate, inflation, currency, or earnings news?',
    'Did this move more or less than similar investments?',
    'What would I check before assuming I know the reason?',
  ],
};

const defaultMovementReviewRule = {
  expected: [
    { label: 'market vs specific cause', terms: ['market', 'sector', 'company', 'specific'] },
    { label: 'macro factor', terms: ['rates', 'inflation', 'currency', 'earnings'] },
    { label: 'comparison', terms: ['compared', 'similar', 'relative', 'more than', 'less than'] },
  ],
};

const suggestedResearchIdeas = [
  {
    id: 'idea-ivv',
    ticker: 'IVV',
    name: 'iShares S&P 500 ETF',
    thesis: 'Core US market exposure. Good research question: what does owning 500 large US companies teach me about diversification?',
    risk: 'US market and currency risk. A strong recent run can make future returns less predictable.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 70.35,
    units: 0,
  },
  {
    id: 'idea-vas',
    ticker: 'VAS',
    name: 'Vanguard Australian Shares Index ETF',
    thesis: 'Broad Australian share market exposure. Useful for comparing home-market investing with global investing.',
    risk: 'Australia is concentrated in banks and resources, so it is less diversified than it first looks.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 106.77,
    units: 0,
  },
  {
    id: 'idea-vgs',
    ticker: 'VGS',
    name: 'Vanguard MSCI Index International Shares ETF',
    thesis: 'Developed-world international shares. Good research question: how does global diversification change risk?',
    risk: 'Currency movements and global market falls can still hurt returns.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 156.49,
    units: 0,
  },
  {
    id: 'idea-vdhg',
    ticker: 'VDHG',
    name: 'Vanguard Diversified High Growth Index ETF',
    thesis: 'An all-in-one diversified growth ETF. Useful for learning how a premixed portfolio is built.',
    risk: 'Still share-heavy, so it can fall sharply. Also worth researching whether the mix suits the investor.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 75.62,
    units: 0,
  },
  {
    id: 'idea-vaf',
    ticker: 'VAF',
    name: 'Vanguard Australian Fixed Interest Index ETF',
    thesis: 'Bond exposure for learning how defensive assets behave differently from shares.',
    risk: 'Interest rate changes can move bond prices, and returns may be lower than shares over long periods.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 45.52,
    units: 0,
  },
  {
    id: 'idea-ndq',
    ticker: 'NDQ',
    name: 'Betashares Nasdaq 100 ETF',
    thesis: 'Technology-heavy US growth exposure. Useful for studying concentration, hype, and valuation risk.',
    risk: 'More concentrated and volatile than broad-market ETFs, with sector and currency risk.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 62.07,
    units: 0,
  },
  {
    id: 'idea-a200',
    ticker: 'A200',
    name: 'Betashares Australia 200 ETF',
    thesis: 'Low-cost Australian market exposure. Useful comparison against VAS.',
    risk: 'Similar home-market concentration issues to other Australian broad-market ETFs.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 144.03,
    units: 0,
  },
  {
    id: 'idea-ioo',
    ticker: 'IOO',
    name: 'iShares Global 100 ETF',
    thesis: 'A focused basket of large global companies. Useful for comparing global blue chips with broad index funds.',
    risk: 'Only 100 companies, so it is less diversified than broader global ETFs.',
    reviewDate: '2026-08-28',
    status: 'Watching',
    buyPrice: 0,
    currentPrice: 196.28,
    units: 0,
  },
];

function mergeResearchIdeas(watchlist) {
  const starterIdeasByTicker = new Map(suggestedResearchIdeas.map((item) => [item.ticker, item]));
  const watchlistWithPrices = watchlist.map((item) => {
    const starterIdea = starterIdeasByTicker.get(item.ticker.toUpperCase());

    if (!starterIdea || Number(item.currentPrice) > 0) {
      return item;
    }

    return { ...item, currentPrice: starterIdea.currentPrice };
  });

  const existingTickers = new Set(watchlistWithPrices.map((item) => item.ticker.toUpperCase()));
  const missingIdeas = suggestedResearchIdeas.filter((item) => !existingTickers.has(item.ticker));
  return [...watchlistWithPrices, ...missingIdeas];
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  return `${Number(value).toFixed(2)}%`;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getChartData(priceHistory = []) {
  return [...priceHistory]
    .reverse()
    .map((snapshot) => ({
      date: formatShortDate(snapshot.checkedAt),
      price: Number(snapshot.price),
    }));
}

function getMovementPromptGroup(ticker) {
  return movementPromptGroups[ticker.toUpperCase()] ?? defaultMovementPromptGroup;
}

function reviewMovementExplanation(item) {
  const explanation = (item.movementExplanation ?? '').trim();

  if (!explanation) {
    return {
      strengths: [],
      suggestions: ['Write a short explanation first. It can include what you are unsure about.'],
    };
  }

  const text = explanation.toLowerCase();
  const rules = movementReviewRules[item.ticker.toUpperCase()] ?? defaultMovementReviewRule;
  const matched = rules.expected.filter((rule) => rule.terms.some((term) => text.includes(term)));
  const missing = rules.expected.filter((rule) => !rule.terms.some((term) => text.includes(term)));
  const strengths = matched.map((rule) => `Good: you considered ${rule.label}.`);
  const suggestions = missing.slice(0, 2).map((rule) => `Check next: did ${rule.label} matter?`);

  if (explanation.length < 40) {
    suggestions.unshift('Add one more sentence explaining why you think that factor mattered.');
  }

  if (!text.includes('check') && !text.includes('source') && !text.includes('unsure') && !text.includes('maybe')) {
    suggestions.push('Good research habit: add what source you would check next, or say what you are unsure about.');
  }

  return {
    strengths,
    suggestions,
  };
}

function App() {
  const [watchlist, setWatchlist] = useState(() => {
    const savedWatchlist = localStorage.getItem(watchlistStorageKey);

    if (!savedWatchlist) {
      return mergeResearchIdeas(startingWatchlist);
    }

    try {
      const parsedWatchlist = JSON.parse(savedWatchlist);
      return Array.isArray(parsedWatchlist) ? mergeResearchIdeas(parsedWatchlist) : mergeResearchIdeas(startingWatchlist);
    } catch {
      return mergeResearchIdeas(startingWatchlist);
    }
  });
  const [form, setForm] = useState(emptyForm);
  const [marketStatus, setMarketStatus] = useState('Ready to fetch delayed ASX ETF prices.');

  useEffect(() => {
    localStorage.setItem(watchlistStorageKey, JSON.stringify(watchlist));
  }, [watchlist]);

  const summary = useMemo(() => {
    const rows = watchlist.map((item) => {
      const invested = Number(item.buyPrice || 0) * Number(item.units || 0);
      const value = Number(item.currentPrice || 0) * Number(item.units || 0);
      return { ...item, invested, value, gain: value - invested };
    });

    const totalInvested = rows.reduce((sum, item) => sum + item.invested, 0);
    const currentValue = rows.reduce((sum, item) => sum + item.value, 0);
    const sorted = [...rows].sort((a, b) => b.gain - a.gain);

    return {
      rows,
      totalInvested,
      currentValue,
      totalGain: currentValue - totalInvested,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
    };
  }, [watchlist]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addCompany(event) {
    event.preventDefault();

    const nextItem = {
      id: Date.now(),
      ticker: form.ticker.trim().toUpperCase(),
      name: form.name.trim(),
      thesis: form.thesis.trim(),
      risk: form.risk.trim(),
      reviewDate: form.reviewDate,
      status: form.status,
      buyPrice: Number(form.buyPrice || 0),
      currentPrice: Number(form.currentPrice || 0),
      units: Number(form.units || 0),
    };

    if (!nextItem.ticker || !nextItem.name) return;

    setWatchlist((current) => [nextItem, ...current]);
    setForm(emptyForm);
  }

  function updateResearchAnswer(itemId, field, value) {
    setWatchlist((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              research: {
                ...(item.research ?? {}),
                [field]: value,
              },
            }
          : item
      )
    );
  }

  function updateMovementExplanation(itemId, value) {
    setWatchlist((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              movementExplanation: value,
            }
          : item
      )
    );
  }

  async function refreshMarketPrices() {
    setMarketStatus('Fetching delayed market prices...');

    try {
      const response = await fetch('/api/quotes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not fetch market prices.');
      }

      const quotesByTicker = new Map(data.quotes.map((quote) => [quote.ticker, quote]));

      setWatchlist((current) =>
        current.map((item) => {
          const quote = quotesByTicker.get(item.ticker.toUpperCase());

          if (!quote || !quote.price) {
            return item;
          }

          const previousSnapshot = item.priceHistory?.[0];
          const previousPrice = previousSnapshot?.price ?? Number(item.currentPrice || 0);
          const latestPrice = Number(quote.price);
          const changeSinceLastCheck = previousPrice ? latestPrice - previousPrice : 0;
          const changePercentSinceLastCheck = previousPrice ? (changeSinceLastCheck / previousPrice) * 100 : 0;
          const nextSnapshot = {
            checkedAt: data.checkedAt,
            price: latestPrice,
            previousPrice,
            change: changeSinceLastCheck,
            changePercent: changePercentSinceLastCheck,
            marketChange: quote.change,
            marketChangePercent: quote.changePercent,
            currency: quote.currency,
          };

          return {
            ...item,
            currentPrice: latestPrice,
            marketQuote: {
              checkedAt: data.checkedAt,
              previousClose: quote.previousClose,
              change: quote.change,
              changePercent: quote.changePercent,
              currency: quote.currency,
              marketTime: quote.marketTime,
            },
            priceHistory: [nextSnapshot, ...(item.priceHistory ?? [])].slice(0, 20),
          };
        })
      );

      setMarketStatus(`Updated ${data.quotes.length} delayed quote snapshots.`);
    } catch (error) {
      setMarketStatus(error instanceof Error ? error.message : 'Could not fetch market prices.');
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Gray's Investment Lab</p>
          <h1>Build investment judgement before real money is involved.</h1>
          <p className="intro">
            Track ideas, write down your thesis, simulate positions, and compare what you expected with what actually happened.
          </p>
          <p className="data-note">ETF prices are delayed research snapshots entered manually, not live trading data.</p>
          <div className="market-actions">
            <button type="button" onClick={refreshMarketPrices}>Update market prices</button>
            <span>{marketStatus}</span>
          </div>
        </div>
      </section>

      <section className="dashboard" aria-label="Portfolio summary">
        <article>
          <span>Total pretend invested</span>
          <strong>{money(summary.totalInvested)}</strong>
        </article>
        <article>
          <span>Current pretend value</span>
          <strong>{money(summary.currentValue)}</strong>
        </article>
        <article>
          <span>Total gain/loss</span>
          <strong className={summary.totalGain >= 0 ? 'positive' : 'negative'}>{money(summary.totalGain)}</strong>
        </article>
        <article>
          <span>Best / worst</span>
          <strong>{summary.best?.ticker ?? '-'} / {summary.worst?.ticker ?? '-'}</strong>
        </article>
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={addCompany}>
          <div className="section-heading">
            <p className="eyebrow">Watchlist</p>
            <h2>Add an idea</h2>
          </div>

          <label>
            Ticker
            <input value={form.ticker} onChange={(event) => updateForm('ticker', event.target.value)} placeholder="VTI" />
          </label>

          <label>
            Company or ETF name
            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Vanguard Total Stock Market ETF" />
          </label>

          <label>
            Why interested?
            <textarea value={form.thesis} onChange={(event) => updateForm('thesis', event.target.value)} placeholder="What do you think could go right?" />
          </label>

          <label>
            Main risk
            <textarea value={form.risk} onChange={(event) => updateForm('risk', event.target.value)} placeholder="What could make this a bad idea?" />
          </label>

          <div className="form-grid">
            <label>
              Review date
              <input type="date" value={form.reviewDate} onChange={(event) => updateForm('reviewDate', event.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                <option>Watching</option>
                <option>Researching</option>
                <option>Simulated</option>
                <option>Passed</option>
              </select>
            </label>
          </div>

          <div className="form-grid three">
            <label>
              Fake buy price
              <input type="number" min="0" step="0.01" value={form.buyPrice} onChange={(event) => updateForm('buyPrice', event.target.value)} />
            </label>
            <label>
              Current price
              <input type="number" min="0" step="0.01" value={form.currentPrice} onChange={(event) => updateForm('currentPrice', event.target.value)} />
            </label>
            <label>
              Units
              <input type="number" min="0" step="0.01" value={form.units} onChange={(event) => updateForm('units', event.target.value)} />
            </label>
          </div>

          <button type="submit">Add to watchlist</button>
        </form>

        <section className="panel list-panel">
          <div className="section-heading">
            <p className="eyebrow">Pretend portfolio</p>
            <h2>Current ideas</h2>
          </div>

          <div className="positions">
            {summary.rows.map((item) => (
              <article className="position" key={item.id}>
                <div className="position-header">
                  <div>
                    <strong>{item.ticker}</strong>
                    <span>{item.name}</span>
                  </div>
                  <em>{item.status}</em>
                </div>
                <p><b>Thesis:</b> {item.thesis || 'No thesis written yet.'}</p>
                <p><b>Risk:</b> {item.risk || 'No risk written yet.'}</p>
                {item.marketQuote && (
                  <div className="market-move">
                    <span>Latest market move</span>
                    <strong className={Number(item.marketQuote.change) >= 0 ? 'positive' : 'negative'}>
                      {money(Number(item.marketQuote.change || 0))} ({percent(item.marketQuote.changePercent)})
                    </strong>
                    <p>
                      Previous close: {money(Number(item.marketQuote.previousClose || 0))}. Use this as a clue, then research what may have moved the market.
                    </p>
                  </div>
                )}
                <div className="price-chart">
                  <div className="price-chart-header">
                    <span>Price trend</span>
                    <strong>{item.priceHistory?.length ?? 0} saved checks</strong>
                  </div>
                  {item.priceHistory?.length > 1 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={getChartData(item.priceHistory)} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#e5decd" strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: '#667064', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis
                          domain={['dataMin', 'dataMax']}
                          tick={{ fill: '#667064', fontSize: 12 }}
                          tickFormatter={(value) => Number(value).toFixed(2)}
                          tickLine={false}
                          axisLine={false}
                          width={54}
                        />
                        <Tooltip formatter={(value) => money(Number(value))} labelStyle={{ color: '#17211b' }} />
                        <Line type="monotone" dataKey="price" stroke="#1f6f4a" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Click Update market prices on different days to build a visible trend.</p>
                  )}
                </div>
                {item.priceHistory?.length > 0 && (
                  <details className="price-history">
                    <summary>Price history</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>Checked</th>
                          <th>Price</th>
                          <th>Since last check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.priceHistory.slice(0, 5).map((snapshot) => (
                          <tr key={`${item.id}-${snapshot.checkedAt}`}>
                            <td>{formatDateTime(snapshot.checkedAt)}</td>
                            <td>{money(snapshot.price)}</td>
                            <td className={Number(snapshot.change) >= 0 ? 'positive' : 'negative'}>
                              {money(snapshot.change)} ({percent(snapshot.changePercent)})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
                <details className="movement-prompts">
                  <summary>What might explain this move?</summary>
                  <div>
                    <p>{getMovementPromptGroup(item.ticker).title}</p>
                    <ul>
                      {getMovementPromptGroup(item.ticker).prompts.map((prompt) => (
                        <li key={prompt}>{prompt}</li>
                      ))}
                    </ul>
                    <label className="movement-explanation">
                      <span>My explanation</span>
                      <textarea
                        value={item.movementExplanation ?? ''}
                        onChange={(event) => updateMovementExplanation(item.id, event.target.value)}
                        placeholder="Write what you think caused the latest move. It is okay to be unsure; write what you would check next."
                      />
                    </label>
                    <div className="explanation-review">
                      <div>
                        <span>Looks good</span>
                        <ul>
                          {(reviewMovementExplanation(item).strengths.length > 0
                            ? reviewMovementExplanation(item).strengths
                            : ['No strong signals yet. Try naming one market factor.']
                          ).map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span>Check next</span>
                        <ul>
                          {reviewMovementExplanation(item).suggestions.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </details>
                <details className="research-checklist">
                  <summary>Research checklist</summary>
                  <div className="research-fields">
                    {researchChecklist.map((question) => (
                      <label className="research-field" key={question.key}>
                        <span>{question.label}</span>
                        <textarea
                          value={item.research?.[question.key] ?? ''}
                          onChange={(event) => updateResearchAnswer(item.id, question.key, event.target.value)}
                          placeholder={question.prompt}
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <dl>
                  <div><dt>Review</dt><dd>{item.reviewDate || 'Not set'}</dd></div>
                  <div><dt>Invested</dt><dd>{money(item.invested)}</dd></div>
                  <div><dt>Value</dt><dd>{money(item.value)}</dd></div>
                  <div><dt>Gain/loss</dt><dd className={item.gain >= 0 ? 'positive' : 'negative'}>{money(item.gain)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
