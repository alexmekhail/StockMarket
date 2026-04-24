import { Watchlist } from '@/components/Watchlist';
import { PortfolioTable } from '@/components/PortfolioTable';

export default function HomePage() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Hero search prompt */}
      <div className="mb-8 text-center py-8">
        <h1 className="font-mono text-2xl font-bold text-text-primary tracking-tight mb-2">
          Real-Time Market Terminal
        </h1>
        <p className="font-mono text-text-muted text-sm">
          Search any ticker above to view live prices, charts, and news.
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Portfolio — 2/3 width */}
        <div className="xl:col-span-2">
          <PortfolioTable />
        </div>

        {/* Watchlist — 1/3 width */}
        <div>
          <Watchlist />
        </div>
      </div>
    </div>
  );
}
