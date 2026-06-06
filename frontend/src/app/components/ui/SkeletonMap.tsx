import React from 'react';

export function SkeletonMap() {
  return (
    <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222222] p-5 h-full flex flex-col relative overflow-hidden shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="shimmer-effect h-6 w-48 rounded-md" />
        <div className="shimmer-effect h-8 w-24 rounded-md" />
      </div>
      
      <div className="flex-1 overflow-auto min-h-0 pt-2">
        <div className="flex flex-col gap-8 min-w-[600px] h-full">
          {[1, 2, 3].map(floor => (
            <div key={floor} className="flex gap-4 items-center">
              <div className="shimmer-effect h-5 w-14 rounded-sm" />
              <div className="flex-1 grid grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map(sector => (
                  <div key={sector} className="aspect-square shimmer-effect rounded-[10px] opacity-[0.25]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
