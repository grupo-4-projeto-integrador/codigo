import React from 'react';

export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222222] overflow-hidden shadow-sm flex flex-col h-[520px]">
      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[800px] text-left border-collapse">
          <thead className="bg-[#F7F8FA] dark:bg-[#0a0a0a]">
            <tr>
              {[1,2,3,4,5,6,7,8,9].map(i => (
                <th key={i} className="px-4 py-3"><div className="shimmer-effect h-3 w-16 rounded-sm opacity-60" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i} className="border-b h-14 border-gray-100 dark:border-[#222222]">
                {[1,2,3,4,5,6,7,8,9].map(j => (
                  <td key={j} className="px-4 py-3">
                    <div className="shimmer-effect h-4 w-full max-w-[120px] rounded-sm" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
