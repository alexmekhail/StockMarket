import { Watchlist } from '@/components/Watchlist';
import { PortfolioTable } from '@/components/PortfolioTable';
import { StockHeatmap } from '@/components/StockHeatmap';

export default function HomePage() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center py-4">
        <h1 className="font-mono text-xl font-bold text-text-primary tracking-tight mb-1">
          Real-Time Market Terminal
        </h1>
        <p className="font-mono text-text-muted text-xs">
          Search any ticker above · Sign in to track your watchlist &amp; portfolio
        </p>
      </div>

      {/* Heatmap — full width */}
      <StockHeatmap />

      {/* Portfolio + Watchlist side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PortfolioTable />
        </div>
        <div>
          <Watchlist />
        </div>
      </div>
    </div>
  );
}
