import React from 'react'
import { motion } from 'motion/react'
import { Trash2, FileText } from 'lucide-react'
import type { ApoliceRecord } from '../types'
import { getStatusBadgeStyle } from '../utils/status'

type Props = {
  policies: ApoliceRecord[]
  colors: any
  isDarkMode: boolean
  onView: (id: string) => void
  onEdit: (id: string) => void
  onOpenDeleteConfirm: (id: string) => void
}

// using getStatusBadgeStyle from utils/status

export default function InsuranceList({ policies, colors, isDarkMode, onView, onEdit, onOpenDeleteConfirm }: Props) {
  return (
    <tbody>
      {policies?.map((policy, index) => (
        <tr key={index} className="border-b h-12 hover:bg-gray-50 dark:hover:bg-[#1A1F2E]" style={{ borderColor: colors.cardBorder }}>
          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 400 }}>{policy.luc}</td>
          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 400 }}>{policy.fantasia}</td>
          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 400 }}>{policy.segmento}</td>
          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 400 }}>{policy.seguradora}</td>
          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 400 }}>{policy.vigencia}</td>
          <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 400 }}>{policy.vencimento}</td>
          <td className="px-4 py-3" style={{ minWidth: '110px' }}>
            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap" style={getStatusBadgeStyle(policy.status, colors)}>
              {policy.status}
            </span>
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <motion.button onClick={() => onView(policy.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded" style={{ color: colors.brandRed, borderColor: colors.brandRed }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                <FileText className="w-3 h-3" strokeWidth={1.5} />
                Ver
              </motion.button>

              <motion.button onClick={() => onEdit(policy.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded" style={{ color: colors.brandMaroon, borderColor: colors.brandMaroon }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                <FileText className="w-3 h-3" strokeWidth={1.5} />
                Editar
              </motion.button>

              <motion.button onClick={() => onOpenDeleteConfirm(policy.id)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded" style={{ color: colors.brandRed, borderColor: `${colors.brandRed}66` }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                Excluir
              </motion.button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  )
}
