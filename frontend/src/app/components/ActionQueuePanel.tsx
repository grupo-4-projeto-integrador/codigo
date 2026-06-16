import { useEffect, useState } from "react";
import { getFilaDeAcao } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { Clock, AlertTriangle, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ActionQueuePanelProps {
  onSelectLuc: (luc: string) => void;
  isPresentationMode?: boolean;
}

function SortableQueueItem({ item, index, isLast, onSelectLuc }: { item: ApoliceRecord, index: number, isLast: boolean, onSelectLuc: (luc: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id || item.luc });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  const isVencida = item.dias_restantes !== undefined && item.dias_restantes < 0;
  const daysText = isVencida 
    ? `Vencida há ${Math.abs(item.dias_restantes!)} dias` 
    : `Vence em ${item.dias_restantes} dias`;
  
  const val = Number((item as any).cobertura) || 0;
  let formattedVal = "R$ 0,00";
  if (val >= 1000000) {
    formattedVal = `R$ ${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KK`;
  } else if (val >= 1000) {
    formattedVal = `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} K`;
  } else {
    formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  const lucStr = item.id || item.luc;
  const lojaStr = item.lojista || item.fantasia || "Loja";

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`action-queue-item group flex items-center px-3 py-1.5 gap-2 border-b border-gray-50 bg-white hover:bg-gray-50 transition-colors text-left dark:border-[#222222] dark:bg-[#151515] dark:hover:bg-[#1f1f1f] ${isLast ? 'border-b-0' : ''} ${isDragging ? 'shadow-md opacity-90' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="w-4 h-full flex items-center justify-center cursor-grab text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Arrastar para reordenar"
      >
        <span className="text-[12px] leading-none mb-1">⠿</span>
      </div>
      
      <div className="font-bold text-gray-400 dark:text-[#64748B] text-[10px] w-3 text-center">{index + 1}</div>
      
      <div className={`relative z-[1] flex-shrink-0 bg-white group-hover:bg-gray-50 dark:bg-[#151515] dark:group-hover:bg-[#1f1f1f] ${isVencida ? 'text-[#D93030]' : 'text-orange-500'}`}>
        <Clock className="w-3 h-3" />
      </div>
      
      <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => onSelectLuc(lucStr)}>
        <div className="flex flex-col gap-0.5">
          <div className={`mb-0.5 ${isVencida ? 'text-[#c4151f] text-[11px] font-normal normal-case tracking-normal' : 'text-orange-500 text-[12px] font-bold uppercase tracking-wide'}`}>
            {daysText}
          </div>
          <span className="font-bold text-[11px] text-gray-900 dark:text-white leading-tight break-words uppercase">{lojaStr}</span>
          <span className="text-[9px] text-gray-500 dark:text-[#94A3B8] leading-tight break-words font-medium">{lucStr}</span>
        </div>
      </div>
      
      <div className="font-bold text-[11px] text-gray-900 whitespace-nowrap dark:text-white flex-shrink-0 cursor-pointer" onClick={() => onSelectLuc(lucStr)}>
        {formattedVal}
      </div>
    </div>
  );
}

export function ActionQueuePanel({ onSelectLuc, isPresentationMode = false }: ActionQueuePanelProps) {
  const [items, setItems] = useState<ApoliceRecord[]>([]);
  const [originalItems, setOriginalItems] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const cssStyles = (
    <style>{`
      @media (min-width: 1024px) and (max-width: 1440px) {
        .action-queue-card {
          max-height: none !important;
        }
      }
    `}</style>
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = async () => {
    setLoading(true);
    try {
      let data = await getFilaDeAcao();
      data = data.slice(0, 4);
      setOriginalItems([...data]);

      const storedOrder = localStorage.getItem('actionQueueOrder');
      if (storedOrder) {
        try {
          const orderIds = JSON.parse(storedOrder);
          data.sort((a, b) => {
            const idA = a.id || a.luc;
            const idB = b.id || b.luc;
            const indexA = orderIds.indexOf(idA);
            const indexB = orderIds.indexOf(idB);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
          });
        } catch (e) {
          console.error(e);
        }
      }

      setItems(data);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => (item.id || item.luc) === active.id);
        const newIndex = items.findIndex((item) => (item.id || item.luc) === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('actionQueueOrder', JSON.stringify(newItems.map(i => i.id || i.luc)));
        return newItems;
      });
    }
  };

  const handleRestore = () => {
    localStorage.removeItem('actionQueueOrder');
    setItems([...originalItems]);
  };

  const isManualOrderActive = !!localStorage.getItem('actionQueueOrder');
  const hasInversion = items.some((item, i) => {
    return items.slice(i + 1).some(lowerItem => (Number(lowerItem.cobertura) || 0) > (Number(item.cobertura) || 0));
  });
  const showWarning = isManualOrderActive && hasInversion;

  if (isPresentationMode) {
    return (
      <div className="flex flex-col gap-3 h-full">
        {loading ? (
          <div className="animate-pulse h-full bg-gray-100 dark:bg-white/5 rounded-lg" />
        ) : (
          items.map((item) => {
            const isVencida = item.dias_restantes !== undefined && item.dias_restantes < 0;
            const daysText = isVencida 
              ? `Vencida há ${Math.abs(item.dias_restantes!)} dias` 
              : `Vence em ${item.dias_restantes} dias`;
            const val = Number((item as any).cobertura) || 0;
            let formattedVal = "R$ 0,00";
            if (val >= 1000) {
              formattedVal = `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
            } else {
              formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
            }
            const lojaStr = item.lojista || item.fantasia || item.luc;

            return (
              <div key={item.id || item.luc} className="flex items-center justify-between">
                <div>
                  <div className="text-gray-900 dark:text-white font-bold text-[14px]">{lojaStr}</div>
                  <div className="text-gray-500 dark:text-white/40 text-[11px] uppercase tracking-wider">{item.id || item.luc} • {daysText}</div>
                </div>
                <div className="text-[#D92D20] font-bold text-[14px]">{formattedVal}</div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {cssStyles}
      <motion.div
        key="action-queue"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="action-queue-card bg-white dark:bg-[#151515] rounded-xl border flex flex-col h-full shadow-sm dark:border-[#222222]"
      >
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between dark:border-[#222222]">
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-gray-900 dark:text-white text-[13px]">Fila de ação</h3>
          <span className="bg-[#8B1A1A] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {items.length}
          </span>
          <button
            onClick={showWarning ? handleRestore : undefined}
            className="ml-1 cursor-pointer transition-colors outline-none flex items-center justify-center"
            title={showWarning ? "Ordenação manual ativa — clique para restaurar automática" : "Ordem automática original"}
            style={{ color: showWarning ? '#BA7517' : 'rgba(255,255,255,0.3)' }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 justify-between relative before:content-[''] before:absolute before:left-[48px] before:top-[20px] before:bottom-[20px] before:w-[1px] before:border-l before:border-dashed before:border-[rgba(196,21,31,0.25)]">
        {loading && items.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8B1A1A]"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-[#94A3B8]">
            Nenhuma ação pendente no momento.
          </div>
        ) : (
          <>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id || i.luc)} strategy={verticalListSortingStrategy}>
                {items.map((item, index) => (
                  <SortableQueueItem 
                    key={item.id || item.luc} 
                    item={item} 
                    index={index} 
                    isLast={index === items.length - 1} 
                    onSelectLuc={onSelectLuc} 
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      <div className="py-1.5 px-3 mt-auto border-t border-gray-50 bg-gray-50/50 flex items-center justify-center gap-1.5 dark:border-[#222222] dark:bg-[#0a0a0a]/50 rounded-b-xl text-[8px] text-gray-500 dark:text-[#64748B] uppercase tracking-wider">
        <div className="w-1 h-1 rounded-full bg-[#168821]"></div>
        Atualizado {format(lastUpdate, "HH:mm")}
      </div>
      </motion.div>
    </AnimatePresence>
  );
}
