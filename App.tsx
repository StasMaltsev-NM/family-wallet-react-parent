/* global Telegram */
// App.tsx (FW-REACT-PARENT-COPY)

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  LogOut,
} from "lucide-react";

import { parentApi } from "./services/api";
import { authApi } from "./services/api";
// TEMP DEBUG
declare global {
  interface Window {
    parentApi?: any;
  }
}
window.parentApi = parentApi;
console.log("[APP FILE LOADED]", new Date().toISOString());

// ===== Telegram helpers =====
function getTg(): any | null {
  return (window as any)?.Telegram?.WebApp ?? null;
}

function getTgUserId(): string {
  const id =
    (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id != null
      ? String((window as any).Telegram.WebApp.initDataUnsafe.user.id)
      : "";
  return id || "";
}

async function sha256Short(input: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    const hex = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 16);
  } catch {
    return "";
  }
}

function parentInviteStorageKey(identityKey: string) {
    if (!identityKey) return ""; // НЕ СОЗДАЁМ КЛЮЧ, ЕСЛИ identityKey ПУСТОЙ!
  return `fw_parent_invite_${identityKey}`;
}

async function tgCloudGet(key: string): Promise<string> {
  const tg = getTg();
  if (!tg?.CloudStorage?.getItem) return "";
  return await new Promise((resolve) => {
    tg.CloudStorage.getItem(key, (err: any, value: string) => {
      if (err) return resolve("");
      resolve((value || "").trim());
    });
  });
}

async function tgCloudSet(key: string, value: string): Promise<void> {
  const tg = getTg();
  if (!tg?.CloudStorage?.setItem) return;
  await new Promise((resolve) => {
    tg.CloudStorage.setItem(key, value, () => resolve(true));
  });
}

async function tgCloudDel(key: string): Promise<void> {
  const tg = getTg();
  if (!tg?.CloudStorage?.removeItem) return;
  await new Promise((resolve) => {
    tg.CloudStorage.removeItem(key, () => resolve(true));
  });
}

// backend task.status -> UI mission.status
function mapTaskStatusToMissionStatus(taskStatus: string) {
  if (taskStatus === "WAITING") return "pending";
  if (taskStatus === "CONFIRMED") return "active";
  return "active";
}

