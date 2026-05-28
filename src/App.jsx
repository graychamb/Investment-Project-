import { useEffect, useMemo, useState } from 'react';

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
