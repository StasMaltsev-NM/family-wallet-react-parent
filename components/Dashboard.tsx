
import React, { useState } from 'react';
import { Child, Mission } from '../types';
import { Sparkles, Loader2, ArrowUpRight, ArrowDownLeft, Gift, PackageCheck, Star, Check, X, ClipboardCheck, ChevronDown } from 'lucide-react';
import { editImageWithAI } from '../services/gemini';

interface Props {
  child: Child;
  onUpdateChild: (child: Child) => void;
}

const Dashboard: React.FC<Props> = ({ child, onUpdateChild }) => {
  const [isEditingDream, setIsEditingDream] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Списки по умолчанию развернуты, если в них есть элементы
  const pendingMissions = child.missions.filter(m => m.status === 'pending');
  const [isMissionsExpanded, setIsMissionsExpanded] = useState(pendingMissions.length > 0);
  const [isPrizesExpanded, setIsPrizesExpanded] = useState(child.pendingPrizes.length > 0);

  const progress = Math.min(100, (child.dream.current / child.dream.price) * 100);

  const handleAIEdit = async () => {
    if (!editPrompt) return;
    setIsGenerating(true);
    const result = await editImageWithAI(child.dream.image, `Примени эти визуальные изменения к изображению мечты: ${editPrompt}`);
    if (result) {
      onUpdateChild({
        ...child,
        dream: { ...child.dream, image: result }
      });
      setEditPrompt('');
      setIsEditingDream(false);
    }
    setIsGenerating(false);
  };

  const handleIssuePrize = (prizeId: string) => {
    onUpdateChild({
      ...child,
      pendingPrizes: child.pendingPrizes.filter(p => p.id !== prizeId)
    });
  };

  const handleMissionAction = (missionId: string, action: 'confirm' | 'reject') => {
    let updatedMissions = [...child.missions];
    const index = updatedMissions.findIndex(m => m.id === missionId);
    
    if (index === -1) return;

    const mission = updatedMissions[index];
    const childCopy = { ...child };

    if (action === 'confirm') {
      childCopy.balance.confirmed += mission.reward;
      childCopy.balance.pending = Math.max(0, childCopy.balance.pending - mission.reward);
      
      if (mission.isRecurring) {
        updatedMissions[index] = { ...mission, status: 'active' };
      } else {
        updatedMissions.splice(index, 1);
      }
    } else {
      updatedMissions[index] = { ...mission, status: 'active' };
      childCopy.balance.pending = Math.max(0, childCopy.balance.pending - mission.reward);
    }

    onUpdateChild({ ...childCopy, missions: updatedMissions });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      
      {/* 1. Блок «Детская мечта» — Компактная версия */}
      <div className="bg-[var(--bg-card)] rounded-[2rem] overflow-hidden border border-[var(--primary)]/10 shadow-xl flex flex-row items-stretch h-28 group transition-all hover:border-[var(--primary)]/30">
        <div className="relative w-28 flex-shrink-0 overflow-hidden">
          <img 
            src={child.dream.image} 
            alt={child.dream.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/20" />
          <button 
            onClick={() => setIsEditingDream(true)}
            className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg text-white/70 hover:text-white transition-all border border-white/5"
          >
            <Sparkles size={14} />
          </button>
        </div>
        
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0 bg-gradient-to-r from-transparent to-white/[0.02]">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Мечта {child.name}</p>
              <h3 className="text-sm font-black truncate text-white/90">{child.dream.title}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-[var(--primary)] flex items-center justify-end gap-1">
                {child.dream.current} <Star size={10} fill="currentColor" />
              </p>
              <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold">из {child.dream.price}</p>
            </div>
          </div>

          <div>
            <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden mb-1.5 border border-white/5">
              <div 
                className="absolute h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider">Прогресс</span>
              <span className="text-[9px] font-black text-[var(--text-main)]">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Состояние ребенка — Эргономичные карточки */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] p-4 rounded-[1.5rem] border border-[var(--border)] shadow-md flex items-center gap-4 transition-all hover:bg-white/[0.02]">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 flex-shrink-0">
            <ArrowUpRight size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Баланс</p>
            <p className="text-xl font-black text-white flex items-center gap-1.5">
              {child.balance.confirmed} <Star size={14} className="text-emerald-400" fill="currentColor" />
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-4 rounded-[1.5rem] border border-[var(--border)] shadow-md flex items-center gap-4 transition-all hover:bg-white/[0.02]">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 flex-shrink-0">
            <ArrowDownLeft size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Проверка</p>
            <p className="text-xl font-black text-white/90 flex items-center gap-1.5">
              {child.balance.pending} <Star size={14} className="text-amber-500/50" fill="currentColor" />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Миссии на проверку — Выпадающий список */}
      <div className={`bg-[var(--bg-card)] rounded-[2rem] border transition-all duration-300 overflow-hidden ${isMissionsExpanded ? 'border-amber-500/30 shadow-lg' : 'border-[var(--border)] shadow-sm'}`}>
        <button 
          onClick={() => setIsMissionsExpanded(!isMissionsExpanded)}
          className="w-full flex items-center justify-between p-5 focus:outline-none hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isMissionsExpanded ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <ClipboardCheck size={18} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/90">
              Миссии на проверку
            </h4>
            {pendingMissions.length > 0 && (
              <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full">
                {pendingMissions.length}
              </span>
            )}
          </div>
          <ChevronDown 
            size={18} 
            className={`text-[var(--text-muted)] transition-transform duration-300 ${isMissionsExpanded ? 'rotate-180' : ''}`} 
          />
        </button>

        {isMissionsExpanded && (
          <div className="p-5 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="h-px bg-white/5 mb-4" />
            {pendingMissions.length === 0 ? (
              <p className="text-center py-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Нет задач на проверку</p>
            ) : (
              pendingMissions.map(mission => (
                <div key={mission.id} className="flex items-center justify-between p-4 bg-amber-500/[0.03] rounded-2xl border border-amber-500/10 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate text-white">{mission.title}</p>
                    <p className="text-[10px] text-amber-400/80 font-bold mt-0.5">+{mission.reward} <Star size={10} fill="currentColor" className="inline mb-0.5" /></p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMissionAction(mission.id, 'confirm'); }}
                      className="w-10 h-10 bg-emerald-500 text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMissionAction(mission.id, 'reject'); }}
                      className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Вручить награды — Выпадающий список */}
      <div className={`bg-[var(--bg-card)] rounded-[2rem] border transition-all duration-300 overflow-hidden ${isPrizesExpanded ? 'border-[var(--primary)]/30 shadow-[0_0_20px_var(--primary-glow)]' : 'border-[var(--border)] shadow-sm'}`}>
        <button 
          onClick={() => setIsPrizesExpanded(!isPrizesExpanded)}
          className="w-full flex items-center justify-between p-5 focus:outline-none hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isPrizesExpanded ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <Gift size={18} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/90">
              Вручить награды
            </h4>
            {child.pendingPrizes.length > 0 && (
              <span className="bg-[var(--primary)] text-black text-[9px] font-black px-2 py-0.5 rounded-full">
                {child.pendingPrizes.length}
              </span>
            )}
          </div>
          <ChevronDown 
            size={18} 
            className={`text-[var(--text-muted)] transition-transform duration-300 ${isPrizesExpanded ? 'rotate-180' : ''}`} 
          />
        </button>
        
        {isPrizesExpanded && (
          <div className="p-5 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="h-px bg-white/5 mb-4" />
            {child.pendingPrizes.length === 0 ? (
              <p className="text-center py-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Нет наград к выдаче</p>
            ) : (
              child.pendingPrizes.map(prize => (
                <div key={prize.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <img src={prize.image} className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate text-white">{prize.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold mt-0.5">{prize.cost} <Star size={10} fill="currentColor" className="inline mb-0.5" /></p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleIssuePrize(prize.id); }}
                    className="px-4 py-2 bg-[var(--primary)] text-white text-[10px] font-black rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <PackageCheck size={14} />
                    <span>Готово</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 5. Недавние события — Совсем компактно */}
      <div className="bg-[var(--bg-card)] rounded-[1.5rem] border border-[var(--border)] p-6">
        <h4 className="text-[8px] font-black uppercase tracking-[0.3em] mb-4 text-[var(--text-muted)]">Активность</h4>
        <div className="space-y-4">
          {child.activities.length === 0 ? (
            <p className="text-center text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Событий нет</p>
          ) : (
            child.activities.slice(0, 3).map(activity => (
              <div key={activity.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base flex-shrink-0 opacity-60">
                    {activity.type === 'mission' ? '🎯' : '🛒'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-white/70">{activity.description}</p>
                    <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold mt-0.5">{activity.date}</p>
                  </div>
                </div>
                <span className={`text-xs font-black flex items-center gap-1 flex-shrink-0 ${activity.amount >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                  {activity.amount >= 0 ? `+${activity.amount}` : `-${Math.abs(activity.amount)}`} 
                  <Star size={10} fill="currentColor" />
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {isEditingDream && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-[3rem] p-10 border border-[var(--primary)]/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black mb-3 flex items-center gap-4 text-white">
              <Sparkles className="text-[var(--primary)]" />
              ИИ-Дизайнер
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-8 font-medium">Опишите желаемое преображение мечты...</p>
            <textarea
              className="w-full rounded-2xl p-5 text-sm font-bold bg-black/40 border border-white/5 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all mb-8 h-36 resize-none"
              placeholder="Напр. Добавь неоновое свечение и футуристичный стиль..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsEditingDream(false)} className="flex-1 py-4 text-sm font-black text-[var(--text-muted)] rounded-2xl hover:bg-white/5 transition-all">Отмена</button>
              <button disabled={isGenerating || !editPrompt} onClick={handleAIEdit} className="btn-primary flex-[2] py-4 text-sm font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50">
                {isGenerating ? <Loader2 className="animate-spin mx-auto" /> : 'Обновить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
