'use client';

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { ChartDataPoint } from '@/types';
import { ChartSkeleton } from './Skeleton';

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

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    let ro: ResizeObserver | null = null;

    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (!containerRef.current || chartRef.current) return;

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
          vertLine: { color: '#444444', width: 1, style: 1 },
          horzLine: { color: '#444444', width: 1, style: 1 },
        },
        rightPriceScale: { borderColor: '#2a2a2a' },
        timeScale: {
          borderColor: '#2a2a2a',
          timeVisible: true,
          secondsVisible: false,
        },
        width: containerRef.current.clientWidth,
        height: 400,
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      });

      const color = isPositive ? '#22c55e' : '#ef4444';
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lastValueVisible: true,
        priceLineVisible: false,
        lineType: 0,
      });

      chartRef.current = chart;
      seriesRef.current = series;

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
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data and series color when props change
  useEffect(() => {
    if (data.length === 0) return;

    if (seriesRef.current && chartRef.current) {
      seriesRef.current.applyOptions({
        color: isPositive ? '#22c55e' : '#ef4444',
      });
      seriesRef.current.setData(data as { time: UTCTimestamp; value: number }[]);
      chartRef.current.timeScale().fitContent();
    } else {
      pendingDataRef.current = data;
    }
  }, [data, isPositive]);

  if (loading) return <ChartSkeleton />;

  return <div ref={containerRef} className="w-full h-[400px]" />;
}
