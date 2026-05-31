import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

type Props = {
  colors: any
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (column: string) => void
}

export default function InsuranceTableHeader({ colors, sortColumn, sortDirection, onSort }: Props) {
  return (
    <thead className="bg-[#F7F8FA] dark:bg-[#1A1F2E]">
      <tr>
        <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>LUC</th>

        <th
          className="px-4 py-3 text-left cursor-pointer select-none"
          style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onClick={() => onSort('lojista')}
        >
          <div className="flex items-center gap-2">
            <span>Fantasia</span>
            {sortColumn === 'lojista' && (
              sortDirection === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              )
            )}
          </div>
        </th>

        <th
          className="px-4 py-3 text-left cursor-pointer select-none"
          style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onClick={() => onSort('tipo')}
        >
          <div className="flex items-center gap-2">
            <span>Segmento</span>
            {sortColumn === 'tipo' && (
              sortDirection === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              )
            )}
          </div>
        </th>

        <th
          className="px-4 py-3 text-left cursor-pointer select-none"
          style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onClick={() => onSort('seguradora')}
        >
          <div className="flex items-center gap-2">
            <span>Seguradora</span>
            {sortColumn === 'seguradora' && (
              sortDirection === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              )
            )}
          </div>
        </th>

        <th
          className="px-4 py-3 text-left cursor-pointer select-none"
          style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onClick={() => onSort('vigencia')}
        >
          <div className="flex items-center gap-2">
            <span>Vigência</span>
            {sortColumn === 'vigencia' && (
              sortDirection === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              )
            )}
          </div>
        </th>

        <th
          className="px-4 py-3 text-left text-[13px] font-bold cursor-pointer select-none"
          style={{ color: colors.brandMaroon }}
          onClick={() => onSort('vencimento')}
        >
          <div className="flex items-center gap-2">
            <span>Vencimento</span>
            {sortColumn === 'vencimento' && (
              sortDirection === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6B1420' }} strokeWidth={1.5} />
              )
            )}
          </div>
        </th>

        <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '110px' }}>Status</th>
        <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ações</th>
      </tr>
    </thead>
  )
}
