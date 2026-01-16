
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
    <div className="flex overflow-x-auto no-scrollbar gap-6 items-center pt-4 pb-8 px-5 -mx-5">
      {children.map(child => {
        const isSelected = child.id === selectedId;
        const hasNotification = 
          child.pendingPrizes.length > 0 || 
          child.missions.some(m => m.status === 'pending');

        return (
          <button
            key={child.id}
            onClick={() => onSelect(child.id)}
            className={`flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
          >
            {/* Внешний контейнер: Желтое неоновое кольцо (Уведомление) */}
            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500
              ${hasNotification ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.7)]' : 'ring-1 ring-white/5'}
            `}>
              
              {/* Внутреннее кольцо: Фиолетовое (Активный профиль) */}
              <div className={`w-full h-full rounded-full p-1 flex items-center justify-center transition-all duration-500
                ${isSelected ? 'ring-2 ring-[var(--primary)] shadow-[0_0_12px_var(--primary-glow)]' : ''}
              `}>
                
                {/* Аватар: Грейскейл только для неактивных */}
                <img 
                  src={child.avatar} 
                  alt={child.name} 
                  className={`w-full h-full rounded-full object-cover bg-white/10 transition-all duration-500 
                    ${isSelected ? 'grayscale-0 opacity-100' : 'grayscale opacity-50'}`} 
                />
              </div>
            </div>
            
            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
              {child.name}
            </span>
          </button>
        );
      })}
      
      <button 
        onClick={onAdd}
        className="w-14 h-14 rounded-full border-2 border-dashed border-[var(--text-muted)]/30 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex-shrink-0"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default ChildSwitcher;
