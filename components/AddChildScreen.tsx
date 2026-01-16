
import React, { useState } from 'react';
import { Child } from '../types';
import { ArrowLeft, User, MessageSquare, Calendar, Users, X, ShieldCheck } from 'lucide-react';

interface Props {
  onCancel: () => void;
  onAdd: (child: Child) => void;
}

const AddChildScreen: React.FC<Props> = ({ onCancel, onAdd }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name) return;
    
    const newChild: Child = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'default'}`,
      dream: {
        title: 'Первая мечта...',
        price: 100,
        current: 0,
        image: 'https://picsum.photos/seed/gift/400/300'
      },
      balance: { confirmed: 0, pending: 0 },
      inviteCode: (Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6)).toUpperCase(),
      missions: [],
      activities: [],
      pendingPrizes: []
    };
    onAdd(newChild);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="relative bg-[var(--bg-card)] w-full max-w-xl max-h-[95vh] overflow-y-auto no-scrollbar rounded-[3.5rem] p-8 sm:p-12 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500">
        
        {/* Decorative Light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)]">
              <ArrowLeft size={28} />
            </button>
            <h2 className="text-3xl font-black">Добавить ребёнка</h2>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>

        {/* Блок защиты приватности */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 mb-10 flex items-start gap-4 relative z-10">
          <ShieldCheck className="text-emerald-400 flex-shrink-0" size={24} />
          <div className="space-y-1">
            <p className="text-[var(--text-main)] font-bold text-sm leading-snug">Защита приватности:</p>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Мы не требуем реальные имена. Можно использовать прозвища. — Так спокойнее и безопаснее. Все данные видны только вашей семье. <span className="text-emerald-400/80 font-bold text-xs uppercase tracking-widest ml-1">Здесь безопасно.</span>
            </p>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          {/* Поле: Имя */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-5">Имя или прозвище</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Например: Тигрёнок, Принцесса" 
                className="w-full h-16 rounded-[2.2rem] px-8 bg-white/5 border border-white/5 font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-30">
                <User size={22} />
              </div>
            </div>
            <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest ml-5">Совет: используйте псевдонимы, не реальные имена.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Поле: Роль */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-5">Кто он вам?</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="(сын, дочь, племянник и т.д.)" 
                  className="w-full h-16 rounded-[2.2rem] px-8 bg-white/5 border border-white/5 font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-30">
                  <Users size={22} />
                </div>
              </div>
            </div>

            {/* Поле: Возраст */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-5">Примерный возраст</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="(для рекомендаций ИИ)" 
                  className="w-full h-16 rounded-[2.2rem] px-8 bg-white/5 border border-white/5 font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-20">
                  <Calendar size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Поле: Описание */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-5">О ребенке (для ИИ)</label>
            <div className="relative">
              <textarea 
                placeholder="Постарайтесь подробно описать ребенка для рекомендаций от искусственного интеллекта (Необязательно)" 
                className="w-full h-44 rounded-[2.8rem] p-8 bg-white/5 border border-white/5 font-medium text-base outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40 resize-none leading-relaxed placeholder:opacity-30"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <div className="absolute right-8 bottom-8 text-[var(--text-muted)] opacity-20">
                <MessageSquare size={22} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleCreate}
              disabled={!name}
              className="w-full py-6 bg-[var(--primary)] text-white rounded-[2.2rem] font-black text-xl shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
            >
              Создать профиль
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-5 text-[var(--text-muted)] font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
              Назад к списку
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddChildScreen;
