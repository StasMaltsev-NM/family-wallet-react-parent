
import React from 'react';
import { Child } from '../types';
import { Plus } from 'lucide-react';
import { GenderIcon } from './GenderIcon';

interface Props {
  children: Child[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  childPurchases: Record<string, any[]>;
}

const ChildSwitcher: React.FC<Props> = ({ children, selectedId, onSelect, onAdd, childPurchases }) => {
  return (
    <div className="child-switcher flex w-full max-w-full overflow-x-auto overflow-y-visible no-scrollbar items-center pt-2 pb-2 snap-x snap-mandatory">
      {children.map(child => {
        const isSelected = child.id === selectedId;
        
        // Реальные покупки из API
        const apiChildId = (child as any).apiChildId || child.id;
        const pendingPurchases = childPurchases[apiChildId]?.filter((p: any) => p.status === "pending").length ?? 0;
        
        const hasNotification = 
          pendingPurchases > 0 || 
          child.missions.some(m => m.status === 'pending');


        return (
          <button
            key={child.id}
            onClick={() => onSelect(child.id)}
            className={`child-switcher-item flex flex-col items-center gap-3 transition-all duration-300 flex-shrink-0 snap-center first:ml-1 last:mr-1 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
          >
            {/* Внешний контейнер (Кольцо Уведомления - Желтое) */}
            <div className={`child-switcher-avatar relative rounded-full flex items-center justify-center transition-all duration-500
              ${hasNotification ? 'ring-[3px] ring-amber-400 animate-pulse' : 'ring-1 ring-white/5'}
              ${isSelected ? 'opacity-100 scale-100' : 'scale-90'}
            `}>
              
              {/* Внутренний контейнер (Кольцо Выбора - Фиолетовое) */}
              <div className={`w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full flex items-center justify-center transition-all duration-500
                ${isSelected ? 'ring-[3px] ring-[var(--primary)]' : ''}
              `}>
                
                {/* Аватар ребенка */}
                <div className={`w-[calc(100%-6px)] h-[calc(100%-6px)] rounded-full overflow-hidden flex items-center justify-center transition-opacity duration-500
                  ${isSelected ? '' : 'opacity-50'}
                `}>
                  <GenderIcon 
                    gender={child.gender || 'male'} 
                    size={48}
                  />
                </div>
              </div>
            </div>
            
            <span className={`child-switcher-label font-black uppercase tracking-widest transition-colors duration-300 ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
              {child.name}
            </span>
          </button>
        );
      })}
      
      <div className="flex flex-col items-center gap-3 flex-shrink-0 snap-center child-switcher-item">
        <button 
          onClick={onAdd}
          className="child-switcher-add rounded-full border-[3px] border-dashed border-[var(--text-muted)]/30 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
        >
          <Plus size={30} />
        </button>
        <span
          aria-hidden="true"
          className="child-switcher-label font-black uppercase tracking-widest opacity-0 select-none pointer-events-none"
        >
          ADD
        </span>
      </div>
    </div>
  );
};

export default ChildSwitcher;
