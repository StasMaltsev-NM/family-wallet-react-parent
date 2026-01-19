// App.tsx (FW-REACT-PARENT-COPY)
// Цель: 1 источник истины для UI (children) + мост из API tasks -> missions,
// чтобы вкладка "Миссии" показывала реальные задания и бейджи считались от API.

import React, { useEffect, useMemo, useState } from "react";
import { Theme, Tab, Child } from "./types";
import { INITIAL_CHILDREN } from "./constants";

import ChildSwitcher from "./components/ChildSwitcher";
import Dashboard from "./components/Dashboard";
import Missions from "./components/Missions";
import Shop from "./components/Shop";
import AIAssistant from "./components/AIAssistant";
import SettingsModal from "./components/SettingsModal";
import AddChildScreen from "./components/AddChildScreen";

import {
  LayoutDashboard,
  Target,
  ShoppingBag,
  Sparkles,
  Settings,
  Palette,
} from "lucide-react";

import { parentApi } from "./services/api";
// TEMP DEBUG: чтобы дергать API из DevTools Console (потом удалим)
declare global {
  interface Window {
    parentApi?: any;
  }
}
window.parentApi = parentApi;

// MVP: пока жестко. Потом вынесем в env / tg initData.
const PARENT_CODE = "SRFK4A1C";

// backend task.status -> UI mission.status (Missions ждёт 'pending' для "на проверке")
function mapTaskStatusToMissionStatus(taskStatus: string) {
  if (taskStatus === "WAITING") return "pending";
  if (taskStatus === "CONFIRMED") return "active";
  return "active";
}

// Матчинг задач к ребёнку (чтобы не зависеть от совпадения id)
function taskBelongsToChild(task: any, child: any): boolean {
  // 1. Основной матч: backend child_id === ui apiChildId
  if (child?.apiChildId && task?.child_id) {
    return task.child_id === child.apiChildId;
  }

  // 2. Запасной матч: если вдруг совпадают id
  if (task?.child_id && child?.id) {
    return task.child_id === child.id;
  }

  // 3. ВРЕМЕННЫЙ MVP-МОСТ: сравнение по имени ребёнка
  if (
    typeof task?.child_name === "string" &&
    typeof child?.name === "string" &&
    task.child_name.trim().toLowerCase() ===
      child.name.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
}
const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.DEEP_PURPLE);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);

  // База UI (не перезатираем её данными API - только "накладываем" missions сверху)
  const [children, setChildren] = useState<Child[]>(INITIAL_CHILDREN);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    INITIAL_CHILDREN[0]?.id
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);

  // API задачи (источник истины для миссий на этом шаге)
const [tasks, setTasks] = useState<any[]>([]);
const [apiChildren, setApiChildren] = useState<any[]>([]);
const [apiError, setApiError] = useState<string | null>(null);

  // 1) Telegram full-screen + анти-сворачивание
  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes?.();
    }

    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.height = "";
      document.body.style.height = "";
      document.body.style.overflow = "";
    };
  }, []);

  // 2) Тема
  useEffect(() => {
    document.body.setAttribute("data-theme", `${theme}`);
  }, [theme]);

  // 3) Загрузка API: whoami + tasks
  const refreshTasks = async () => {
    try {
      setApiError(null);

const kidsResp = await parentApi.listChildren(PARENT_CODE);
const nextKids = kidsResp?.children ?? [];
setApiChildren(nextKids);

const resp = await parentApi.getTasks(PARENT_CODE);
const nextTasks = resp?.tasks ?? [];
setTasks(nextTasks);
console.log("PARENT CHILDREN count:", nextKids.length);
console.table(nextKids.slice(0, 5));

      console.log("PARENT TASKS count:", nextTasks.length);
      console.table(nextTasks.slice(0, 5));
    } catch (e: any) {
      const msg = e?.message || String(e);
      setApiError(msg);
      console.error("PARENT API FAIL:", e);
    }
  };
