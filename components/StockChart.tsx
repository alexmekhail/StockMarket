'use client';

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { ChartDataPoint } from '@/types';

interface StockChartProps {
  data: ChartDataPoint[];
  isPositive?: boolean;
  loading?: boolean;
}

export function StockChart({ data, isPositive = true, loading = false }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const pendingDataRef = useRef<ChartDataPoint[] | null>(null);

  // Create chart once on mount — div is always in DOM so containerRef is never null
  useEffect(() => {
    if (!containerRef.current) return;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (cancelled || !containerRef.current || chartRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#111111' },
          textColor: '#666666',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#1f1f1f' },
          horzLines: { color: '#1f1f1f' },
        },
        crosshair: {
          vertLine: { color: '#444444', style: 1 },
          horzLine: { color: '#444444', style: 1 },
        },
        rightPriceScale: { borderColor: '#2a2a2a' },
        timeScale: { borderColor: '#2a2a2a', timeVisible: true, secondsVisible: false },
        // Fall back to 800 if layout hasn't painted yet
        width: containerRef.current.clientWidth || 800,
        height: 400,
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      });

      const series = chart.addLineSeries({
        color: isPositive ? '#22c55e' : '#ef4444',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // Flush data that arrived before chart was ready
      if (pendingDataRef.current && pendingDataRef.current.length > 0) {
        series.setData(pendingDataRef.current as { time: UTCTimestamp; value: number }[]);
        chart.timeScale().fitContent();
        pendingDataRef.current = null;
      }

      ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data/color whenever props change
  useEffect(() => {
    if (data.length === 0) return;
    const sorted = [...data].sort((a, b) => a.time - b.time);

    if (seriesRef.current && chartRef.current) {
      seriesRef.current.applyOptions({ color: isPositive ? '#22c55e' : '#ef4444' });
      seriesRef.current.setData(sorted as { time: UTCTimestamp; value: number }[]);
      chartRef.current.timeScale().fitContent();
    } else {
      // Queue until chart is ready
      pendingDataRef.current = sorted;
    }
  }, [data, isPositive]);

  // Always render the div so containerRef is valid on mount.
  // Show a loading overlay instead of conditionally hiding the div.
  return (
    <div className="relative w-full h-[400px]">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 bg-bg-secondary flex items-center justify-center z-10">
          <span className="text-text-muted text-sm font-mono animate-pulse">Loading chart…</span>
        </div>
      )}
      {!loading && data.length === 0 && (
        <div className="absolute inset-0 bg-bg-secondary flex items-center justify-center z-10">
          <span className="text-text-muted text-sm font-mono">No chart data available</span>
        </div>
      )}
    </div>
  );
}
