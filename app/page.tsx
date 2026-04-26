import { MarketOverview } from '@/components/MarketOverview';
import { StockHeatmap } from '@/components/StockHeatmap';
import { TopStories } from '@/components/TopStories';
import { PortfolioTable } from '@/components/PortfolioTable';

export default function DashboardPage() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Row 1: Market Overview (1/3) | Heatmap (2/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" style={{ minHeight: 560 }}>
        <div className="xl:col-span-1 min-h-0">
          <MarketOverview />
        </div>
        <div className="xl:col-span-2 min-h-0">
          <StockHeatmap />
        </div>
      </div>

      {/* Row 2: Top Stories (1/3) | Portfolio (2/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" style={{ minHeight: 420 }}>
        <div className="xl:col-span-1 min-h-0">
          <TopStories />
        </div>
        <div className="xl:col-span-2 min-h-0">
          <PortfolioTable />
        </div>
      </div>
    </div>
  );
}
