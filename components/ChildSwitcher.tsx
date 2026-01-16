
import React from 'react';
import { Child } from '../types';
import { Plus } from 'lucide-react';

interface Props {
  children: Child[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const ChildSwitcher: React.FC<Props> = ({ children, selectedId, onSelect, onAdd }) => {
  return (
    <div className="flex overflow-x-auto no-scrollbar gap-6 items-center pt-4 pb-6 px-5 -mx-5">
      {children.map(child => {
        const isSelected = child.id === selectedId;
        const hasNotification = 
          child.pendingPrizes.length > 0 || 
          child.missions.some(m => m.status === 'pending');

        return (
          <button
            key={child.id}
            onClick={() => onSelect(child.id)}
            className={`flex flex-col items-center gap-3 transition-all duration-300 flex-shrink-0 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
          >
            {/* Внешний контейнер (Кольцо Уведомления - Желтое) */}
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500
              ${hasNotification ? 'ring-[3px] ring-amber-400' : 'ring-1 ring-white/5'}
            `}>
              
              {/* Внутренний контейнер (Кольцо Выбора - Фиолетовое) */}
              <div className={`w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full flex items-center justify-center transition-all duration-500
                ${isSelected ? 'ring-[3px] ring-[var(--primary)]' : ''}
              `}>
                
                {/* Аватар ребенка */}
                <div className="w-[calc(100%-6px)] h-[calc(100%-6px)] rounded-full overflow-hidden">
                  <img 
                    src={child.avatar} 
                    alt={child.name} 
                    className={`w-full h-full object-cover bg-white/10 transition-all duration-500 
                      ${isSelected ? 'grayscale-0 opacity-100' : 'grayscale opacity-50'}`} 
                  />
                </div>
              </div>
            </div>
            
            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
              {child.name}
            </span>
          </button>
        );
      })}
      
      <button 
        onClick={onAdd}
        className="w-16 h-16 rounded-full border-[3px] border-dashed border-[var(--text-muted)]/30 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex-shrink-0 mb-7"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};

export default ChildSwitcher;
