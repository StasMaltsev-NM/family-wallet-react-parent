
import React, { useRef } from 'react';
import { Child } from '../types';
import { X, Copy, Share2, Check, Download, Upload, ShieldCheck, UserPlus } from 'lucide-react';

interface Props {
  children: Child[];
  setChildren: (children: Child[]) => void;
  onClose: () => void;
  onOpenAddChild: () => void;
}

const SettingsModal: React.FC<Props> = ({ children, setChildren, onClose, onOpenAddChild }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(children, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `family_wallet_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setChildren(json);
          alert('Данные успешно импортированы!');
        } else {
          alert('Неверный формат файла бекапа.');
        }
      } catch (err) {
        alert('Ошибка при чтении файла.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-card)] w-full max-w-md rounded-[3rem] p-8 border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden">
        {/* Декоративное свечение */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 blur-[60px] -mr-16 -mt-16 pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <ShieldCheck className="text-[var(--primary)]" />
            Управление семьей
          </h2>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-white/5 rounded-full transition-colors border border-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-2 px-2">Инвайт-коды детей</p>
          {children.map(child => (
            <div key={child.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-3xl border border-white/5 transition-all hover:bg-white/[0.06]">
              <div className="flex items-center gap-4 min-w-0">
                <img src={child.avatar} alt={child.name} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{child.name}</p>
                  <code className="text-[10px] font-mono opacity-50 tracking-tighter">{child.inviteCode}</code>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button 
                  onClick={() => copyCode(child.inviteCode, child.id)}
                  className={`p-2.5 rounded-xl transition-all ${copiedId === child.id ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}
                >
                  {copiedId === child.id ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 space-y-6 relative z-10">
          <section className="space-y-4">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] text-center mb-4">Резервное копирование</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 py-4 px-4 bg-white/5 border border-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                <Download size={16} />
                Экспорт
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 px-4 bg-white/5 border border-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                <Upload size={16} />
                Импорт
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </section>

          <div className="pt-2">
            <button 
              onClick={onOpenAddChild}
              className="w-full py-5 px-6 bg-[var(--primary)] text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-[var(--primary)]/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <UserPlus size={20} />
              Добавить ребенка
            </button>
            <button className="w-full mt-4 py-4 px-6 bg-rose-500/10 text-rose-500 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-rose-500/20 transition-all">
              Удалить профиль родителя
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
