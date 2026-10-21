import React from 'react';
import { Banknote } from 'lucide-react';

export type PaymentBadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Vibrant, modern Cash badge icon
 */
export const CashBadge: React.FC<{ size?: PaymentBadgeSize; showLabel?: boolean }> = ({
  size = 'sm',
  showLabel = false,
}) => {
  const boxSize = size === 'xs' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <span className="inline-flex items-center gap-1 select-none font-bold">
      <span className={`inline-flex items-center justify-center ${boxSize} rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs shrink-0`}>
        <Banknote className={iconSize} />
      </span>
      {showLabel && <span className="text-emerald-400">Cash</span>}
    </span>
  );
};

/**
 * Official Indian Unified Payments Interface (UPI) Logo Badge
 * Features the signature dual directional chevrons (green & orange)
 */
export const UpiBadge: React.FC<{ size?: PaymentBadgeSize; showLabel?: boolean }> = ({
  size = 'sm',
  showLabel = false,
}) => {
  const height = size === 'xs' ? 'h-2.5' : size === 'lg' ? 'h-4' : size === 'md' ? 'h-3.5' : 'h-3';
  const textClass = size === 'xs' ? 'text-[8.5px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';
  const padClass = size === 'xs' ? 'px-0.5 py-0.5' : 'px-1 py-0.5';

  return (
    <span className="inline-flex items-center gap-1 select-none font-bold">
      <span className={`inline-flex items-center gap-0.5 ${padClass} rounded bg-slate-900 border border-slate-700/80 shadow-xs shrink-0`}>
        {/* UPI Dual Directional Chevrons */}
        <svg
          viewBox="0 0 24 16"
          className={`${height} w-auto shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Orange Chevron (GPay / PhonePe / Paytm / BHIM) */}
          <path d="M3 2L10 8L3 14L6 8L3 2Z" fill="#FF7800" />
          {/* Green Chevron */}
          <path d="M9 2L16 8L9 14L12 8L9 2Z" fill="#00B074" />
        </svg>
        <span className={`${textClass} font-black tracking-tight font-sans leading-none flex items-center`}>
          <span className="text-[#00B074]">U</span>
          <span className="text-white">P</span>
          <span className="text-[#FF7800]">I</span>
        </span>
      </span>
      {showLabel && <span className="text-purple-300">UPI</span>}
    </span>
  );
};
