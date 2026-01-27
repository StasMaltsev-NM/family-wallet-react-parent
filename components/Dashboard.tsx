
import React, { useState } from 'react';
import { Child, Activity } from '../types';
import { 
  Sparkles, 
  Loader2, 
  ArrowUpRight, 
  Timer, 
  Gift, 
  Star, 
  Check, 
  X, 
  ClipboardCheck, 
  ChevronDown, 
  History, 
  Hourglass,
  MapPin,
  Maximize2,
  Navigation,
  ShieldCheck,
  LocateFixed
} from 'lucide-react';
import { editImageWithAI } from '../services/gemini';

interface Props {
  child: Child;
  onUpdateChild: (child: Child) => void;

  // API-экшен из App.tsx
  onTaskAction: (taskId: string, action: "confirm" | "reject") => Promise<void>;
  pendingPurchases?: any[];
}

const Dashboard: React.FC<Props> = ({ child, onUpdateChild, onTaskAction, pendingPurchases = [] }) => {
    const [isEditingDream, setIsEditingDream] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const pendingMissions = child.missions.filter(m => m.status === 'pending');
  const [isMissionsExpanded, setIsMissionsExpanded] = useState(pendingMissions.length > 0);
  const [isPrizesExpanded, setIsPrizesExpanded] = useState(pendingPurchases.length > 0);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

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

  const handleMissionAction = (missionId: string, action: 'confirm' | 'reject') => {
    let updatedMissions = [...child.missions];
    const index = updatedMissions.findIndex(m => m.id === missionId);
    if (index === -1) return;

    const mission = updatedMissions[index];
    const childCopy = { ...child };

    if (action === 'confirm') {
      childCopy.balance.confirmed += mission.reward;
      childCopy.balance.pending = Math.max(0, childCopy.balance.pending - mission.reward);
      
      const newActivity: Activity = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'mission',
        description: `Миссия: ${mission.title}`,
        amount: mission.reward,
        date: 'Сегодня, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      childCopy.activities = [newActivity, ...childCopy.activities];

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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* 1. Блок «Детская мечта» */}
      <div className="bg-[var(--bg-card)] rounded-[2.5rem] overflow-hidden border border-[var(--primary)]/30 shadow-2xl flex flex-row items-stretch h-40 group">
        <div className="relative w-40 flex-shrink-0 overflow-hidden">
          <img 
            src={child.dream.image} 
            alt={child.dream.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/30" />
          <button 
            onClick={() => setIsEditingDream(true)}
            className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-lg p-2.5 rounded-xl text-white/90 hover:text-white transition-all border border-white/10"
          >
            <Sparkles size={20} />
          </button>
        </div>
        
        <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.25em] mb-1">Мечта ребенка</p>
              <h3 className="text-xl font-black truncate text-white leading-tight">{child.dream.title}</h3>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black text-[var(--primary)] flex items-center justify-end gap-1">
                {child.dream.current} <Star size={20} fill="currentColor" />
              </p>
              <p className="text-[11px] text-[var(--text-muted)] uppercase font-bold tracking-widest">из {child.dream.price}</p>
            </div>
          </div>

          <div className="mt-auto">
            <div className="relative h-2.5 bg-black/50 rounded-full overflow-hidden mb-2.5 border border-white/5">
              <div 
                className="absolute h-full bg-gradient-to-r from-[var(--primary)] to-indigo-400 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">Прогресс до цели</span>
              <span className="text-lg font-black text-white">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Баланс */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[var(--bg-card)] p-6 rounded-[2.2rem] border border-[var(--border)] shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
            <ArrowUpRight size={28} />
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Баланс</p>
            <p className="text-3xl font-black text-white flex items-center gap-2">
              {child.balance.confirmed} <Star size={20} className="text-emerald-400" fill="currentColor" />
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-[2.2rem] border border-[var(--border)] shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
            <Timer size={28} />
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Проверка</p>
            <p className="text-3xl font-black text-white/90 flex items-center gap-2">
              {child.balance.pending} <Star size={20} className="text-amber-500/50" fill="currentColor" />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Дашборд миссий */}
      <div className={`bg-[var(--bg-card)] rounded-[2.5rem] border transition-all duration-300 ${isMissionsExpanded ? 'border-amber-400/50 shadow-xl' : 'border-[var(--border)] shadow-lg'}`}>
        <button onClick={() => setIsMissionsExpanded(!isMissionsExpanded)} className="w-full flex items-center justify-between p-7">
          <div className="flex items-center gap-5">
            <div className={`p-3.5 rounded-2xl ${isMissionsExpanded ? 'bg-amber-400/20 text-amber-400 shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <ClipboardCheck size={26} />
            </div>
            <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white">Миссии на проверку</h4>
            {pendingMissions.length > 0 && <span className="bg-amber-400 text-black text-[12px] font-black px-3 py-1.5 rounded-full shadow-lg">{pendingMissions.length}</span>}
          </div>
          <ChevronDown size={24} className={`text-[var(--text-muted)] transition-transform duration-500 ${isMissionsExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isMissionsExpanded && (
          <div className="p-7 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
            {pendingMissions.length === 0 ? (
              <p className="text-center py-6 text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">Нет задач на проверку</p>
            ) : (
              pendingMissions.map(m => (
                <div key={m.id} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-[2.2rem] border border-white/10 shadow-lg">
                  <div className="min-w-0 pr-4">
                    <p className="text-xl font-black text-white truncate mb-2 leading-tight">{m.title}</p>
                    <p className="text-lg text-amber-400 font-black">+{m.reward} <Star size={16} fill="currentColor" className="inline mb-1" /></p>
                  </div>
                  <div className="flex gap-4">
<button
  onClick={async () => {
    await onTaskAction(m.id, "confirm");
  }}
  className="w-14 h-14 bg-emerald-500 text-black rounded-[1.3rem] flex items-center justify-center shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
>
  <Check size={30} strokeWidth={3} />
</button>

<button
  onClick={async () => {
    await onTaskAction(m.id, "reject");
  }}
  className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-[1.3rem] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
>
  <X size={24} strokeWidth={3} />
</button>                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Награды */}
      <div className={`bg-[var(--bg-card)] rounded-[2.5rem] border transition-all duration-300 ${isPrizesExpanded ? 'border-[var(--primary)]/50 shadow-xl' : 'border-[var(--border)] shadow-lg'}`}>
        <button onClick={() => setIsPrizesExpanded(!isPrizesExpanded)} className="w-full flex items-center justify-between p-7">
          <div className="flex items-center gap-5">
            <div className={`p-3.5 rounded-2xl ${isPrizesExpanded ? 'bg-[var(--primary)]/20 text-[var(--primary)] shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <Gift size={26} />
            </div>
            <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white">Вручить награды</h4>
            {pendingPurchases.length > 0 && <span className="bg-[var(--primary)] text-black text-[12px] font-black px-3 py-1.5 rounded-full shadow-lg">{pendingPurchases.length}</span>}
          </div>
          <ChevronDown size={24} className={`text-[var(--text-muted)] transition-transform duration-500 ${isPrizesExpanded ? 'rotate-180' : ''}`} />
        </button>
        
        {isPrizesExpanded && (
          <div className="p-7 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
            {pendingPurchases.length === 0 ? (
              <p className="text-center py-6 text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">Нет наград к выдаче</p>
            ) : (
              pendingPurchases.map(p => (
                <div key={p.id} className="flex items-center gap-6 p-6 bg-white/[0.03] rounded-[2.2rem] border border-white/10 shadow-lg hover:bg-white/[0.05] transition-all">
                  {/* Увеличенная картинка награды */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-5xl border-2 border-white/10 shadow-xl bg-white/5">{p.reward_icon}</div>
                  </div>
                  
                  {/* Инфо блок */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-black text-white truncate leading-tight mb-2">{p.reward_title}</h5>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-lg text-[var(--text-muted)] font-black">
                        <span>{p.price}</span>
                        <Star size={18} fill="currentColor" className="text-amber-400" />
                      </div>
                      <div className="flex items-center gap-2 text-amber-400/90 font-black animate-pulse mt-1">
                        <Hourglass size={14} />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">Ожидает вручения</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 5. Активность (Выпадающий список) */}
      <div className={`bg-[var(--bg-card)] rounded-[2.5rem] border transition-all duration-300 ${isActivityExpanded ? 'border-white/20 shadow-xl' : 'border-[var(--border)] shadow-sm'}`}>
        <button onClick={() => setIsActivityExpanded(!isActivityExpanded)} className="w-full flex items-center justify-between p-7">
          <div className="flex items-center gap-5">
            <div className={`p-3.5 rounded-2xl ${isActivityExpanded ? 'bg-white/10 text-white shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}>
              <History size={26} />
            </div>
            <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white">Активность</h4>
          </div>
          <ChevronDown size={24} className={`text-[var(--text-muted)] transition-transform duration-500 ${isActivityExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isActivityExpanded && (
          <div className="p-7 pt-0 space-y-6 animate-in fade-in slide-in-from-top-2">
            {child.activities.length === 0 ? (
              <p className="text-center py-6 text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">Истории пока нет</p>
            ) : (
              [
                ...child.activities,
                { id: 'purchase-ex', type: 'purchase', description: 'Награда: Большая Пицца', amount: -40, date: 'Сегодня, 19:15' }
              ].sort((a, b) => b.id.localeCompare(a.id)).map(a => (
                <div key={a.id} className="flex items-center justify-between gap-6 px-2">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/5 ${a.amount >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {a.type === 'mission' ? '🎯' : '🎁'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-white/95 truncate leading-tight">{a.description}</p>
                      <p className="text-[11px] text-[var(--text-muted)] uppercase font-bold tracking-[0.1em] mt-1.5">{a.date}</p>
                    </div>
                  </div>
                  <span className={`text-xl font-black flex items-center gap-1.5 flex-shrink-0 ${a.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {a.amount >= 0 ? `+${a.amount}` : `${a.amount}`} 
                    <Star size={16} fill="currentColor" />
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 6. Где мой ребенок (Карта) */}
      <div 
        onClick={() => setIsMapFullscreen(true)}
        className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden shadow-xl cursor-pointer hover:border-[var(--primary)]/50 transition-all group relative"
      >
        <div className="p-7 flex items-center justify-between bg-black/20 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <MapPin size={26} />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase tracking-[0.2em] text-white">Где мой ребенок</h4>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <ShieldCheck size={12} /> В безопасной зоне
              </p>
            </div>
          </div>
          <Maximize2 size={20} className="text-[var(--text-muted)] group-hover:text-white transition-colors" />
        </div>

        {/* Мини-карта превью */}
        <div className="h-48 w-full relative">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d20000!2d37.6176!3d55.7558!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sru!2sru!4v1700000000000!5m2!1sru!2sru&dark_mode=true"
            className="w-full h-full border-0 grayscale invert contrast-125 opacity-40 group-hover:opacity-60 transition-opacity"
            loading="lazy"
            title="Map Preview"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent pointer-events-none" />
          
          {/* Кастомный маркер */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50 animate-pulse" />
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500 p-0.5 bg-black relative z-10">
                <img src={child.avatar} alt={child.name} className="w-full h-full rounded-full" />
              </div>
            </div>
            <div className="mt-2 px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
              {child.name}
            </div>
          </div>
        </div>
      </div>

      {/* Полноэкранная карта */}
      {isMapFullscreen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="p-6 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/10 z-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMapFullscreen(false)}
                className="p-3 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-colors"
              >
                <ChevronDown size={28} className="rotate-90" />
              </button>
              <div>
                <h3 className="text-xl font-black text-white">{child.name} сейчас</h3>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Обновлено: только что</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="p-4 bg-[var(--primary)] text-black rounded-2xl shadow-lg shadow-[var(--primary)]/20">
                <LocateFixed size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d40000!2d37.6176!3d55.7558!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sru!2sru!4v1700000000000!5m2!1sru!2sru"
              className="w-full h-full border-0 grayscale invert brightness-75 contrast-125"
              loading="lazy"
              title="Full Map"
            />
            
            {/* Анимированный пин на большой карте */}
            <div className="absolute top-[45%] left-[52%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="relative group/pin">
                <div className="absolute inset-0 bg-indigo-500/40 rounded-full scale-[3] animate-ping" />
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-40 scale-150" />
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500 p-0.5 bg-black relative z-10 shadow-2xl">
                  <img src={child.avatar} alt={child.name} className="w-full h-full rounded-full" />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-2xl">
                  {child.name} • 5 мин назад
                </div>
              </div>
            </div>

            {/* Контролы сбоку */}
            <div className="absolute right-6 bottom-32 flex flex-col gap-4">
              <button className="w-16 h-16 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                <Navigation size={28} />
              </button>
              <button className="w-16 h-16 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                <Maximize2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingDream && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="bg-[var(--bg-card)] w-full max-sm rounded-[3rem] p-10 border border-[var(--primary)]/40 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-4 text-white">
              <Sparkles className="text-[var(--primary)]" />
              ИИ-Редактор
            </h3>
            <textarea
              className="w-full rounded-2xl p-6 text-lg font-bold bg-black/50 border border-white/10 outline-none transition-all mb-8 h-48 resize-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/70 shadow-inner"
              placeholder="Как изменим мечту?"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsEditingDream(false)} className="flex-1 py-5 text-sm font-black text-[var(--text-muted)] hover:text-white transition-colors uppercase tracking-widest">Отмена</button>
              <button disabled={isGenerating || !editPrompt} onClick={handleAIEdit} className="btn-primary flex-[2] py-5 text-lg font-black rounded-2xl shadow-xl shadow-[var(--primary)]/30">
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
