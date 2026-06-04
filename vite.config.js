import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import YahooFinance from 'yahoo-finance2';

const defaultSymbols = ['IVV.AX', 'VAS.AX', 'VGS.AX', 'VDHG.AX', 'VAF.AX', 'NDQ.AX', 'A200.AX', 'IOO.AX'];
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'investment-lab-market-api',
      configureServer(server) {
        server.middlewares.use('/api/quotes', async (request, response) => {
          try {
            const url = new URL(request.url ?? '', 'http://localhost');
            const symbols = (url.searchParams.get('symbols') ?? '')
              .split(',')
              .map((symbol) => symbol.trim().toUpperCase())
              .filter(Boolean);
            const requestedSymbols = symbols.length > 0 ? symbols : defaultSymbols;
            const quotes = await yahooFinance.quote(requestedSymbols);
            const quoteList = Array.isArray(quotes) ? quotes : [quotes];

            sendJson(response, 200, {
              checkedAt: new Date().toISOString(),
              quotes: quoteList.map((quote) => ({
                symbol: quote.symbol,
                ticker: quote.symbol.replace('.AX', ''),
                price: quote.regularMarketPrice ?? null,
                previousClose: quote.regularMarketPreviousClose ?? null,
                change: quote.regularMarketChange ?? null,
                changePercent: quote.regularMarketChangePercent ?? null,
                currency: quote.currency ?? 'AUD',
                marketTime: quote.regularMarketTime ?? null,
              })),
            });
          } catch (error) {
            sendJson(response, 500, {
              error: 'Could not fetch market quotes.',
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        });
      },
    },
  ],
});
