
import React, { useRef } from 'react';
import { Child } from '../types';
import { X, Copy, Check, Download, Upload, ShieldCheck, UserPlus, Trash2, Users, Heart, Power, Trash } from 'lucide-react';

interface Props {
  children: Child[];
  setChildren: (children: Child[]) => void;
  onDeleteChild: (id: string) => void;
  onClose: () => void;
  onOpenAddChild: () => void;
}

const SettingsModal: React.FC<Props> = ({ children, setChildren, onDeleteChild, onClose, onOpenAddChild }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inviteCodes = [
    { id: 'f1', code: 'PRO-GIFT-X10', status: 'active' },
    { id: 'f2', code: 'KIDS-SAFE-77', status: 'activated' },
    { id: 'f3', code: 'FAM-DASH-99', status: 'active' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-400" onClick={onClose} />
      
      <div className="relative bg-[#0A0A0B] w-full max-w-xl max-h-[85vh] overflow-y-auto no-scrollbar rounded-[3.5rem] p-8 sm:p-12 border border-white/10 shadow-[0_0_120px_rgba(0,0,0,1)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        
        <div className="flex items-center justify-between mb-12 sticky top-0 bg-[#0A0A0B] py-2 z-20">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-3xl font-black tracking-tight">Настройки</h2>
          </div>
          <button onClick={onClose} className="p-3.5 hover:bg-white/5 rounded-full transition-all border border-white/5 active:scale-90"><X size={26} /></button>
        </div>

        <div className="space-y-12">
          {/* Блок 1: Коды родителей */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 px-2">
              <Users size={20} className="text-[var(--primary)]" />
              <p className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Коды управления</p>
            </div>
            <div className="grid gap-4">
              <CodeRow label="Ваш уникальный код родителя" code="P-ADMIN-772-K" onCopy={() => copyCode("P-ADMIN-772-K", "p1")} isCopied={copiedId === "p1"} />
              <CodeRow label="Код для входа второго родителя" code="P-PARTNER-440-S" onCopy={() => copyCode("P-PARTNER-440-S", "p2")} isCopied={copiedId === "p2"} />
            </div>
          </section>

          {/* Блок 2: Инвайты для друзей */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 px-2">
              <Heart size={20} className="text-rose-500" />
              <p className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Пригласите другие семьи</p>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] px-3 -mt-2 leading-relaxed font-medium">Поделитесь этими кодами с друзьями, чтобы они тоже могли управлять финансами своей семьи.</p>
            <div className="grid gap-4">
              {inviteCodes.map(f => (
                <div key={f.id} className="flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-white/5 shadow-inner transition-all hover:bg-white/[0.04]">
                  <div className="flex flex-col">
                    <code className="text-lg font-mono font-black tracking-[0.15em] text-white/90">{f.code}</code>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`w-2 h-2 rounded-full ${f.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-600'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${f.status === 'active' ? 'text-emerald-400' : 'text-rose-500/80'}`}>
                        {f.status === 'active' ? 'Активен' : 'Использован'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => copyCode(f.code, f.id)} className={`p-4 rounded-2xl transition-all shadow-lg ${copiedId === f.id ? 'bg-emerald-500 scale-95' : 'bg-white/5 hover:bg-white/10 active:scale-95'}`}>
                    {copiedId === f.id ? <Check size={20} className="text-white" /> : <Copy size={20} className="text-[var(--text-muted)]" />}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Блок 3: Удалить профиль ребенка */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 px-2">
              <Trash2 size={20} className="text-rose-500" />
              <p className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Удалить профиль ребенка</p>
            </div>
            <div className="grid gap-4">
              {children.map(child => (
                <div key={child.id} className="group flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-rose-500/10 hover:border-rose-500/30 transition-all duration-300">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={child.avatar} className="w-14 h-14 rounded-2xl object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                      <div className="absolute inset-0 bg-rose-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="font-black text-xl text-white/80 group-hover:text-white transition-colors">{child.name}</span>
                  </div>
                  <button 
                    onClick={() => onDeleteChild(child.id)} 
                    className="p-4 text-rose-500/60 hover:text-white hover:bg-rose-600 rounded-2xl transition-all shadow-lg hover:shadow-rose-600/20"
                    title="Удалить мгновенно"
                  >
                    <Trash size={24} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Нижний блок действий */}
          <div className="pt-10 border-t border-white/5 space-y-6">
            <button onClick={onOpenAddChild} className="w-full py-6 bg-[var(--primary)] text-white rounded-[2.2rem] font-black text-xl shadow-2xl shadow-[var(--primary)]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
              <UserPlus size={28} /> Добавить ребенка
            </button>
            <div className="flex flex-col gap-4">
               <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-colors"><Download size={18} />Бекап</button>
                <button className="flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-colors"><Upload size={18} />Импорт</button>
              </div>
              <button className="w-full py-5 bg-rose-600/10 text-rose-500/80 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-rose-600/20 hover:text-rose-500 transition-all border border-rose-500/10 flex items-center justify-center gap-3">
                <Power size={18} /> Удалить профиль родителя
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CodeRow = ({ label, code, onCopy, isCopied }: { label: string, code: string, onCopy: () => void, isCopied: boolean }) => (
  <div className="flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-white/5 shadow-inner group hover:bg-white/[0.04] transition-colors">
    <div className="min-w-0 pr-4">
      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{label}</p>
      <code className="text-lg font-mono font-black tracking-[0.2em] text-white/90 group-hover:text-white transition-colors">{code}</code>
    </div>
    <button onClick={onCopy} className={`p-4 rounded-2xl transition-all shadow-xl ${isCopied ? 'bg-emerald-500 scale-95 shadow-emerald-500/30' : 'bg-white/5 hover:bg-white/10 active:scale-95'}`}>
      {isCopied ? <Check size={22} className="text-white" /> : <Copy size={22} className="text-[var(--text-muted)]" />}
    </button>
  </div>
);

export default SettingsModal;
