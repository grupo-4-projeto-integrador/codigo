import { useEffect, useState } from "react";
import { getFilaDeAcao } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { Clock, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

export interface ActionQueuePanelProps {
  onSelectLuc: (luc: string) => void;
}

export function ActionQueuePanel({ onSelectLuc }: ActionQueuePanelProps) {
  const [items, setItems] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getFilaDeAcao();
      setItems(data.slice(0, 3));
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to load fila de acao", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key="action-queue"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30, delay: 0.1 }}
        className="bg-white dark:bg-[#242938] rounded-xl border flex flex-col mb-4 shadow-sm dark:border-[#2E3447]"
      >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between dark:border-[#2E3447]">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Fila de ação</h3>
          <span className="bg-[#8B1A1A] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {items.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col relative before:content-[''] before:absolute before:left-[48px] before:top-[20px] before:bottom-[20px] before:w-[1px] before:border-l before:border-dashed before:border-[rgba(196,21,31,0.25)]">
        {loading && items.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8B1A1A]"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-[#94A3B8]">
            Nenhuma ação pendente no momento.
          </div>
        ) : (
          items.map((item, index) => {
            const isVencida = item.dias_restantes !== undefined && item.dias_restantes < 0;
            const daysText = isVencida 
              ? `Vencida há ${Math.abs(item.dias_restantes!)} dias` 
              : `Vence em ${item.dias_restantes} dias`;
            
            const val = Number((item as any).cobertura) || 0;
            let formattedVal = "R$ 0,00";
            if (val >= 1000000) {
              // 2.630.000 -> 2,630 KK
              formattedVal = `R$ ${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KK`;
            } else if (val >= 1000) {
              formattedVal = `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} K`;
            } else {
              formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
            }

            const lucStr = item.id || item.luc;
            const lojaStr = item.lojista || item.fantasia || "Loja";

            return (
              <button 
                key={lucStr}
                onClick={() => onSelectLuc(lucStr)}
                className={`group flex items-start p-3 gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left dark:border-[#2E3447] dark:hover:bg-[#2A3143] ${index === items.length - 1 ? 'border-b-0' : ''}`}
              >
                <div className="font-bold text-gray-400 dark:text-[#64748B] w-4 text-center mt-0.5">{index + 1}</div>
                
                <div className={`mt-0.5 relative z-[1] bg-white group-hover:bg-gray-50 dark:bg-[#242938] dark:group-hover:bg-[#2A3143] ${isVencida ? 'text-[#D93030]' : 'text-orange-500'} flex-shrink-0`}>
                  <Clock className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex flex-col gap-0.5">
                    <div className={`mb-0.5 ${isVencida ? 'text-[#c4151f] text-[11px] font-normal normal-case tracking-normal' : 'text-orange-500 text-[12px] font-bold uppercase tracking-wide'}`}>
                      {daysText}
                    </div>
                    <span className="font-bold text-[13px] text-gray-900 dark:text-white leading-snug break-words uppercase">{lojaStr}</span>
                    <span className="text-[11px] text-gray-500 dark:text-[#94A3B8] leading-snug break-words font-medium">{lucStr}</span>
                  </div>
                </div>
                
                <div className="font-bold text-sm text-gray-900 whitespace-nowrap dark:text-white flex-shrink-0 pt-0.5">
                  {formattedVal}
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="p-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-center gap-1.5 dark:border-[#2E3447] dark:bg-[#1A1F2E]/50 rounded-b-xl text-[10px] text-gray-500 dark:text-[#64748B]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#168821]"></div>
        Atualizado em {format(lastUpdate, "dd/MM/yyyy HH:mm")}
      </div>
      </motion.div>
    </AnimatePresence>
  );
}
