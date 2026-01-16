
import React, { useState } from 'react';
import { Child, Prize } from '../types';
import { PRIZES } from '../constants';
import { Plus, ShoppingCart, Lock, Box, Check, Star, Trash2, Info } from 'lucide-react';

interface Props {
  allChildren: Child[];
}

const Shop: React.FC<Props> = ({ allChildren }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrize, setNewPrize] = useState({ name: '', cost: '', isPermanent: true });
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(allChildren.map(c => c.id));
  const [prizes, setPrizes] = useState<Prize[]>(PRIZES);

  const toggleChildSelection = (id: string) => {
    setSelectedChildIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleDeletePrize = (id: string) => {
    setPrizes(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Магазин призов</h2>
          <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5">Чем порадовать ребенка?</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[1.5rem] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-lg"
        >
          <Plus size={28} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {prizes.map(prize => (
          <div key={prize.id} className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden flex flex-col group hover:border-[var(--primary)]/30 transition-all shadow-xl">
            {/* Фото и Прайс-тег */}
            <div className="relative h-48 sm:h-52 overflow-hidden">
              <img src={prize.image} alt={prize.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              
              {/* Яркая плашка цены */}
              <div className="absolute top-4 right-4 px-4 py-2 bg-orange-500 rounded-2xl text-white shadow-2xl flex items-center gap-2 border border-white/20">
                <span className="text-lg font-black">{prize.cost}</span>
                <Star size={18} fill="currentColor" className="text-white" />
              </div>
              
              {!prize.isOneTime && (
                <div className="absolute top-4 left-4 p-2.5 bg-indigo-600/80 backdrop-blur-md rounded-xl text-white border border-white/10" title="Постоянный слот">
                  <RefreshCcw size={16} className="animate-spin-slow" />
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col flex-1 justify-between gap-4">
              <div>
                <h4 className="text-xl font-black text-white leading-tight mb-2 uppercase tracking-tight">{prize.name}</h4>
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                  {prize.isOneTime ? <Box size={12} /> : <ShoppingCart size={12} />}
                  <span>{prize.isOneTime ? 'Разовая покупка' : 'Многоразовый слот'}</span>
                </div>
              </div>

              <button 
                onClick={() => handleDeletePrize(prize.id)}
                className="w-full py-4 bg-rose-500/10 text-rose-500 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10 flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[3.5rem] p-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 overflow-y-auto no-scrollbar max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 text-white flex items-center gap-4">
              <Plus className="text-[var(--primary)]" />
              Новая награда
            </h3>
            
            <div className="space-y-8 mb-10">
              {/* Выбор детей */}
              <div className="space-y-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Для кого приз?</p>
                <div className="flex flex-wrap gap-3">
                  {allChildren.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleChildSelection(c.id)}
                      className={`
                        flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300
                        ${selectedChildIds.includes(c.id) 
                          ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)] shadow-lg' 
                          : 'bg-white/5 border-transparent text-[var(--text-muted)] opacity-60'
                        }
                      `}
                    >
                      <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full bg-white/10" />
                      <span className="text-sm font-black uppercase tracking-widest">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Детали</p>
                <div className="grid gap-4">
                  <input 
                    type="text" 
                    placeholder="Название награды" 
                    className="w-full h-16 rounded-2xl px-6 font-bold text-lg bg-black/50 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                    value={newPrize.name}
                    onChange={e => setNewPrize({...newPrize, name: e.target.value})}
                  />
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Стоимость (1-10 000 Звезд)" 
                      className="w-full h-16 rounded-2xl px-6 font-bold text-lg bg-black/50 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                      value={newPrize.cost}
                      onChange={e => setNewPrize({...newPrize, cost: e.target.value})}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <Star size={24} className="text-orange-500" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
              
              <label className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl cursor-pointer hover:bg-white/[0.06] transition-all border border-white/5 group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${newPrize.isPermanent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                    <ShoppingCart size={22} />
                  </div>
                  <div className="pr-4">
                    <span className="text-lg font-black text-white">Постоянный слот</span>
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">(Остаётся после покупки)</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="w-7 h-7 accent-indigo-500 rounded-lg cursor-pointer"
                  checked={newPrize.isPermanent}
                  onChange={e => setNewPrize({...newPrize, isPermanent: e.target.checked})}
                />
              </label>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-5 text-sm font-black text-[var(--text-muted)] hover:text-white transition-colors uppercase tracking-widest">Отмена</button>
              <button 
                onClick={() => setIsAdding(false)} 
                disabled={!newPrize.name || !newPrize.cost}
                className="btn-primary flex-[2] py-5 text-lg font-black rounded-2xl shadow-xl shadow-[var(--primary)]/30 active:scale-[0.98] disabled:opacity-20 transition-all"
              >
                Создать для {selectedChildIds.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Вспомогательная иконка для многоразовости
const RefreshCcw = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export default Shop;