// 3.1) Экшен для Missions: подтвердить/отклонить/удалить задачу через API
const onTaskAction = async (
  taskId: string,
  action: "confirm" | "reject" | "delete"
) => {
  if (action === "delete") {
    alert("Удаление через API пока не подключено. Используй confirm/reject.");
    return;
  }

  await parentApi.confirmTask(PARENT_CODE, taskId, action);
  await refreshTasks(); // критично: сразу перетянуть свежие tasks из backend
};
  useEffect(() => {
    refreshTasks();
  }, []);
useEffect(() => {
  if (!Array.isArray(apiChildren) || apiChildren.length === 0) return;

  setChildren((prev) =>
    prev.map((uiChild: any) => {
      // 0) ЗАМОК: если уже склеен - больше не трогаем
      if (uiChild.apiChildId) return uiChild;

      // 1) MVP-матч по имени: UI "Миша" -> API "Стас" не совпадет
      // поэтому делаем дополнительный матч по inviteCode, если он есть
      const byInvite =
        uiChild.inviteCode
          ? apiChildren.find((k: any) => String(k?.invite_code ?? "") === String(uiChild.inviteCode ?? ""))
          : null;

      const byName = apiChildren.find((k: any) => {
        const a = String(k?.name ?? "").trim().toLowerCase();
        const b = String(uiChild?.name ?? "").trim().toLowerCase();
        return a && b && a === b;
      });

      const apiKid = byInvite || byName;
      if (!apiKid) return uiChild;

      return {
        ...uiChild,
        apiChildId: apiKid.id,
        // имя НЕ перетираем, иначе "Миша" станет "Стас" и ты офигеешь :)
        // name: uiChild.name,
      };
    })
  );
}, [apiChildren]);
useEffect(() => {
  const misha = (children as any[]).find((c) => c.name === "Миша");
  console.log("UI child Misha apiChildId:", misha?.apiChildId);
}, [children]);

// 4) Мост: uiChildren = UI-дети, где missions берём из API tasks + баланс берём из API children
const uiChildren: Child[] = useMemo(() => {
  return children.map((c: any) => {
    const apiId = c.apiChildId; // после "склейки" тут будет child_001

    // 4.1) Найдём этого ребёнка в ответе /api/children/list, чтобы взять актуальный баланс
    const apiKid =
      Array.isArray(apiChildren) && apiId
        ? apiChildren.find((k: any) => k.id === apiId)
        : null;

    // 4.2) Отфильтруем задачи по ребёнку + не показываем CONFIRMED
    const childTasks = Array.isArray(tasks)
      ? tasks.filter((t: any) => {
          if (!apiId) return false;
          if (!t?.child_id) return false;
          if (t.child_id !== apiId) return false;

          // подтвержденные скрываем из списков (иначе кажется что "не исчезло")
return true;
        })
      : [];

    // 4.3) tasks -> missions
    const apiMissions = childTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      reward: Number(t.reward_amount ?? 0),
      status: mapTaskStatusToMissionStatus(t.status),
      category: "api",
      isRecurring: Boolean(t.recurring),
      description: t.description ?? "",
      icon: t.icon ?? "✅",
      _raw: t,
    }));

    // 4.4) Актуальный баланс из API (если есть), иначе оставляем UI-значения
    const nextBalance = {
      confirmed: Number(apiKid?.balance ?? c.balance?.confirmed ?? 0),
      pending: Number(apiKid?.pending_balance ?? c.balance?.pending ?? 0),
    };

    if (c.name === "Миша") {
      console.log("Misha apiChildId:", apiId);
      console.log("Misha tasks matched:", childTasks.length);
      console.log("Misha missions mapped:", apiMissions.length);
      console.log("Misha balance (api/ui):", apiKid?.balance, apiKid?.pending_balance, nextBalance);
    }

    return {
      ...c,
      balance: nextBalance,
      missions: apiMissions,
    } as Child;
  });
}, [children, tasks, apiChildren]);
useEffect(() => {
  const misha = (uiChildren as any[]).find((c) => c.name === "Миша");
  console.log("UI child Misha apiChildId:", misha?.apiChildId);
  console.log("UI child Misha missions:", misha?.missions?.length);
}, [uiChildren]);

