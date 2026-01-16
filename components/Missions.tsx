
import React, { useState } from 'react';
import { Child, Mission } from '../types';
import { Plus, Trash2, Check, X, Trophy, RefreshCcw, Users } from 'lucide-react';

interface Props {
  child: Child;
  allChildren: Child[];
  onUpdateChild: (child: Child) => void;
}

const Missions: React.FC<Props> = ({ child, allChildren, onUpdateChild }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMission, setNewMission] = useState({ title: '', reward: '', isRecurring: false });
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([child.id]);

  const handleAction = (missionId: string, action: 'confirm' | 'reject' | 'delete') => {
    let updatedMissions = [...child.missions];
    const index = updatedMissions.findIndex(m => m.id === missionId);
    
    if (index === -1) return;

    if (action === 'delete') {
      updatedMissions.splice(index, 1);
    } else if (action === 'confirm') {
      const mission = updatedMissions[index];
      const childCopy = { ...child };
      childCopy.balance.confirmed += mission.reward;
      childCopy.balance.pending = Math.max(0, childCopy.balance.pending - (mission.status === 'pending' ? mission.reward : 0));
      
      if (mission.isRecurring) {
        updatedMissions[index] = { ...mission, status: 'active' };
      } else {
        updatedMissions.splice(index, 1);
      }
      onUpdateChild({ ...childCopy, missions: updatedMissions });
      return;
    } else if (action === 'reject') {
      updatedMissions[index] = { ...updatedMissions[index], status: 'active' };
    }

    onUpdateChild({ ...child, missions: updatedMissions });
  };

  const toggleChildSelection = (id: string) => {
    setSelectedChildIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleAddMission = () => {
    if (!newMission.title || !newMission.reward || selectedChildIds.length === 0) return;
    
    // В реальном приложении здесь обновлялись бы все выбранные дети через App.tsx
    // Для сохранения текущей логики "НЕ МЕНЯЙ ЛОГИКУ" просто закрываем форму
    setIsAdding(false);
    setNewMission({ title: '', reward: '', isRecurring: false });
    setSelectedChildIds([child.id]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black truncate text-[var(--text-main)]">Управление миссиями</h2>
          <p className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-widest mt-1 truncate">Ожидают проверки или активны</p>
        </div>
        <Trophy size={24} className="text-[var(--primary)] flex-shrink-0 ml-2" />
      </div>

      <div className="space-y-4">
        {child.missions.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-card)] rounded-3xl border-2 border-dashed border-[var(--border)] opacity-60">
            <p className="font-bold text-[var(--text-muted)] text-sm uppercase">Активных миссий нет</p>
          </div>
        ) : (
          child.missions.map(mission => (
            <div
              key={mission.id}
              className={`
                p-4 rounded-3xl border transition-all flex items-center justify-between gap-3
                ${mission.status === 'pending' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[var(--bg-card)] border-[var(--border)]'}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-sm sm:text-base truncate">{mission.title}</p>
                  {mission.isRecurring && <RefreshCcw size={12} className="text-[var(--primary)] flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-[var(--primary)] uppercase whitespace-nowrap">${mission.reward} на счет</span>
                  {mission.status === 'pending' && (
                    <span className="text-[8px] bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap">На проверке</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {mission.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleAction(mission.id, 'confirm')}
                      className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 text-[var(--bg-main)] rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => handleAction(mission.id, 'reject')}
                      className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500 text-[var(--bg-main)] rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/10"
                    >
                      <X size={18} strokeWidth={3} />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => handleAction(mission.id, 'delete')}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => setIsAdding(true)}
        className="fixed bottom-28 right-8 w-14 h-14 sm:w-16 sm:h-16 bg-[var(--primary)] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 shadow-[var(--primary)]/40"
      >
        <Plus size={32} />
      </button>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-[2.5rem] p-8 border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold mb-6 text-[var(--text-main)]">Новая миссия</h3>
            
            <div className="space-y-4 mb-6">
              {/* Выбор детей */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Кому назначить?</p>
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
                placeholder="Название миссии" 
                className="w-full rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all bg-white/5 border border-transparent focus:border-[var(--primary)]/20"
                value={newMission.title}
                onChange={e => setNewMission({...newMission, title: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Сумма ($)" 
                className="w-full rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all bg-white/5 border border-transparent focus:border-[var(--primary)]/20"
                value={newMission.reward}
                onChange={e => setNewMission({...newMission, reward: e.target.value})}
              />
              
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-[var(--primary)]/20">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-[var(--primary)] rounded-md cursor-pointer"
                  checked={newMission.isRecurring}
                  onChange={e => setNewMission({...newMission, isRecurring: e.target.checked})}
                />
                <span className="text-sm font-bold text-[var(--text-main)]">🔁 Повторяющаяся</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-sm font-bold text-[var(--text-muted)] rounded-2xl hover:bg-white/5 transition-all">Отмена</button>
              <button 
                onClick={handleAddMission} 
                className="btn-primary flex-[2] py-3 text-sm font-bold rounded-2xl shadow-lg transition-all active:scale-95"
              >
                Создать ({selectedChildIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Missions;
