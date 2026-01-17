
import React, { useState, useEffect } from 'react';
import { Theme, Tab, Child } from './types';
import { INITIAL_CHILDREN } from './constants';
import ChildSwitcher from './components/ChildSwitcher';
import Dashboard from './components/Dashboard';
import Missions from './components/Missions';
import Shop from './components/Shop';
import AIAssistant from './components/AIAssistant';
import SettingsModal from './components/SettingsModal';
import AddChildScreen from './components/AddChildScreen';
import { 
  LayoutDashboard, 
  Target, 
  ShoppingBag, 
  Sparkles, 
  Settings, 
  Palette 
} from 'lucide-react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.DEEP_PURPLE);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [children, setChildren] = useState<Child[]>(INITIAL_CHILDREN);
  const [selectedChildId, setSelectedChildId] = useState<string>(INITIAL_CHILDREN[0].id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
useEffect(() => {
  // Telegram WebApp
  // @ts-ignore
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  // фикс “полного экрана” + запрет провала в сворачивание TG при резком свайпе
  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";
  document.body.style.overflow = "hidden";

  return () => {
    document.documentElement.style.height = "";
    document.body.style.height = "";
    document.body.style.overflow = "";
  };
}, []);
  const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

  const pendingPrizesCount = selectedChild.pendingPrizes.length;
  const pendingMissionsCount = selectedChild.missions.filter(m => m.status === 'pending').length;

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const themes = [Theme.DEEP_PURPLE, Theme.CLASSIC_DARK, Theme.PASTEL_MINT, Theme.EMERALD_NIGHT];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  const handleUpdateChild = (updated: Child) => {
    setChildren(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteChild = (id: string) => {
    const newChildren = children.filter(c => c.id !== id);
    if (newChildren.length > 0) {
      setChildren(newChildren);
      if (selectedChildId === id) setSelectedChildId(newChildren[0].id);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard child={selectedChild} onUpdateChild={handleUpdateChild} />;
      case Tab.MISSIONS:
        return <Missions child={selectedChild} allChildren={children} onUpdateChild={handleUpdateChild} />;
      case Tab.SHOP:
        return <Shop allChildren={children} />;
      case Tab.AI_ASSISTANT:
        return <AIAssistant child={selectedChild} />;
      default:
        return <Dashboard child={selectedChild} onUpdateChild={handleUpdateChild} />;
    }
  };

  return (
<div className="h-screen flex flex-col transition-colors duration-500 bg-black text-white">      {/* Шапка */}
      <header className="max-w-3xl mx-auto px-6 pt-5 pb-2 sticky top-0 z-40 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black tracking-tighter">Family Wallet</h1>
          <div className="flex gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all border border-white/5"
            >
              <Palette size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all border border-white/5"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        
        <ChildSwitcher 
          children={children} 
          selectedId={selectedChildId} 
          onSelect={setSelectedChildId} 
          onAdd={() => setIsAddChildOpen(true)}
        />
      </header>

      {/* Контент */}
     <main className="flex-1 overflow-y-auto scrollArea max-w-3xl mx-auto px-6 mt-6">
  {renderContent()}
</main>

      {/* Нижняя навигация */}
      <div className="fixed bottom-8 left-0 right-0 z-50 px-6">
        <nav className="max-w-3xl mx-auto bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] py-4 px-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex items-center justify-between transition-all duration-500">
          <NavButton 
            active={activeTab === Tab.DASHBOARD} 
            onClick={() => setActiveTab(Tab.DASHBOARD)} 
            icon={<LayoutDashboard size={24} />} 
            label="Главная" 
            badgeCount={pendingPrizesCount + pendingMissionsCount}
          />
          <NavButton 
            active={activeTab === Tab.MISSIONS} 
            onClick={() => setActiveTab(Tab.MISSIONS)} 
            icon={<Target size={24} />} 
            label="Миссии" 
          />
          <NavButton 
            active={activeTab === Tab.SHOP} 
            onClick={() => setActiveTab(Tab.SHOP)} 
            icon={<ShoppingBag size={24} />} 
            label="Магазин" 
          />
          <NavButton 
            active={activeTab === Tab.AI_ASSISTANT} 
            onClick={() => setActiveTab(Tab.AI_ASSISTANT)} 
            icon={<Sparkles size={24} />} 
            label="ИИ" 
          />
        </nav>
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          children={children} 
          setChildren={setChildren}
          onDeleteChild={handleDeleteChild}
          onClose={() => setIsSettingsOpen(false)} 
          onOpenAddChild={() => {
            setIsSettingsOpen(false);
            setIsAddChildOpen(true);
          }}
        />
      )}

      {isAddChildOpen && (
        <AddChildScreen 
          onCancel={() => setIsAddChildOpen(false)} 
          onAdd={(newChild) => {
            setChildren(prev => [...prev, newChild]);
            setSelectedChildId(newChild.id);
            setIsAddChildOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badgeCount?: number;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badgeCount = 0 }) => (
  <button 
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 ${active ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] opacity-50 hover:opacity-100'}`}
  >
    <div className="relative">
      {icon}
      {badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-3 bg-rose-500 text-white text-[10px] font-black min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-lg ring-2 ring-black">
          {badgeCount}
        </span>
      )}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
