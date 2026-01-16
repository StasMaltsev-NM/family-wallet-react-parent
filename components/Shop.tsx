
import React, { useState } from 'react';
import { Child } from '../types';
import { PRIZES } from '../constants';
import { Plus, ShoppingCart, Lock, Box, Check } from 'lucide-react';

interface Props {
  allChildren: Child[];
}

const Shop: React.FC<Props> = ({ allChildren }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrize, setNewPrize] = useState({ name: '', cost: '', isOneTime: false });
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(allChildren.map(c => c.id));

  const toggleChildSelection = (id: string) => {
    setSelectedChildIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Магазин призов</h2>
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Чем порадовать ребенка?</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PRIZES.map(prize => (
          <div key={prize.id} className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border)] overflow-hidden flex flex-col group hover:-translate-y-1 transition-all">
            <div className="relative h-28">
              <img src={prize.image} alt={prize.name} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-white text-[8px] font-black uppercase">
                ${prize.cost}
              </div>
              {prize.isOneTime && (
                <div className="absolute top-2 left-2 p-1.5 bg-rose-500 rounded-lg text-white">
                  <Box size={10} />
                </div>
              )}
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h4 className="text-xs font-bold leading-tight mb-3 truncate">{prize.name}</h4>
              <button className="w-full py-2 bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-black uppercase rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all">
                Изменить
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-[2.5rem] p-8 border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold mb-6">Новая награда</h3>
            
            <div className="space-y-4 mb-6">
              {/* Выбор детей */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Для кого приз?</p>
                <div className="flex flex-wrap gap-2 py-1">
                  {allChildren.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleChildSelection(c.id)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all
                        ${selectedChildIds.includes(c.id) 
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]' 
                          : 'bg-white/5 border-transparent text-[var(--text-muted)]'
                        }
                      `}
                    >
                      <img src={c.avatar} alt={c.name} className="w-5 h-5 rounded-full bg-white/10" />
                      <span className="text-xs font-bold">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <input 
                type="text" 
                placeholder="Название приза" 
                className="w-full rounded-xl p-4 text-sm outline-none bg-white/5 border border-transparent focus:border-[var(--primary)]/20 transition-all"
                value={newPrize.name}
                onChange={e => setNewPrize({...newPrize, name: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Стоимость ($)" 
                className="w-full rounded-xl p-4 text-sm outline-none bg-white/5 border border-transparent focus:border-[var(--primary)]/20 transition-all"
                value={newPrize.cost}
                onChange={e => setNewPrize({...newPrize, cost: e.target.value})}
              />
              
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-[var(--primary)]/20">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-[var(--primary)]"
                  checked={newPrize.isOneTime}
                  onChange={e => setNewPrize({...newPrize, isOneTime: e.target.checked})}
                />
                <span className="text-sm font-bold">🛍️ Одноразовая</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm font-bold text-[var(--text-muted)] rounded-2xl hover:bg-white/5 transition-all">Отмена</button>
              <button 
                onClick={() => setIsAdding(false)} 
                className="btn-primary flex-[2] py-3 text-sm font-bold rounded-2xl shadow-lg transition-all active:scale-95"
              >
                Добавить ({selectedChildIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
