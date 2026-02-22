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
  Copy,
  Check,
} from "lucide-react";

import { parentApi } from "./services/api";
import { authApi } from "./services/api";
import { makeInviteScopedKey, readSessionCache, writeSessionCache, removeSessionCache } from "./services/cache";
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

function resolveDreamImage(kid: any): string {
  const candidate =
    kid?.dream_image_url ||
    kid?.dream_image ||
    kid?.dream?.image_url ||
    kid?.dream?.image ||
    "";
  const raw = String(candidate || "").trim();
  if (raw) return raw;
  return "https://api.dicebear.com/7.x/shapes/svg?seed=dream";
}

function normalizeLookupText(value: any): string {
  return String(value || "").trim().toLowerCase();
}

type RewardImageIndex = {
  byRewardId: Record<string, string>;
  byChildTitle: Record<string, string>;
  byChildTitlePrice: Record<string, string>;
  byGlobalTitlePrice: Record<string, string>;
};

function buildRewardImageIndex(rewards: any[]): RewardImageIndex {
  const byRewardId: Record<string, string> = {};
  const byChildTitle: Record<string, string> = {};
  const byChildTitlePrice: Record<string, string> = {};
  const byGlobalTitlePrice: Record<string, string> = {};
  const byGlobalTitlePriceConflicts = new Set<string>();

  for (const reward of rewards || []) {
    const image = String(reward?.image_url || reward?.reward_image_url || "").trim();
    if (!image) continue;

    const rewardId = String(reward?.id || reward?.reward_id || "").trim();
    if (rewardId) byRewardId[rewardId] = image;

    const childId = String(reward?.child_id || "").trim();
    const title = normalizeLookupText(reward?.title || reward?.reward_title);
    const price = Number(reward?.price ?? reward?.reward_price ?? 0) || 0;

    if (childId && title) {
      byChildTitle[`${childId}__${title}`] = image;
      if (price > 0) {
        byChildTitlePrice[`${childId}__${title}__${price}`] = image;
      }
    }

    // Fallback для старых/битых purchase-записей без reward_id или с неверным child_id:
    // используем только глобально-уникальную пару title+price, чтобы не подмешивать чужие картинки.
    if (title && price > 0) {
      const globalKey = `${title}__${price}`;
      const current = byGlobalTitlePrice[globalKey];
      if (!current) {
        byGlobalTitlePrice[globalKey] = image;
      } else if (current !== image) {
        byGlobalTitlePriceConflicts.add(globalKey);
      }
    }
  }

  for (const key of byGlobalTitlePriceConflicts) {
    delete byGlobalTitlePrice[key];
  }

  return { byRewardId, byChildTitle, byChildTitlePrice, byGlobalTitlePrice };
}

