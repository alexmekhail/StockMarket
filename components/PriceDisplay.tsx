import { formatPrice, formatChange, formatChangePercent, isPositiveChange } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  change: number;
  changePercent: number;
  size?: 'sm' | 'md' | 'lg';
  showChange?: boolean;
}

export function PriceDisplay({
  price,
  change,
  changePercent,
  size = 'md',
  showChange = true,
}: PriceDisplayProps) {
  const positive = isPositiveChange(change);
  const color = positive ? 'text-gain' : 'text-loss';

  const priceClass = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-4xl',
  }[size];

  const changeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  }[size];

  return (
    <div className="flex items-baseline gap-2 font-mono">
      <span className={`${priceClass} font-semibold text-text-primary`}>
        {formatPrice(price)}
      </span>
      {showChange && (
        <span className={`${changeClass} ${color}`}>
          {formatChange(change)} ({formatChangePercent(changePercent)})
        </span>
      )}
    </div>
  );
}
