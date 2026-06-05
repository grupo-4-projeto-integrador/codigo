import React from 'react';

export function SkeletonCard() {
  return (
    <div 
      className="relative bg-white dark:bg-[#242938] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]" 
      style={{ border: 'none' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="shimmer-effect h-[8px] w-24 rounded-sm" />
          
          <div className="mt-2 flex items-end gap-1 leading-none">
            <div className="shimmer-effect h-[28px] w-20 rounded-md" />
            <div className="shimmer-effect h-[14px] w-12 rounded-sm pb-1" />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="shimmer-effect h-[11px] w-28 rounded-sm" />
            <div className="shimmer-effect h-[11px] w-16 rounded-sm" />
          </div>
        </div>

        <div className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full shimmer-effect" />
      </div>

      <div className="mt-3 shimmer-effect h-[9px] w-36 rounded-sm" />

      <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)] h-[44px] shimmer-effect rounded-sm opacity-50" />
    </div>
  );
}