function applyRewardImageIndexToPurchases(
  purchasesMap: Record<string, any[]>,
  index: RewardImageIndex
): Record<string, any[]> {
  const next: Record<string, any[]> = {};

  for (const [childId, purchases] of Object.entries(purchasesMap || {})) {
    next[childId] = (purchases || []).map((purchase: any) => {
      const existing =
        String(purchase?.reward_image_url || "").trim() ||
        String(purchase?.image_url || "").trim() ||
        "";
      if (existing) return purchase;

      const rewardId = String(purchase?.reward_id || purchase?.id || "").trim();
      const title = normalizeLookupText(purchase?.reward_title || purchase?.title);
      const price = Number(purchase?.price ?? purchase?.reward_price ?? 0) || 0;

      const byId = rewardId ? index.byRewardId[rewardId] : "";
      const byStrict = childId && title ? index.byChildTitlePrice[`${childId}__${title}__${price}`] : "";
      const bySoft = childId && title ? index.byChildTitle[`${childId}__${title}`] : "";
      const byGlobalStrict = title && price > 0 ? index.byGlobalTitlePrice[`${title}__${price}`] : "";
      const resolved = byId || byStrict || bySoft || byGlobalStrict || "";

      if (!resolved) return purchase;
      return { ...purchase, reward_image_url: resolved };
    });
  }

  return next;
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
  const [pendingDreamsByChild, setPendingDreamsByChild] = useState<Record<string, any>>({});
  const stickyRemovedTaskIdsRef = useRef<Map<string, number>>(new Map());
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
  const [childPurchases, setChildPurchases] = useState<Record<string, any[]>>({});
  const [childHistory, setChildHistory] = useState<Record<string, any[]>>({});
  const rewardImageIndexRef = useRef<RewardImageIndex>({
    byRewardId: {},
    byChildTitle: {},
    byChildTitlePrice: {},
    byGlobalTitlePrice: {},
  });
  const rewardsHydrationInFlightRef = useRef(false);
  const rewardsIndexFetchedAtRef = useRef(0);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [parentCode, setParentCode] = useState<string>("");
  const [partnerCode, setPartnerCode] = useState<string | undefined>(undefined);
  const [friendCodes, setFriendCodes] = useState<string[]>([]);
  const [codeDraft, setCodeDraft] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [createdChildInvite, setCreatedChildInvite] = useState<{ name: string; code: string } | null>(null);
  const [isChildCodeCopied, setIsChildCodeCopied] = useState(false);
  // identityKey: уникально для TG-акка (tg_user_id) или web fallback (fw_web_user_id)
  const [identityKey, setIdentityKey] = useState<string>("");
  const INVITE_KEY = useMemo(() => parentInviteStorageKey(identityKey), [identityKey]);
  const APP_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  const getAppCacheKey = useCallback((code: string) => makeInviteScopedKey("app-core", code), []);
  const getRewardsCacheKey = useCallback((code: string) => makeInviteScopedKey("rewards", code), []);
  const clearAppCache = useCallback((code: string) => {
    if (!code) return;
    removeSessionCache(getAppCacheKey(code));
    removeSessionCache(getRewardsCacheKey(code));
  }, [getAppCacheKey, getRewardsCacheKey]);

  const getReadableApiError = useCallback((raw: string | null) => {
    if (!raw) return "";
    if (raw.startsWith("NETWORK_TIMEOUT:")) {
      return "Сеть отвечает слишком долго. Проверьте VPN/интернет и нажмите «Повторить загрузку».";
    }
    if (raw.startsWith("NETWORK_UNREACHABLE:")) {
      return "Нет стабильного соединения с API. Проверьте VPN/интернет и нажмите «Повторить загрузку».";
    }
    return raw;
  }, []);

  const handleCopyChildCode = useCallback(async () => {
    if (!createdChildInvite?.code) return;
    try {
      await navigator.clipboard.writeText(createdChildInvite.code);
      setIsChildCodeCopied(true);
      setTimeout(() => setIsChildCodeCopied(false), 1800);
    } catch (err) {
      console.error("[CHILD CODE] copy failed", err);
      alert("Не удалось скопировать код. Скопируй вручную.");
    }
  }, [createdChildInvite]);

  useEffect(() => {
    if (!parentCode) return;
    setIsInitialDataLoading(true);
    setLastSyncAt(null);
    rewardImageIndexRef.current = { byRewardId: {}, byChildTitle: {}, byChildTitlePrice: {}, byGlobalTitlePrice: {} };
    rewardsHydrationInFlightRef.current = false;
    rewardsIndexFetchedAtRef.current = 0;
  }, [parentCode]);

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
      console.log('[APP] Cloud storage parentCode:', saved);
      console.log('[APP] identityKey:', identityKey);
      console.log('[APP] INVITE_KEY:', INVITE_KEY);

      // ФИКС: если сохранён TEST_BROWSER или пустой код — игнорируем
      if (saved === 'TEST_BROWSER' || !saved) {
        console.log('[APP] Invalid/empty code in cloud, clearing and opening modal');

        // ОЧИСТИТЬ Cloud Storage
        await tgCloudSet(INVITE_KEY, '');

        setParentCode("");
        setIsInviteModalOpen(true);
        return;
      }

      if (saved) {
        setParentCode(saved);
        console.log('[APP] parentCode SET from cloud:', saved);
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
  }, [parentCode]);

  useEffect(() => {
    if (!parentCode) return;
    const snapshot = readSessionCache<{
      children: any[];
      tasks: any[];
      pendingDreamsByChild?: Record<string, any>;
      childPurchases: Record<string, any[]>;
      childHistory: Record<string, any[]>;
      selectedChildId?: string;
    }>(getAppCacheKey(parentCode), APP_CACHE_MAX_AGE_MS);

    if (!snapshot) return;
    setApiChildren(snapshot.children || []);
    setChildren((snapshot.children || []) as any);
    setTasks(snapshot.tasks || []);
    setPendingDreamsByChild(snapshot.pendingDreamsByChild || {});
    setChildPurchases(snapshot.childPurchases || {});
    setChildHistory(snapshot.childHistory || {});
    if (snapshot.selectedChildId) {
      setSelectedChildId(snapshot.selectedChildId);
      selectedChildIdRef.current = snapshot.selectedChildId;
    }
  }, [parentCode, getAppCacheKey]);

  const refreshTasks = useCallback(async () => {
    const code = parentCodeRef.current;

    if (!code) {
      setApiChildren([]);
      setTasks([]);
      setPendingDreamsByChild({});
      setChildPurchases({});
      // childHistory сбросится только при явном logout
      setIsInitialDataLoading(false);
      setLastSyncAt(Date.now());
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
        balance: kid.balance,
        dream: {
          title: kid.dream_title || "Мечта",
          image: resolveDreamImage(kid),
          current: kid.dream_current || kid.balance?.confirmed || 0,
          price: kid.dream_target || 10000
        },
        missions: [],
        activities: []
      }));

      const resp = await parentApi.getTasks(code);
      let hydratedKids = nextKids;

      let nextPendingDreamsByChild: Record<string, any> = {};
      let nextPurchasesMap: Record<string, any[]> = {};
      let nextHistoryMap: Record<string, any[]> = {};

      // pending dreams (нужны для родительского одобрения новой мечты)
      try {
        const pendingDreamsResp = await parentApi.getPendingDreams(code);
        const pendingDreams = pendingDreamsResp?.dreams ?? [];

        const pendingDreamsMap: Record<string, any> = {};
        for (const dream of pendingDreams) {
          const childId = String(dream?.child_id || "");
          if (!childId) continue;
          pendingDreamsMap[childId] = dream;
        }
        nextPendingDreamsByChild = pendingDreamsMap;
        setPendingDreamsByChild(pendingDreamsMap);
      } catch (e) {
        console.error("[dreams/pending] FAILED:", e);
        nextPendingDreamsByChild = {};
        setPendingDreamsByChild({});
      }

      // active dreams (title/current/target/image) для родительского dream dashboard
      try {
        const activeDreamsResp = await parentApi.getActiveDreams(code);
        const activeDreams = activeDreamsResp?.dreams ?? [];
        const dreamsByChild: Record<string, any> = {};
        for (const dream of activeDreams) {
          const childId = String(dream?.child_id || "");
          if (!childId) continue;
          dreamsByChild[childId] = dream;
        }

        hydratedKids = nextKids.map((kid: any) => {
          const childId = String(kid?.id || "");
          const activeDream = dreamsByChild[childId];
          if (!activeDream) return kid;

          const imageFromDream = String(activeDream?.image_url || "").trim();
          const currentFromDream = Number(activeDream?.current_amount ?? kid?.dream?.current ?? 0) || 0;
          const targetFromDream = Number(activeDream?.target_amount ?? kid?.dream?.price ?? 10000) || 10000;
          const titleFromDream = String(activeDream?.title || kid?.dream?.title || "Мечта");

          return {
            ...kid,
            dream: {
              ...kid.dream,
              title: titleFromDream,
              current: currentFromDream,
              price: targetFromDream,
              image: imageFromDream || kid?.dream?.image || resolveDreamImage(kid),
            },
          };
        });
      } catch (e) {
        console.error("[dreams/active] FAILED:", e);
        hydratedKids = nextKids;
      }

      setApiChildren(hydratedKids);
      setChildren(hydratedKids as any);

      // Установить первого ребёнка ВСЕГДА (если не выбран вручную)
      if (hydratedKids.length > 0) {
        const currentSelected = selectedChildIdRef.current;
        const firstKid = hydratedKids[0].id;
        
        console.log('[auto-refresh] currentSelected:', currentSelected, 'firstKid:', firstKid);
        
        if (!currentSelected || !hydratedKids.find(k => k.id === currentSelected)) {
          console.log('[auto-refresh] ВЫБИРАЕМ ПЕРВОГО (нет выбранного или не найден):', firstKid);
          setSelectedChildId(firstKid);
          selectedChildIdRef.current = firstKid;
        }
      }

      // purchases
      try {
        const purchasesResp = await parentApi.getFamilyPurchases(code);
        const allPurchases = purchasesResp?.purchases ?? [];

        const purchasesMap: Record<string, any[]> = {};
        for (const p of allPurchases) {
          const normalizedPurchase = {
            ...p,
            reward_image_url:
              String(p?.reward_image_url || "").trim() ||
              String(p?.image_url || "").trim() ||
              "",
          };

          if (!purchasesMap[p.child_id]) purchasesMap[p.child_id] = [];
          purchasesMap[p.child_id].push(normalizedPurchase);
        }

        const hasMissingPurchaseImages = allPurchases.some(
          (p: any) =>
            !String(p?.reward_image_url || "").trim() &&
            !String(p?.image_url || "").trim()
        );

        const cachedIndex = rewardImageIndexRef.current;
        const hasCachedIndex =
          Object.keys(cachedIndex.byRewardId).length > 0 ||
          Object.keys(cachedIndex.byChildTitle).length > 0 ||
          Object.keys(cachedIndex.byChildTitlePrice).length > 0 ||
          Object.keys(cachedIndex.byGlobalTitlePrice).length > 0;

        const runtimePurchasesMap =
          hasMissingPurchaseImages && hasCachedIndex
            ? applyRewardImageIndexToPurchases(purchasesMap, cachedIndex)
            : purchasesMap;

        nextPurchasesMap = runtimePurchasesMap;
        setChildPurchases(runtimePurchasesMap);

        const hasUnresolvedPurchaseImages = Object.values(runtimePurchasesMap).some((items: any) =>
          (items || []).some(
            (p: any) =>
              !String(p?.reward_image_url || "").trim() &&
              !String(p?.image_url || "").trim()
          )
        );

        const REWARDS_INDEX_REFRESH_MS = 15 * 60 * 1000;
        const REWARDS_INDEX_UNRESOLVED_RETRY_MS = 15 * 1000;
        const rewardsIndexAgeMs = Date.now() - rewardsIndexFetchedAtRef.current;
        const shouldRefreshRewardsIndex =
          hasUnresolvedPurchaseImages &&
          !rewardsHydrationInFlightRef.current &&
          (
            !hasCachedIndex ||
            rewardsIndexAgeMs > REWARDS_INDEX_REFRESH_MS ||
            rewardsIndexAgeMs > REWARDS_INDEX_UNRESOLVED_RETRY_MS
          );

        if (shouldRefreshRewardsIndex) {
          rewardsHydrationInFlightRef.current = true;
          void (async () => {
            try {
              const rewardsResp = await parentApi.listRewards(code);
              const rewards = rewardsResp?.rewards ?? [];
              const freshIndex = buildRewardImageIndex(rewards);

              rewardImageIndexRef.current = freshIndex;
              rewardsIndexFetchedAtRef.current = Date.now();

              if (parentCodeRef.current !== code) return;
              setChildPurchases((prev) => applyRewardImageIndexToPurchases(prev, freshIndex));
            } catch (rewardsErr) {
              console.error("[rewards hydration] FAILED:", rewardsErr);
            } finally {
              rewardsHydrationInFlightRef.current = false;
            }
          })();
        }
      } catch (e) {
        console.error("[purchases] failed:", e);
        nextPurchasesMap = {};
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
        nextHistoryMap = historyMap;
        setChildHistory(historyMap);
      } catch (e) {
        console.error("[history] FAILED:", e);
        nextHistoryMap = {};
        setChildHistory({});
      }

      const nextTasksRaw = resp?.tasks ?? [];
      const now = Date.now();
      const stickyRemoved = stickyRemovedTaskIdsRef.current;

      for (const [taskId, expiresAt] of stickyRemoved.entries()) {
        if (expiresAt <= now) stickyRemoved.delete(taskId);
      }

      const nextTasks = nextTasksRaw.filter((task: any) => {
        const taskId = String(task?.id || "");
        if (!taskId) return true;
        return !stickyRemoved.has(taskId);
      });

      // Как только backend перестал отдавать задачу, снимаем "липкое скрытие".
      for (const taskId of Array.from(stickyRemoved.keys())) {
        const stillInApi = nextTasksRaw.some((task: any) => String(task?.id || "") === taskId);
        if (!stillInApi) stickyRemoved.delete(taskId);
      }

      setTasks(nextTasks);

      // NOTE:
      // Rewards prefetch is disabled because payload can be very heavy (base64 images),
      // which blocks initial app loading in WebView/VPN scenarios.
      // Shop fetches rewards on demand.
      const compactPurchasesMap: Record<string, any[]> = {};
      for (const [childId, purchases] of Object.entries(nextPurchasesMap)) {
        compactPurchasesMap[childId] = (purchases || []).map((p: any) => {
          const image = String(p?.reward_image_url || "").trim();
          return {
            ...p,
            reward_image_url: image.startsWith("data:") ? "" : image,
          };
        });
      }

      writeSessionCache(getAppCacheKey(code), {
        children: hydratedKids,
        tasks: nextTasks,
        pendingDreamsByChild: nextPendingDreamsByChild,
        childPurchases: compactPurchasesMap,
        childHistory: nextHistoryMap,
        selectedChildId: selectedChildIdRef.current || hydratedKids[0]?.id || "",
      });

      console.log("[auto-refresh] children/tasks:", hydratedKids.length, nextTasks.length);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setApiError(msg);
      console.error("PARENT API FAIL:", e);
    } finally {
      setIsInitialDataLoading(false);
      setLastSyncAt(Date.now());
    }
  }, [getAppCacheKey, getRewardsCacheKey]);

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
    const id = window.setInterval(tick, 8000);

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

      let optimisticTask: any = null;
      const stickyRemoved = stickyRemovedTaskIdsRef.current;
      setTasks((prev) => {
        optimisticTask = (prev || []).find((t: any) => String(t?.id) === String(taskId)) || null;

        if (action === "delete") {
          stickyRemoved.set(String(taskId), Date.now() + 30_000);
          return (prev || []).filter((t: any) => String(t?.id) !== String(taskId));
        }

        if (action === "confirm") {
          if (optimisticTask?.recurring) {
            return (prev || []).map((t: any) =>
              String(t?.id) === String(taskId) ? { ...t, status: "IDLE" } : t
            );
          }
          stickyRemoved.set(String(taskId), Date.now() + 30_000);
          return (prev || []).filter((t: any) => String(t?.id) !== String(taskId));
        }

        return (prev || []).map((t: any) =>
          String(t?.id) === String(taskId) ? { ...t, status: "IDLE" } : t
        );
      });

      if (optimisticTask && (action === "confirm" || action === "reject")) {
        const rewardDelta = Number(optimisticTask?.reward_amount ?? 0) || 0;
        const targetChildId = String(optimisticTask?.child_id || "");
        if (rewardDelta > 0 && targetChildId) {
          setApiChildren((prev) =>
            (prev || []).map((k: any) => {
              if (String(k?.id) !== targetChildId) return k;
              const confirmed = Number(k?.balance?.confirmed ?? 0) || 0;
              const pending = Number(k?.balance?.pending ?? 0) || 0;
              if (action === "confirm") {
                return {
                  ...k,
                  balance: {
                    ...k.balance,
                    confirmed: confirmed + rewardDelta,
                    pending: Math.max(0, pending - rewardDelta),
                  },
                };
              }
              return {
                ...k,
                balance: {
                  ...k.balance,
                  pending: Math.max(0, pending - rewardDelta),
                },
              };
            })
          );
        }
      }

      try {
        if (action === "delete") {
          await parentApi.deleteTask(code, taskId);
        } else {
          await parentApi.confirmTask(code, taskId, action);
        }
        clearAppCache(code);
        await refreshTasks();
      } catch (e) {
        stickyRemoved.delete(String(taskId));
        // Re-sync state from backend on failure to rollback optimistic UI safely.
        try {
          await refreshTasks();
        } catch {
          // ignore secondary refresh error
        }
        throw e;
      }
    },
    [clearAppCache, refreshTasks]
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
        confirmed: Number(apiKid?.balance?.confirmed ?? c.balance?.confirmed ?? 0) || 0,
        pending: Number(apiKid?.balance?.pending ?? c.balance?.pending ?? 0) || 0,
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
  const selectedPendingDream = selectedChild
    ? (pendingDreamsByChild[(selectedChild as any)?.apiChildId || ""] ||
      pendingDreamsByChild[(selectedChild as any)?.id || ""] ||
      null)
    : null;

  const handleSetDreamGoal = useCallback(
    async (dreamId: string, targetAmount: number) => {
      const code = parentCodeRef.current;
      if (!code) {
        throw new Error("Код родителя не найден.");
      }
      await parentApi.setDreamGoal(code, dreamId, targetAmount);
      clearAppCache(code);
      await refreshTasks();
    },
    [clearAppCache, refreshTasks]
  );

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
        clearAppCache(parentCode);
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
    clearAppCache(parentCode);
    setParentCode("");
    setPartnerCode(undefined);
    setFriendCodes([]);
    setCodeDraft("");
    setIsInviteModalOpen(true);
    setChildren([]);
    setApiChildren([]);
    setPendingDreamsByChild({});
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
                API error: {getReadableApiError(apiError)}
              </div>
            ) : null}
            {selectedChild ? (
              <Dashboard
                child={selectedChild}
                onUpdateChild={handleUpdateChild}
                onTaskAction={onTaskAction as any}
                pendingPurchases={childPurchases[apiChildId] || []}
                pendingDream={selectedPendingDream}
                onSetDreamGoal={handleSetDreamGoal}
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
        console.log('[APP] Rendering Shop with parentCode:', parentCode);
        return (
          <Shop
            allChildren={uiChildren}
            inviteCode={parentCode}
            currentChild={selectedChild}
          />
        );

      case Tab.AI_ASSISTANT:
        return selectedChild ? (
          <AIAssistant child={selectedChild} inviteCode={parentCode} />
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
            pendingDream={selectedPendingDream}
            onSetDreamGoal={handleSetDreamGoal}
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

          {authError ? (
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {getReadableApiError(authError)}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (isInitialDataLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-6 bg-black text-white overflow-x-clip">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 bg-[var(--primary)] animate-[appBootBar_1.2s_linear_infinite]" />
          </div>
          <style>{`
            @keyframes appBootBar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>
          <div className="mt-5 text-center">
            <p className="text-lg font-black">Загрузка данных семьи...</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Подтягиваем миссии, награды, баланс и историю
            </p>
          </div>
          {apiError ? (
            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-sm text-rose-300">Ошибка API: {getReadableApiError(apiError)}</p>
              <button
                onClick={() => refreshTasks()}
                className="mt-3 w-full rounded-xl bg-rose-500/20 py-3 text-xs font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/30"
              >
                Повторить загрузку
              </button>
            </div>
          ) : (
            <div className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Открываем приложение...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] min-h-screen flex flex-col transition-colors duration-500 bg-black text-white w-full max-w-full overflow-hidden overflow-x-clip">
      <header className="w-full px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-0 sticky top-0 z-40 bg-black max-w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black tracking-tight text-center">
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

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scrollArea max-w-3xl mx-auto px-4 md:px-6 mt-2 pb-[calc(10rem+env(safe-area-inset-bottom))] w-full max-w-full box-border">
        {renderContent()}
      </main>

      <div className="fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-0 right-0 z-50 px-4 md:px-6 w-full max-w-full box-border">
        <nav className="max-w-3xl mx-auto bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] py-4 px-6 md:px-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex items-center justify-between transition-all duration-500 w-full max-w-full box-border">
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
                const createdChildId =
                  (response as any)?.child_id ||
                  (response as any)?.childId ||
                  (response as any)?.id ||
                  "";
                let createdInviteCode =
                  (response as any)?.invite_code ||
                  (response as any)?.child_invite_code ||
                  (response as any)?.inviteCode ||
                  "";

                if (!createdInviteCode) {
                  try {
                    const listRes = await parentApi.listChildren(parentCode);
                    const createdApiChild =
                      (listRes?.children || []).find(
                        (kid: any) => String(kid?.id) === String(createdChildId)
                      ) ||
                      (listRes?.children || []).find(
                        (kid: any) =>
                          String(kid?.name || "").trim().toLowerCase() ===
                          String(newChild?.name || "").trim().toLowerCase()
                      );
                    createdInviteCode = createdApiChild?.invite_code || "";
                    console.log("[ADD CHILD] resolved child for invite:", createdApiChild);
                  } catch (err) {
                    console.error("[ADD CHILD] failed to resolve invite code:", err);
                  }
                }

                // ОБНОВИТЬ STATE С ДАННЫМИ ИЗ API
                const childWithApiId = {
                  ...newChild,
                  apiChildId: createdChildId,
                  id: createdChildId,
                  inviteCode: createdInviteCode || "",
                };
                setChildren((prev) => [...prev, childWithApiId] as any);
                setSelectedChildId(childWithApiId.id);
                selectedChildIdRef.current = childWithApiId.id;

                // ПЕРЕЗАГРУЗИТЬ ДАННЫЕ
                setTimeout(() => refreshTasks(), 500);
                if (createdInviteCode) {
                  setCreatedChildInvite({
                    name: String(newChild?.name || "Ребёнок"),
                    code: createdInviteCode,
                  });
                  setIsChildCodeCopied(false);
                } else {
                  console.warn("[ADD CHILD] invite code not resolved after create", {
                    createdChildId,
                    response,
                  });
                  alert("Ребёнок создан, но код не получен. Открой Настройки и скопируй код там.");
                }
              }
              setIsAddChildOpen(false);
            } catch (err: any) {
              console.error("[ADD CHILD] FAILED:", err);
              alert(`Ошибка создания ребёнка: ${err.message}`);
            }
          }}
        />
      )}

      {createdChildInvite && (
        <ChildInviteCodeModal
          childName={createdChildInvite.name}
          code={createdChildInvite.code}
          copied={isChildCodeCopied}
          onClose={() => setCreatedChildInvite(null)}
          onCopy={handleCopyChildCode}
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

interface ChildInviteCodeModalProps {
  childName: string;
  code: string;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
}

const ChildInviteCodeModal: React.FC<ChildInviteCodeModalProps> = ({
  childName,
  code,
  copied,
  onClose,
  onCopy,
}) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />
    <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0B0B10] p-6 sm:p-7 shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
      <h3 className="text-xl font-black tracking-tight text-white">Код для ребёнка</h3>
      <p className="mt-3 text-sm font-semibold text-white/70">
        Профиль <span className="text-white">{childName}</span> создан. Введите этот код в приложении ребёнка{" "}
        <span className="text-[var(--primary)]">@family_wallet_kids_bot</span> на его телефоне.
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center">
        <code className="font-mono text-2xl font-black tracking-[0.22em] text-white">{code}</code>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 rounded-2xl bg-[var(--primary)] px-4 py-3 font-black text-white transition-all active:scale-95"
        >
          <span className="inline-flex items-center gap-2">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Скопировано" : "Скопировать"}
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-white/15 px-4 py-3 font-black text-white/80 transition-all hover:text-white active:scale-95"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
);

export default App;
// Force rebuild Sat Feb  7 20:40:45 MSK 2026