const selectedChild: Child = useMemo(() => {
  return uiChildren.find((c: any) => c.id === selectedChildId) || uiChildren[0];
}, [uiChildren, selectedChildId]);

  const pendingPrizesCount = (selectedChild as any)?.pendingPrizes?.length ?? 0;
  const pendingMissionsCount =
    (selectedChild as any)?.missions?.filter((m: any) => m.status === "pending")
      ?.length ?? 0;

  const toggleTheme = () => {
    // оставь твою реализацию (если была). Сейчас заглушка не ломает приложение.
    setTheme((prev) =>
      prev === Theme.DEEP_PURPLE ? Theme.CLASSIC_DARK : Theme.PASTEL_MINT
    );
  };

  const handleUpdateChild = (updated: Child) => {
    // обновляем базовых детей (uiChildren пересоберётся автоматически)
    setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteChild = (id: string) => {
    const newChildren = children.filter((c) => (c as any).id !== id);
    if (newChildren.length > 0) {
      setChildren(newChildren);
      if (selectedChildId === id) setSelectedChildId((newChildren[0] as any).id);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return (
          <>
            {apiError ? (
              <div className="mb-4 text-sm text-rose-400 whitespace-pre-wrap">
                API error: {apiError}
              </div>
            ) : null}
<Dashboard
  child={selectedChild}
  onUpdateChild={handleUpdateChild}
  onTaskAction={onTaskAction}
/>          </>
        );

case Tab.MISSIONS:
  return (
    <Missions
      child={selectedChild}
      allChildren={uiChildren}
      onUpdateChild={handleUpdateChild}
      onTaskAction={onTaskAction}
      parentCode={PARENT_CODE}
      onRefresh={refreshTasks}
    />
  );

      case Tab.SHOP:
        return <Shop allChildren={uiChildren} />;

      case Tab.AI_ASSISTANT:
        return <AIAssistant child={selectedChild} />;

      default:
return (
  <Dashboard
    child={selectedChild}
    onUpdateChild={handleUpdateChild}
    onTaskAction={onTaskAction}
  />
);    }
  };

  return (
    <div className="h-screen flex flex-col transition-colors duration-500 bg-black text-white">
      <header className="max-w-3xl mx-auto px-6 pt-5 pb-2 sticky top-0 z-40 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black tracking-tighter">Family Wallet</h1>

          <div className="flex gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all border border-white/5"
              title="Сменить тему"
            >
              <Palette size={20} />
            </button>

            <button
              onClick={refreshTasks}
              className="p-2.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all border border-white/5"
              title="Обновить из API"
            >
              ↻
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all border border-white/5"
              title="Настройки"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <ChildSwitcher
          children={uiChildren}
          selectedId={selectedChildId}
          onSelect={setSelectedChildId}
          onAdd={() => setIsAddChildOpen(true)}
        />
      </header>

      <main className="flex-1 overflow-y-auto scrollArea max-w-3xl mx-auto px-6 mt-6 pb-40">
        {renderContent()}
      </main>

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
            setChildren((prev) => [...prev, newChild]);
            setSelectedChildId((newChild as any).id);
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

const NavButton: React.FC<NavButtonProps> = ({
  active,
  onClick,
  icon,
  label,
  badgeCount = 0,
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
      active
        ? "text-[var(--primary)] scale-110"
        : "text-[var(--text-muted)] opacity-50 hover:opacity-100"
    }`}
  >
    <div className="relative">
      {icon}
      {badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-3 bg-rose-500 text-white text-[10px] font-black min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-lg ring-2 ring-black">
          {badgeCount}
        </span>
      )}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest">
      {label}
    </span>
  </button>
);

export default App;