
import React, { useState } from 'react';
import { Child } from '../types';
import { ArrowLeft, User, MessageSquare, Calendar, Users, X } from 'lucide-react';

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
        className="absolute inset-0 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="relative bg-[var(--bg-card)] w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-[3rem] p-8 sm:p-10 border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-500">
        
        {/* Decorative Light */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/10 blur-[80px] -mr-24 -mt-24 pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)]">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-black">Новый профиль</h2>
          </div>
          <button onClick={onCancel} className="sm:hidden p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Поле: Имя */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-4">Имя ребенка</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Напр. Александр" 
                className="w-full h-16 rounded-[2rem] px-8 bg-white/5 border border-white/5 font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-30">
                <User size={20} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Поле: Роль */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-4">Кто он вам?</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Сын / Дочь" 
                  className="w-full h-16 rounded-[2rem] px-8 bg-white/5 border border-white/5 font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-30">
                  <Users size={20} />
                </div>
              </div>
            </div>

            {/* Поле: Возраст */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-4">Возраст</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Напр. 7 лет" 
                  className="w-full h-16 rounded-[2rem] px-8 bg-white/5 border border-white/5 font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-20">
                  <Calendar size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Поле: Описание */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-4">О ребенке (для ИИ)</label>
            <div className="relative">
              <textarea 
                placeholder="Опишите характер, увлечения и мечты ребенка. Это поможет ИИ давать более точные советы." 
                className="w-full h-40 rounded-[2.5rem] p-8 bg-white/5 border border-white/5 font-medium text-base outline-none transition-all focus:ring-2 focus:ring-[var(--primary)] focus:bg-black/40 resize-none leading-relaxed placeholder:opacity-30"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <div className="absolute right-6 bottom-6 text-[var(--text-muted)] opacity-20">
                <MessageSquare size={20} />
              </div>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={!name}
            className="w-full py-6 mt-4 bg-[var(--primary)] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-[var(--primary)]/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
          >
            Создать профиль
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddChildScreen;