// Match task -> child
function taskBelongsToChild(task: any, child: any): boolean {
  if (child?.apiChildId && task?.child_id) return task.child_id === child.apiChildId;
  if (task?.child_id && child?.id) return task.child_id === child.id;

  if (
    typeof task?.child_name === "string" &&
    typeof child?.name === "string" &&
    task.child_name.trim().toLowerCase() === child.name.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

const App: React.FC = () => {
  console.log("[APP RENDER]");

  const BUILD_ID = import.meta.env.VITE_BUILD_ID || "no-build-id";
  console.log("BUILD_ID:", BUILD_ID);

  const __tg = (window as any)?.Telegram?.WebApp;
  console.log("[TG DEBUG] hasTG=", !!__tg);
  console.log("[TG DEBUG] userId=", __tg?.initDataUnsafe?.user?.id);
  console.log("[TG DEBUG] initDataLen=", String(__tg?.initData ?? "").length);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('parent-theme');
    return (saved as Theme) || Theme.DEEP_PURPLE;
  });
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);

  const [children, setChildren] = useState<Child[]>(INITIAL_CHILDREN);
  const [selectedChildId, setSelectedChildId] = useState<string>(
    INITIAL_CHILDREN[0]?.id ?? ""
  );
  const selectedChildIdRef = useRef<string>(selectedChildId);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);

  const [tasks, setTasks] = useState<any[]>([]);
  const [apiChildren, setApiChildren] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [childPurchases, setChildPurchases] = useState<Record<string, any[]>>({});
  const [childHistory, setChildHistory] = useState<Record<string, any[]>>({});

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [parentCode, setParentCode] = useState<string>("");
  const [partnerCode, setPartnerCode] = useState<string | undefined>(undefined);
  const [friendCodes, setFriendCodes] = useState<string[]>([]);
  const [codeDraft, setCodeDraft] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // identityKey: уникально для TG-акка (tg_user_id) или web fallback (fw_web_user_id)
  const [identityKey, setIdentityKey] = useState<string>("");
  const INVITE_KEY = useMemo(() => parentInviteStorageKey(identityKey), [identityKey]);

  // Telegram: ready/expand + layout
  useEffect(() => {
    const tg = getTg();
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

  // theme
  useEffect(() => {
    document.body.setAttribute("data-theme", `${theme}`);
  }, [theme]);

  // compute identityKey once
  useEffect(() => {
    const id = getTgUserId();
    const key = id ? `id_${id}` : "";
    setIdentityKey(key);

    console.log("[IDENTITY]", {
      rawId: id,
      identityKey: key,
      hasTG: !!getTg(),
      initDataLen: String(getTg()?.initData ?? "").length,
    });
  }, []);

  // load parentCode for this identityKey
  useEffect(() => {
    (async () => {
      if (!identityKey) {
        setParentCode("");
        setIsInviteModalOpen(true);
        return;
      }

      const saved = await tgCloudGet(INVITE_KEY);

      if (saved) {
        setParentCode(saved);
        setIsInviteModalOpen(false);

        // Загрузить коды семьи
        try {
          const codes = await parentApi.getFamilyCodes(saved);
          setPartnerCode(codes.partnerCode || undefined);
          setFriendCodes(codes.friendCodes);
          console.log('[FAMILY CODES] (restored)', codes);
        } catch (err) {
          console.error('[FAMILY CODES] ERROR:', err);
        }
      } else {
        setParentCode("");
        setIsInviteModalOpen(true);
      }
    })();
  }, [identityKey, INVITE_KEY]);
  // NEW AUTH: backend Telegram auth via initData
useEffect(() => {
  // Новый AUTH через backend (приоритет!)
  const initAuth = async () => {
    const tg = getTg();
    const initData = tg?.initData ?? "";
    
    const p = new URLSearchParams(initData);
    console.log("[NEW AUTH] initData len:", initData.length);
    console.log("[NEW AUTH] initData head:", initData.slice(0, 300));
    console.log("[NEW AUTH] hash:", p.get("hash"));
    console.log("[NEW AUTH] keys:", Array.from(p.keys()));
    
      if (initData && !isInviteModalOpen) { // ← ДОБАВЬ !isInviteModalOpen
      console.log('[NEW AUTH] Запускаем (даже если parentCode есть)', { initData: initData.substring(0, 50) + '...' });
      setIsAuthLoading(true);
      
      try {
        const result = await authApi.authenticateWithTelegram(initData, parentCode || undefined);
        console.log('[NEW AUTH] SUCCESS:', result);
        
        if (result.status === 'authenticated' && result.invite_code) {
          const newCode = result.invite_code;
          
          // УСТАНОВИТЬ КОД СРАЗУ!
          setParentCode(newCode);
          parentCodeRef.current = newCode;  // ← КРИТИЧНО!
          
          setIsInviteModalOpen(false);
          await tgCloudSet(INVITE_KEY, newCode); // Сохраняем в Cloud
          
          // ПЕРЕЗАГРУЗИТЬ ДАННЫЕ НОВОЙ СЕМЬИ!
          setTimeout(() => refreshTasks(), 1000);

          // Загрузить коды семьи
          try {
            const codes = await parentApi.getFamilyCodes(newCode);
            setPartnerCode(codes.partnerCode || undefined);
            setFriendCodes(codes.friendCodes);
            console.log('[FAMILY CODES]', codes);
          } catch (err) {
            console.error('[FAMILY CODES] ERROR:', err);
          }
        } else if (result.status === 'needs_invite') {
          setIsInviteModalOpen(true);
        }
        
        setAuthError(null);
      } catch (err: any) {
        console.error('[NEW AUTH] FAILED:', err);
        setAuthError(err.message || 'Ошибка авторизации');
        
        // Fallback к старому AUTH
        if (!parentCode) {
          setIsInviteModalOpen(true);
        }
      } finally {
        setIsAuthLoading(false);
      }
    } else {
      console.log('[NEW AUTH] No Telegram initData - skip');
      
      // Fallback к старому AUTH только если НЕТ initData
      if (!parentCode) {
        setIsInviteModalOpen(true);
      }
    }
  };

  // Запускаем ВСЕГДА (приоритет новому AUTH!)
  initAuth();
}, []);

  useEffect(() => {
    console.log("[AUTH STATE]", {
      identityKey,
      INVITE_KEY,
      parentCode,
      isInviteModalOpen,
    });
  }, [identityKey, INVITE_KEY, parentCode, isInviteModalOpen]);

  // ===== refreshTasks =====
  const parentCodeRef = useRef<string>("");
  useEffect(() => {
    parentCodeRef.current = parentCode;
  }, []);

  const refreshTasks = useCallback(async () => {
    const code = parentCodeRef.current;

if (!code) {
  setApiChildren([]);
  setTasks([]);
  setChildPurchases({});
  // childHistory сбросится только при явном logout
  return;
}

    try {
      console.log("[auto-refresh] tick", new Date().toLocaleTimeString());
      setApiError(null);

      const kidsResp = await parentApi.listChildren(code);
      const rawKids = kidsResp?.children ?? [];

      // ТРАНСФОРМАЦИЯ: добавляем dream, missions, activities
      const nextKids = rawKids.map((kid: any) => ({
        ...kid,
        apiChildId: kid.id,
        inviteCode: kid.invite_code || "",
        gender: kid.gender || 'male',
        balance: {
          confirmed: kid.balance || 0,
          pending: kid.pending_balance || 0
        },
        dream: {
          title: kid.dream_title || "Мечта",
          image: "https://api.dicebear.com/7.x/shapes/svg?seed=dream",
          current: kid.dream_current || kid.balance || 0,
          price: kid.dream_target || 10000
        },
        missions: [],
        activities: []
      }));

      setApiChildren(nextKids);
      setChildren(nextKids as any);

      // Установить первого ребёнка ВСЕГДА (если не выбран вручную)
      if (nextKids.length > 0) {
        const currentSelected = selectedChildIdRef.current;
        const firstKid = nextKids[0].id;
        
        console.log('[auto-refresh] currentSelected:', currentSelected, 'firstKid:', firstKid);
        
        if (!currentSelected || !nextKids.find(k => k.id === currentSelected)) {
          console.log('[auto-refresh] ВЫБИРАЕМ ПЕРВОГО (нет выбранного или не найден):', firstKid);
          setSelectedChildId(firstKid);
          selectedChildIdRef.current = firstKid;
        }
      }

      const resp = await parentApi.getTasks(code);

      // purchases
      try {
        const purchasesResp = await parentApi.getFamilyPurchases(code);
        const allPurchases = purchasesResp?.purchases ?? [];

        const purchasesMap: Record<string, any[]> = {};
        for (const p of allPurchases) {
          if (!purchasesMap[p.child_id]) purchasesMap[p.child_id] = [];
          purchasesMap[p.child_id].push(p);
        }
        setChildPurchases(purchasesMap);
      } catch (e) {
        console.error("[purchases] failed:", e);
        setChildPurchases({});
      }

      // history
      try {
        const historyResp = await parentApi.getHistory(code);
        const historyItems = historyResp?.history || [];

        const historyMap: Record<string, any[]> = {};
        for (const item of historyItems) {
          if (!historyMap[item.child_id]) historyMap[item.child_id] = [];
          historyMap[item.child_id].push({
            id: item.id,
            type: item.type === "task" ? "mission" : "purchase",
            description: item.title,
            amount: item.amount,
            date: item.created_at,
          });
        }
        setChildHistory(historyMap);
      } catch (e) {
        console.error("[history] FAILED:", e);
        setChildHistory({});
      }

      const nextTasks = resp?.tasks ?? [];
      setTasks(nextTasks);

      console.log("[auto-refresh] children/tasks:", nextKids.length, nextTasks.length);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setApiError(msg);
      console.error("PARENT API FAIL:", e);
    } finally {
      setLastSyncAt(Date.now());
    }
  }, []);

  // auto refresh loop
  useEffect(() => {
    let alive = true;
    console.log("[auto-refresh] mounted");

    const tick = async () => {
      if (!alive) return;
      try {
        await refreshTasks();
      } catch (e) {
        console.warn("[auto-refresh] tick failed", e);
      }
    };

    tick();
    const id = window.setInterval(tick, 3000);

    return () => {
      alive = false;
      window.clearInterval(id);
      console.log("[auto-refresh] cleanup");
    };
  }, [refreshTasks]);

  // task actions
  const onTaskAction = useCallback(
    async (taskId: string, action: "confirm" | "reject" | "delete") => {
      const code = parentCodeRef.current;
      if (!code) return;

      if (action === "delete") {
        await parentApi.deleteTask(code, taskId);
        await refreshTasks();
        return;
      }

      await parentApi.confirmTask(code, taskId, action);
      await refreshTasks();
    },
    [refreshTasks]
  );

  // lock-in apiChildId mapping once found
  useEffect(() => {
    if (!Array.isArray(apiChildren) || apiChildren.length === 0) return;

    setChildren((prev) =>
      prev.map((uiChild: any) => {
        if (uiChild.apiChildId) return uiChild;

        const byInvite = uiChild.inviteCode
          ? apiChildren.find(
              (k: any) =>
                String(k?.invite_code ?? "") === String(uiChild.inviteCode ?? "")
            )
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
        };
      })
    );
  }, [apiChildren]);

  // bridge: UI children + missions/balance/history from API
  const uiChildren: Child[] = useMemo(() => {
    return children.map((c: any) => {
      const apiId = c.apiChildId;

      let apiKid = apiId ? apiChildren.find((k: any) => k?.id === apiId) : null;
      if (!apiKid) {
        apiKid =
          apiChildren.find(
            (k: any) =>
              String(k?.name || "").trim() === String(c?.name || "").trim()
          ) || null;
      }

      const historyKey: string | undefined = apiKid?.id || apiId;

      const nextBalance = {
        confirmed: Number(apiKid?.balance ?? c.balance?.confirmed ?? 0) || 0,
        pending: Number(apiKid?.pending_balance ?? c.balance?.pending ?? 0) || 0,
      };

      const childTasks = Array.isArray(tasks)
        ? tasks.filter(
            (t: any) => taskBelongsToChild(t, c) && t.status !== "CONFIRMED"
          )
        : [];

      const apiMissions = childTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        reward: Number(t.reward_amount ?? 0),
        status: mapTaskStatusToMissionStatus(String(t.status || "")),
        category: "api",
        isRecurring: Boolean(t.recurring),
        description: t.description ?? "",
        icon: t.icon ?? "✅",
        _raw: t,
      }));

      return {
        ...c,
        balance: nextBalance,
        missions: apiMissions,
        activities: historyKey ? (childHistory[historyKey] || []) : [],
      } as Child;
    });
  }, [children, tasks, apiChildren, childHistory]);

  const selectedChild: Child = useMemo(() => {
    if (!selectedChildId) return null as any;
    return (
      (uiChildren as any).find((c: any) => c.id === selectedChildId) ||
      uiChildren[0] ||
      (null as any)
    );
  }, [uiChildren, selectedChildId]);

  const apiChildId = (selectedChild as any)?.apiChildId;
  const pendingPrizesCount =
    childPurchases[apiChildId]?.filter((p: any) => p.status === "pending").length ??
    0;
  const pendingMissionsCount = selectedChild
    ? ((selectedChild as any).missions?.filter((m: any) => m.status === "pending")?.length ?? 0)
    : 0;

  const toggleTheme = () => {
    setTheme((prev) => {
      const themes = [Theme.DEEP_PURPLE, Theme.CLASSIC_DARK, Theme.PASTEL_MINT, Theme.EMERALD_NIGHT];
      const currentIndex = themes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themes.length;
      const next = themes[nextIndex];
      localStorage.setItem('parent-theme', next);
      return next;
    });
  };

  const handleUpdateChild = (updated: Child) => {
    setChildren((prev) =>
      prev.map((c: any) => (c.id === (updated as any).id ? updated : c))
    );
  };

  const handleDeleteChild = async (id: string) => {
    try {
      // УДАЛИТЬ ИЗ API!
      if (parentCode) {
        // НАЙТИ РЕБЁНКА ПО ID
        const childToDelete = children.find((c: any) => c.id === id);
        const apiId = childToDelete?.apiChildId || childToDelete?.id || id;

        console.log("[DELETE CHILD] Удаляем:", { localId: id, apiId });

        await parentApi.deleteChild(parentCode, apiId);
        console.log("[DELETE CHILD] Успешно удалён:", apiId);
      }

      // УДАЛИТЬ ИЗ STATE
      const newChildren = (children as any[]).filter((c) => c.id !== id);
      setChildren(newChildren as any);

      // ЕСЛИ УДАЛИЛИ ВЫБРАННОГО → ВЫБРАТЬ ПЕРВОГО (ИЛИ NULL)
      if (selectedChildId === id) {
        const nextId = newChildren[0]?.id ?? "";
        setSelectedChildId(nextId);
        selectedChildIdRef.current = nextId;
      }

      // ПЕРЕЗАГРУЗИТЬ ДАННЫЕ
      setTimeout(() => refreshTasks(), 500);
    } catch (err: any) {
      console.error("[DELETE CHILD] FAILED:", err);
      alert(`Ошибка удаления: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setParentCode("");
    setPartnerCode(undefined);
    setFriendCodes([]);
    setCodeDraft("");
    setIsInviteModalOpen(true);
    setChildren([]);
    setApiChildren([]);
    setSelectedChildId("");
    selectedChildIdRef.current = "";
  };

  const renderContent = () => {
    // ЗАЩИТА ОТ NULL!
    if (!selectedChild && uiChildren.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold mb-2 text-white">Добро пожаловать!</h2>
          <p className="text-white/60 mb-6">Добавьте первого ребёнка, чтобы начать</p>
          <button
            onClick={() => setIsAddChildOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold hover:scale-105 transition-transform"
          >
            + Добавить ребёнка
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case Tab.DASHBOARD:
        return (
          <>
            {apiError ? (
              <div className="mb-4 text-sm text-rose-400 whitespace-pre-wrap">
                API error: {apiError}
              </div>
            ) : null}
            {selectedChild ? (
              <Dashboard
                child={selectedChild}
                onUpdateChild={handleUpdateChild}
                onTaskAction={onTaskAction as any}
                pendingPurchases={childPurchases[apiChildId] || []}
              />
            ) : (
              <div className="text-center py-12 text-white/60">
                Выберите ребёнка
              </div>
            )}
          </>
        );

      case Tab.MISSIONS:
        return selectedChild ? (
          <Missions
            child={selectedChild}
            allChildren={uiChildren}
            onUpdateChild={handleUpdateChild}
            onTaskAction={onTaskAction as any}
            parentCode={parentCode}
            onRefresh={refreshTasks as any}
          />
        ) : (
          <div className="text-center py-12 text-white/60">
            Выберите ребёнка
          </div>
        );

      case Tab.SHOP:
        return (
          <Shop
            allChildren={uiChildren}
            inviteCode={parentCode}
            currentChild={selectedChild}
          />
        );

      case Tab.AI_ASSISTANT:
        return selectedChild ? (
          <AIAssistant child={selectedChild} />
        ) : (
          <div className="text-center py-12 text-white/60">
            Выберите ребёнка
          </div>
        );

      default:
        return selectedChild ? (
          <Dashboard
            child={selectedChild}
            onUpdateChild={handleUpdateChild}
            onTaskAction={onTaskAction as any}
          />
        ) : (
          <div className="text-center py-12 text-white/60">
            Выберите ребёнка
          </div>
        );
    }
  };

  // ===== Auth gate =====
  if (!parentCode) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: "#0b0b10", color: "#fff" }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-6"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="text-xl font-semibold">Вход родителя</div>
          <div className="mt-2 text-sm" style={{ opacity: 0.8 }}>
            Введи код родителя. Он сохранится в этом Telegram аккаунте.
          </div>

          <input
            className="mt-4 w-full rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", outline: "none" }}
            placeholder="Код родителя"
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
          />

          <button
            className="mt-4 w-full rounded-xl px-4 py-3 font-semibold"
            style={{ backgroundColor: "#7c3aed" }}
            onClick={async () => {
              const v = (codeDraft || "").trim();
              if (!v) return;

              // ПОВТОРЯЕМ AUTH С НОВЫМ КОДОМ
              setIsAuthLoading(true);
              try {
                const tg = getTg();
                const initData = tg?.initData ?? "";
                if (initData) {
                  const result = await authApi.authenticateWithTelegram(initData, v);
                  console.log('[INVITE MODAL] AUTH RESULT:', result);
                  
                  if (result.status === 'authenticated' && result.invite_code) {
                    const newCode = result.invite_code;
                    
                    // УСТАНОВИТЬ КОД СРАЗУ!
                    setParentCode(newCode);
                    parentCodeRef.current = newCode;  // ← КРИТИЧНО!
                    
                    // СОХРАНЯЕМ В CLOUD!
                    await tgCloudSet(INVITE_KEY, newCode);
                    
                    setIsInviteModalOpen(false);
                    setAuthError(null);
                    setCodeDraft("");
                    
                    // ПЕРЕЗАГРУЗИТЬ ДАННЫЕ НОВОЙ СЕМЬИ!
                    setTimeout(() => refreshTasks(), 1000);
                  } else if (result.status === 'needs_invite') {
                    setAuthError('Неверный код приглашения');
                    setIsInviteModalOpen(true);
                  }
                }
              } catch (err: any) {
                console.error('[INVITE MODAL] AUTH FAILED:', err);
                setAuthError(err.message || 'Недействительный код');
                setIsInviteModalOpen(true);
                // НЕ ЗАКРЫВАЕМ МОДАЛКУ!
              } finally {
                setIsAuthLoading(false);
              }
            }}
          >
            Продолжить
          </button>

          <button
            className="mt-3 w-full rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            onClick={async () => {
              if (identityKey) await tgCloudDel(INVITE_KEY);
              setCodeDraft("");
              setParentCode("");
              setIsInviteModalOpen(true);
            }}
          >
            Сбросить код
          </button>
        </div>
      </div>
    );
  }

  // СТРАХОВКА ОТ КРАША — ЕСЛИ НЕТ ДЕТЕЙ!
    if (!selectedChild && uiChildren.length === 0 && lastSyncAt === 0) {
    return (
      <div style={{ 
        padding: 24, 
        color: "#fff", 
        background: "#1a1a2e", 
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        gap: 12
      }}>
        <div>🔄 Загрузка профиля...</div>
        <div style={{ fontSize: 14, opacity: 0.6 }}>
          {parentCode ? `Код: ${parentCode}` : 'Ожидание авторизации'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col transition-colors duration-500 bg-black text-white">
      <header className="w-full px-4 pt-5 pb-2 sticky top-0 z-40 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black tracking-tighter">
            В<span className="text-amber-400">Э</span>Й!
          </h1>

          <div className="flex gap-2 items-center">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all border border-white/5"
              title="Сменить тему"
            >
              <Palette size={20} />
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
          onSelect={(id: string) => {
            setSelectedChildId(id);
            selectedChildIdRef.current = id;
          }}
          onAdd={() => setIsAddChildOpen(true)}
          childPurchases={childPurchases}
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
            badgeCount={selectedChild ? (pendingPrizesCount + pendingMissionsCount) : 0}
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
          setChildren={setChildren as any}
          onDeleteChild={handleDeleteChild as any}
          onClose={() => setIsSettingsOpen(false)}
          onOpenAddChild={() => {
            setIsSettingsOpen(false);
            setIsAddChildOpen(true);
          }}
          parentCode={parentCode}
          partnerCode={partnerCode}
          friendCodes={friendCodes}
          onLogout={handleLogout}
        />
      )}

      {isAddChildOpen && (
        <AddChildScreen
          onCancel={() => setIsAddChildOpen(false)}
          onAdd={async (newChild: any) => {
            try {
              // СОЗДАТЬ РЕБЁНКА В API!
              if (parentCode) {
                const response = await parentApi.addChild(parentCode, {
                  name: newChild.name,
                  role: "child",
                  age: newChild.age || 10,
                  gender: newChild.gender || "male",
                  avatar: newChild.avatar,
                  dream_title: newChild.dream?.title || "",
                  dream_price: newChild.dream?.price || 0,
                  dream_image: newChild.dream?.image || "",
                });
                console.log("[ADD CHILD] Успешно создан:", response);

                // ОБНОВИТЬ STATE С ДАННЫМИ ИЗ API
                const childWithApiId = {
                  ...newChild,
                  apiChildId: response.child_id,
                  id: response.child_id,
                };
                setChildren((prev) => [...prev, childWithApiId] as any);
                setSelectedChildId(childWithApiId.id);
                selectedChildIdRef.current = childWithApiId.id;

                // ПЕРЕЗАГРУЗИТЬ ДАННЫЕ
                setTimeout(() => refreshTasks(), 500);
              }
              setIsAddChildOpen(false);
            } catch (err: any) {
              console.error("[ADD CHILD] FAILED:", err);
              alert(`Ошибка создания ребёнка: ${err.message}`);
            }
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
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
