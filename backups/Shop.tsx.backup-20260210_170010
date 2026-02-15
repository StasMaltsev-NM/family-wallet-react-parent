
import React, { useState, useEffect } from 'react';
import { Child, Prize } from '../types';
import { PRIZES } from '../constants';
import { parentApi } from '../services/api';
import { Plus, ShoppingCart, Lock, Box, Check, Star, Trash2, Info, Repeat } from 'lucide-react';

interface Props {
  allChildren: Child[];
  inviteCode: string;
  currentChild?: Child;
}

const Shop: React.FC<Props> = ({ allChildren, inviteCode, currentChild }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrize, setNewPrize] = useState({ name: '', cost: '', isPermanent: true });
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>(PRIZES);

  const mapRewards = (rewards: any[]) =>
    rewards.map((r: any) => ({
      id: r.id,
      name: r.title,
      title: r.title,
      cost: r.price,
      image_url: r.image_url,
      icon: r.icon,
      image: r.icon 
        ? `https://em-content.zobj.net/thumbs/120/apple/354/${r.icon.codePointAt(0).toString(16)}.png`
        : `https://picsum.photos/seed/${r.id}/200/200`,
      isOneTime: r.is_permanent === 0
    }));

  const refreshRewards = async () => {
    if (!inviteCode) return [];
    const { rewards } = await parentApi.listRewards(inviteCode);
    const mapped = mapRewards(rewards);
    setPrizes(mapped);
    return rewards;
  };

  const waitForImages = async (rewardIds: string[], attempts = 6, delayMs = 5000) => {
    if (!rewardIds.length) return;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const rewards = await refreshRewards();
        const allReady = rewardIds.every((id) =>
          rewards.find((r: any) => r.id === id && r.image_url)
        );
        if (allReady) return;
      } catch (err) {
        console.error('[SHOP POLL] error:', err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  };

  useEffect(() => {
    const loadRewards = async () => {
      try {
        await refreshRewards();
      } catch (err) {
        console.error('[SHOP LOAD] error:', err);
      }
    };

    loadRewards();
  }, [inviteCode]);

  const toggleChildSelection = (id: string) => {
    setSelectedChildIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

const handleCreateReward = async () => {
  console.log('[SHOP] CREATE START:', {
    selectedChildIds,
    newPrizeName: newPrize.name,
    newPrizeCost: newPrize.cost,
    isPermanent: newPrize.isPermanent
  });

  if (selectedChildIds.length === 0) {
    alert('Выберите хотя бы одного ребёнка!');
    return;
  }
  
  if (!newPrize.name || !newPrize.cost) {
    alert('Заполните название и цену!');
    return;
  }
  
  try {
    // Создаём награду для КАЖДОГО выбранного ребёнка
    const createdRewardIds: string[] = [];
    for (const localId of selectedChildIds) {
      const child = allChildren.find(c => (c.apiChildId || c.id) === localId);
      if (!child?.apiChildId) {
        console.error('[SHOP] Child not found or missing apiChildId:', localId);
        continue;
      }
      
      const childId = child.apiChildId;
      console.log('[SHOP] Creating reward for child:', childId);
      
      const res = await parentApi.createReward(
        inviteCode,
        childId,
        newPrize.name,
        parseInt(newPrize.cost),
        '',
        newPrize.isPermanent
      );
      if (res?.reward_id) createdRewardIds.push(res.reward_id);
    }
    
    console.log('[SHOP] Rewards created successfully!');
    
    // Перезагрузим список наград
    const rewardsRes = await parentApi.listRewards(inviteCode);
    console.log('[SHOP] Loaded rewards:', rewardsRes);
    setPrizes(mapRewards(rewardsRes.rewards));
    await waitForImages(createdRewardIds);
    
    // Закроем форму и сбросим
    setIsAdding(false);
    setNewPrize({ name: '', cost: '', isPermanent: true });
    
  } catch (err: any) {
    console.error('[SHOP] CREATE ERROR:', err);
    console.error('[SHOP] ERROR MESSAGE:', err?.message);
    console.error('[SHOP] ERROR RESPONSE:', err?.response);
    alert(`Ошибка: ${err?.message || 'Неизвестная ошибка'}`);
  }
};

  const handleDeletePrize = async (id: string) => {
    try {
      await parentApi.deleteReward(inviteCode, id);
      setPrizes(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('[Shop DELETE] error:', err);
      alert('Ошибка удаления награды!');
    }
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
        {prizes.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-card)] rounded-[2.5rem] border-2 border-dashed border-[var(--border)] opacity-60">
            <p className="font-black text-[var(--text-muted)] text-[12px] uppercase tracking-widest">АКТИВНЫХ НАГРАД НЕТ</p>
          </div>
        ) : (
          prizes.map(prize => (
            <div key={prize.id} className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden flex flex-col group hover:border-[var(--primary)]/30 transition-all shadow-xl">
              {/* Фото и Прайс-тег */}
            <div className="relative h-60 sm:h-64 overflow-hidden flex items-center justify-center">
              <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-[2rem] bg-gradient-to-br from-white/12 via-white/6 to-white/0 border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.4),rgba(255,255,255,0.08)_45%,rgba(0,0,0,0)_75%)]" />
                {prize.image_url ? (
                  <img 
                    src={prize.image_url} 
                    alt={prize.title || prize.name}
                    className="relative w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative text-7xl opacity-90">{prize.icon || '🎁'}</div>
                )}
                {!prize.image_url ? (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-white/60 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                    Генерация...
                  </div>
                ) : null}
              </div>
              
              {/* Яркая плашка цены */}
              <div className="absolute top-4 right-4 px-4 py-2 bg-orange-500 rounded-2xl text-white shadow-2xl flex items-center gap-2 border border-white/20">
                  <span className="text-lg font-black">{prize.cost}</span>
                  <Star size={18} fill="currentColor" className="text-white" />
                </div>
                
                {!prize.isOneTime && (
                  <div className="absolute top-4 left-4 p-2.5 bg-indigo-600/80 backdrop-blur-md rounded-xl text-white border border-white/10" title="Постоянный слот">
                    <Repeat size={16} />
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
          ))
        )}
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
                      onClick={() => toggleChildSelection(c.apiChildId || c.id)}
                      className={`
                        flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300
                        ${selectedChildIds.includes(c.apiChildId || c.id) 
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
                onClick={handleCreateReward}
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

export default Shop;
