
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Child, Prize } from '../types';
import { PRIZES } from '../constants';
import { parentApi } from '../services/api';
import { makeInviteScopedKey, readSessionCache, writeSessionCache } from '../services/cache';
import { getErrorMessage, useInstantAction } from '../hooks/useInstantAction';
import { Plus, ShoppingCart, Lock, Box, Check, Star, Trash2, Info, Repeat } from 'lucide-react';

interface Props {
  allChildren: Child[];
  inviteCode: string;
  currentChild?: Child;
}

type RewardsCacheEnvelope = {
  ts: number;
  data: Prize[];
};

const runtimeRewardsCache = new Map<string, RewardsCacheEnvelope>();
const MAX_PERSISTED_DATA_URI_LEN = 2048;

function normalizeRewardGroupKey(prize: Pick<Prize, 'name' | 'cost' | 'isOneTime'>): string {
  return `${String(prize.name || '').trim().toLowerCase()}|${Number(prize.cost) || 0}|${prize.isOneTime ? 1 : 0}`;
}

function pickCanonicalImageFromGroup(group: Prize[]): string {
  const candidates = group
    .filter((item) => typeof item.image_url === 'string' && item.image_url.trim().length > 0)
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  return candidates[0]?.image_url?.trim() || '';
}

function normalizeSharedRewardImages(rewards: Prize[]): Prize[] {
  if (!Array.isArray(rewards) || rewards.length === 0) return rewards;

  const grouped = new Map<string, Prize[]>();
  rewards.forEach((reward) => {
    const key = normalizeRewardGroupKey(reward);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(reward);
      return;
    }
    grouped.set(key, [reward]);
  });

  const canonicalById = new Map<string, string>();
  grouped.forEach((group) => {
    if (group.length < 2) return;
    const childIds = new Set(group.map((item) => String(item.child_id || '').trim()).filter(Boolean));
    if (childIds.size < 2) return;
    const canonicalImageUrl = pickCanonicalImageFromGroup(group);
    if (!canonicalImageUrl) return;
    group.forEach((item) => canonicalById.set(item.id, canonicalImageUrl));
  });

  if (canonicalById.size === 0) return rewards;

  let changed = false;
  const next = rewards.map((reward) => {
    const canonical = canonicalById.get(reward.id);
    if (!canonical) return reward;
    const current = String(reward.image_url || '').trim();
    if (current === canonical) return reward;
    changed = true;
    return { ...reward, image_url: canonical };
  });

  return changed ? next : rewards;
}

function readRuntimeRewardsCache(key: string, maxAgeMs: number): Prize[] | null {
  const cached = runtimeRewardsCache.get(key);
  if (!cached?.ts || !Array.isArray(cached?.data)) return null;
  if (Date.now() - cached.ts > maxAgeMs) return null;
  return cached.data;
}

function writeRuntimeRewardsCache(key: string, data: Prize[]): void {
  runtimeRewardsCache.set(key, { ts: Date.now(), data });
}

const Shop: React.FC<Props> = ({ allChildren, inviteCode, currentChild }) => {
  const REWARDS_CACHE_TTL_MS = 90_000;
  const REWARDS_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  const REWARDS_MIN_REFRESH_GAP_MS = 4_000;
  const [isAdding, setIsAdding] = useState(false);
  const [newPrize, setNewPrize] = useState({ name: '', cost: '', isPermanent: true });
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const cacheKey = inviteCode ? makeInviteScopedKey('rewards', inviteCode) : '';
  const persistentCacheKey = cacheKey ? `${cacheKey}:local` : '';
  const compactRewardsForPersistentCache = useCallback(
    (next: Prize[]): Prize[] =>
      next.map((reward) => {
        const image = typeof reward.image_url === 'string' ? reward.image_url : '';
        if (image.startsWith('data:') && image.length > MAX_PERSISTED_DATA_URI_LEN) {
          return { ...reward, image_url: '' };
        }
        return reward;
      }),
    []
  );

  const readPersistentRewardsCache = useCallback((maxAgeMs: number): Prize[] | null => {
    if (!persistentCacheKey || typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(persistentCacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { ts?: number; data?: Prize[] };
      if (!parsed?.ts || !Array.isArray(parsed?.data)) return null;
      if (Date.now() - parsed.ts > maxAgeMs) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }, [persistentCacheKey]);

  const writePersistentRewardsCache = useCallback((next: Prize[]) => {
    if (!persistentCacheKey || typeof window === 'undefined') return;
    try {
      localStorage.setItem(persistentCacheKey, JSON.stringify({ ts: Date.now(), data: next }));
    } catch {
      // no-op
    }
  }, [persistentCacheKey]);

  const [prizes, setPrizes] = useState<Prize[]>(() => {
    if (!cacheKey) return PRIZES;
    const runtimeCached = readRuntimeRewardsCache(cacheKey, REWARDS_CACHE_MAX_AGE_MS);
    if (runtimeCached) return normalizeSharedRewardImages(runtimeCached);
    const cached =
      readSessionCache<Prize[]>(cacheKey, REWARDS_CACHE_MAX_AGE_MS) ||
      readPersistentRewardsCache(REWARDS_CACHE_MAX_AGE_MS) ||
      PRIZES;
    return normalizeSharedRewardImages(cached);
  });
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(prizes.length === 0);
  const [isProgressLoading, setIsProgressLoading] = useState<boolean>(false);
  const [createFeedback, setCreateFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const prizesRef = useRef<Prize[]>(prizes);
  const rewardsInFlightRef = useRef<Promise<any[]> | null>(null);
  const rewardsLastFetchAtRef = useRef(0);
  const modalSelectionInitializedRef = useRef(false);
  const createSubmitLockRef = useRef(false);
  const rewardGroupByIdRef = useRef<Map<string, string[]>>(new Map());
  const { runInstant, isPending } = useInstantAction();

  const mapRewards = (rewards: any[]) =>
    rewards.map((r: any) => ({
      id: r.id,
      name: r.title,
      title: r.title,
      cost: r.price,
      image_url: r.image_url,
      icon: r.icon,
      child_id: r.child_id,
      image: `https://picsum.photos/seed/${r.id}/200/200.webp`,
      isOneTime: r.is_permanent === 0
    }));

  const extractRewardId = (payload: any): string | null => {
    const rewardId = payload?.reward_id || payload?.reward?.id || payload?.id || null;
    return typeof rewardId === 'string' && rewardId.trim() ? rewardId : null;
  };

  const refreshRewards = useCallback(async (options?: { showProgress?: boolean; force?: boolean }) => {
    if (!inviteCode) return [] as any[];
    const now = Date.now();

    if (!options?.force) {
      if (rewardsInFlightRef.current) {
        return rewardsInFlightRef.current;
      }
      if (prizesRef.current.length > 0 && now - rewardsLastFetchAtRef.current < REWARDS_MIN_REFRESH_GAP_MS) {
        // Троттлинг частых рефрешей: UI уже имеет свежие данные.
        return prizesRef.current as any[];
      }
    }

    const requestPromise = (async () => {
      const shouldShowProgress = Boolean(options?.showProgress && prizesRef.current.length === 0);
      if (shouldShowProgress) setIsProgressLoading(true);
      try {
        const { rewards } = await parentApi.listRewards(inviteCode);
        const mapped = mapRewards(rewards);
        const normalizedMapped = normalizeSharedRewardImages(mapped);
        setPrizes(normalizedMapped);
        if (cacheKey) {
          // Для мгновенного переключения вкладок храним полные image_url (включая data URI).
          writeSessionCache(cacheKey, normalizedMapped);
          writeRuntimeRewardsCache(cacheKey, normalizedMapped);
        }
        // В localStorage пишем компактную версию, чтобы не упираться в quota.
        writePersistentRewardsCache(compactRewardsForPersistentCache(normalizedMapped));
        rewardsLastFetchAtRef.current = Date.now();
        return rewards;
      } finally {
        if (shouldShowProgress) setIsProgressLoading(false);
      }
    })();

    rewardsInFlightRef.current = requestPromise;
    try {
      return await requestPromise;
    } finally {
      if (rewardsInFlightRef.current === requestPromise) {
        rewardsInFlightRef.current = null;
      }
    }
  }, [cacheKey, compactRewardsForPersistentCache, inviteCode, writePersistentRewardsCache]);

  const updateRewardsCache = (next: Prize[]) => {
    const normalized = normalizeSharedRewardImages(next);
    if (!cacheKey) return;
    writeSessionCache(cacheKey, normalized);
    writeRuntimeRewardsCache(cacheKey, normalized);
    writePersistentRewardsCache(compactRewardsForPersistentCache(normalized));
  };

  const rememberRewardGroup = (rewardIds: string[]) => {
    const uniqueIds = Array.from(new Set(rewardIds.filter(Boolean)));
    if (uniqueIds.length < 2) return;
    uniqueIds.forEach((id) => {
      rewardGroupByIdRef.current.set(id, uniqueIds);
    });
  };

  const mirrorImageToLinkedRewards = (
    sourceRewardId: string,
    sourceImageUrl: string,
    sourceMeta?: { title: string; price: number; isOneTime: boolean }
  ) => {
    const imageUrl = String(sourceImageUrl || '').trim();
    if (!imageUrl) return;
    const linkedIds = rewardGroupByIdRef.current.get(sourceRewardId) || [];

    setPrizes((prev) => {
      let changed = false;
      const next = prev.map((prize) => {
        if (prize.id === sourceRewardId) return prize;
        const inLinkedGroup = linkedIds.includes(prize.id);
        const sameMeta = sourceMeta
          ? prize.name === sourceMeta.title &&
            Number(prize.cost) === Number(sourceMeta.price) &&
            Boolean(prize.isOneTime) === Boolean(sourceMeta.isOneTime)
          : false;

        if (inLinkedGroup || sameMeta) {
          if (String(prize.image_url || '').trim() === imageUrl) return prize;
          changed = true;
          return { ...prize, image_url: imageUrl };
        }
        return prize;
      });

      if (changed) {
        const normalized = normalizeSharedRewardImages(next);
        updateRewardsCache(normalized);
        return normalized;
      }
      return prev;
    });
  };

  const waitForImages = async (rewardIds: string[], attempts = 18, delayMs = 5000) => {
    if (!rewardIds.length) return;
    const rewardIdSet = new Set(rewardIds);
    let mirroredImageUrl = '';

    for (let i = 0; i < attempts; i += 1) {
      try {
        const rewards = await refreshRewards();
        const createdGroup = rewards.filter((r: any) => rewardIdSet.has(r.id));
        if (!createdGroup.length) return;

        if (!mirroredImageUrl) {
          const firstReady = createdGroup.find((r: any) => typeof r.image_url === 'string' && r.image_url.trim());
          mirroredImageUrl = firstReady?.image_url || '';
        }

        if (mirroredImageUrl) {
          setPrizes((prev) => {
            let changed = false;
            const next = prev.map((prize) => {
              if (!rewardIdSet.has(prize.id)) return prize;
              if (prize.image_url) return prize;
              changed = true;
              return { ...prize, image_url: mirroredImageUrl };
            });
            if (changed) {
              updateRewardsCache(next);
              return next;
            }
            return prev;
          });
        }

        const allReady = createdGroup.every((r: any) => Boolean(r.image_url));
        if (allReady) return;
      } catch (err) {
        console.error('[SHOP POLL] error:', err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  };

  const startBackgroundImageRefresh = (rewardIds: string[]) => {
    if (!rewardIds.length) return;
    void waitForImages(rewardIds, 24, 3000);
  };

  const startSharedImageGeneration = (rewardIds: string[]) => {
    if (!inviteCode || !rewardIds.length) return;
    const leaderId = rewardIds[0];
    const rewardIdSet = new Set(rewardIds);

    void (async () => {
      try {
        // Генерируем картинку только для одного лидера группы.
        await parentApi.regenerateRewardImage(inviteCode, leaderId);
      } catch (err) {
        console.error('[SHOP CREATE] leader regenerate failed:', err);
      }

      for (let i = 0; i < 24; i += 1) {
        try {
          const rewards = await refreshRewards({ force: true });
          const leader = rewards.find((reward: any) => reward.id === leaderId);
          const leaderImageUrl = String(leader?.image_url || '').trim();

          if (leaderImageUrl) {
            mirrorImageToLinkedRewards(leaderId, leaderImageUrl, {
              title: String(leader?.title || ''),
              price: Number(leader?.price || 0),
              isOneTime: Number(leader?.is_permanent) === 0,
            });

            const groupReady = rewards
              .filter((reward: any) => rewardIdSet.has(reward.id))
              .every((reward: any) => Boolean(String(reward.image_url || '').trim()));
            if (groupReady) return;
          }
        } catch (err) {
          console.error('[SHOP CREATE] shared image poll failed:', err);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    })();
  };

  useEffect(() => {
    if (!cacheKey) return;
    const cached =
      readRuntimeRewardsCache(cacheKey, REWARDS_CACHE_MAX_AGE_MS) ||
      readSessionCache<Prize[]>(cacheKey, REWARDS_CACHE_MAX_AGE_MS) ||
      readPersistentRewardsCache(REWARDS_CACHE_MAX_AGE_MS);
    if (cached?.length) {
      setPrizes(normalizeSharedRewardImages(cached));
      setIsInitialLoading(false);
    } else {
      setIsInitialLoading(true);
    }
  }, [cacheKey, readPersistentRewardsCache]);

  useEffect(() => {
    const loadRewards = async () => {
      try {
        await refreshRewards({ showProgress: true, force: true });
      } catch (err) {
        console.error('[SHOP LOAD] error:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadRewards();
  }, [inviteCode, cacheKey, refreshRewards]);

  useEffect(() => {
    if (!isAdding) {
      modalSelectionInitializedRef.current = false;
      return;
    }
    if (modalSelectionInitializedRef.current) return;
    if (!allChildren.length) return;
    modalSelectionInitializedRef.current = true;

    if (allChildren.length === 1) {
      const onlyId = allChildren[0].apiChildId || allChildren[0].id;
      setSelectedChildIds([onlyId]);
      return;
    }
    if (currentChild) {
      setSelectedChildIds([currentChild.apiChildId || currentChild.id]);
      return;
    }
    setSelectedChildIds([]);
  }, [allChildren, currentChild, isAdding]);

  useEffect(() => {
    prizesRef.current = prizes;
  }, [prizes]);

  useEffect(() => {
    if (!createFeedback) return;
    const timer = setTimeout(() => setCreateFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [createFeedback]);

  useEffect(() => {
    if (!inviteCode) return;
    let isActive = true;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (!isActive || inFlight) return;
      if (!prizesRef.current.some((p) => !p.image_url)) return;
      inFlight = true;
      try {
        await refreshRewards();
      } catch (err) {
        console.error('[SHOP POLL] error:', err);
      } finally {
        inFlight = false;
      }
    }, REWARDS_CACHE_TTL_MS);
    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [inviteCode, refreshRewards]);

  useEffect(() => {
    if (!inviteCode) return;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshRewards({ force: true });
      }
    };
    const onFocus = () => {
      void refreshRewards({ force: true });
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [inviteCode, refreshRewards]);

  const toggleChildSelection = (id: string) => {
    setSelectedChildIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

const handleCreateReward = async () => {
  if (isPending('create-reward') || createSubmitLockRef.current) return;
  createSubmitLockRef.current = true;

  try {
    const title = newPrize.name.trim();
    const price = Number(newPrize.cost);
    const isPermanent = newPrize.isPermanent;

    if (selectedChildIds.length === 0) {
      setCreateFeedback({ type: 'error', message: 'Выберите хотя бы одного ребёнка.' });
      return;
    }

    if (!title || !Number.isFinite(price) || price <= 0) {
      setCreateFeedback({ type: 'error', message: 'Заполните корректно название и цену.' });
      return;
    }

    const selectedChildren = selectedChildIds
      .map((localId) => allChildren.find((c) => (c.apiChildId || c.id) === localId))
      .filter(Boolean) as Child[];

    const apiChildIds = Array.from(
      new Set(
        selectedChildren
          .map((child) => child.apiChildId || child.id)
          .filter((childId): childId is string => Boolean(childId))
      )
    );

    const unresolvedCount = selectedChildIds.length - apiChildIds.length;
    if (apiChildIds.length === 0) {
      setCreateFeedback({ type: 'error', message: 'Не удалось определить профиль ребёнка для API.' });
      return;
    }

    setCreateFeedback({ type: 'info', message: 'Создаём награду...' });

    // UI реагирует сразу: закрываем модалку и продолжаем запросы в фоне.
    setIsAdding(false);
    setSelectedChildIds([]);
    setNewPrize({ name: '', cost: '', isPermanent: true });

    const started = await runInstant('create-reward', async () => {
      const createResults = await Promise.allSettled(
        apiChildIds.map((childId) =>
          parentApi.createReward(inviteCode, childId, title, Math.round(price), '', isPermanent)
        )
      );

      const createdRewardIds: string[] = [];
      const createdRewardIdSet = new Set<string>();
      let failedCount = 0;

      createResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const rewardId = extractRewardId(result.value);
          if (rewardId) {
            if (!createdRewardIdSet.has(rewardId)) {
              createdRewardIdSet.add(rewardId);
              createdRewardIds.push(rewardId);
            }
            return;
          }
        }
        failedCount += 1;
      });

      if (createdRewardIds.length === 0) {
        setCreateFeedback({
          type: 'error',
          message: 'Не удалось создать награду. Проверьте сеть/VPN и попробуйте снова.',
        });
        return;
      }

      rememberRewardGroup(createdRewardIds);

      const rewardsRes = await parentApi.listRewards(inviteCode);
      const mappedRewards = normalizeSharedRewardImages(mapRewards(rewardsRes.rewards));
      setPrizes(mappedRewards);
      updateRewardsCache(mappedRewards);

      const createdRewards = mappedRewards.filter((reward) => createdRewardIds.includes(reward.id));
      const firstReady = createdRewards.find((reward) => Boolean(String(reward.image_url || '').trim()));
      if (firstReady?.image_url) {
        mirrorImageToLinkedRewards(firstReady.id, firstReady.image_url, {
          title: firstReady.name,
          price: Number(firstReady.cost),
          isOneTime: Boolean(firstReady.isOneTime),
        });
      }

      startSharedImageGeneration(createdRewardIds);
      startBackgroundImageRefresh(createdRewardIds);

      const totalIssueCount = unresolvedCount + failedCount;
      if (totalIssueCount > 0) {
        setCreateFeedback({
          type: 'info',
          message: `Создано: ${createdRewardIds.length}. Не удалось: ${totalIssueCount}.`,
        });
        return;
      }

      setCreateFeedback({
        type: 'success',
        message: `Награда создана: ${createdRewardIds.length} шт.`,
      });
    });
    if (started === null) return;
  } catch (err) {
    console.error('[SHOP CREATE] error:', err);
    setCreateFeedback({
      type: 'error',
      message: `Ошибка создания: ${getErrorMessage(err)}`,
    });
  } finally {
    createSubmitLockRef.current = false;
  }
};

  const handleDeletePrize = async (id: string) => {
    try {
      const started = await runInstant(`delete:${id}`, async () => {
        await parentApi.deleteReward(inviteCode, id);
      });
      if (started === null) return;
      setPrizes(prev => {
        const next = prev.filter(p => p.id !== id);
        updateRewardsCache(next);
        return next;
      });
    } catch (err) {
      console.error('[Shop DELETE] error:', err);
      alert('Ошибка удаления награды!');
    }
  };

  const handleRegenerateImage = async (id: string) => {
    const key = `regen:${id}`;
    if (isPending(key)) return;
    try {
      const result = await runInstant(key, async () => parentApi.regenerateRewardImage(inviteCode, id));
      if (result === null) return;
      const rewards = await refreshRewards({ showProgress: true, force: true });
      const source = rewards.find((reward: any) => reward.id === id);
      const sourceImageUrl = String(source?.image_url || '').trim();
      if (sourceImageUrl) {
        mirrorImageToLinkedRewards(id, sourceImageUrl, {
          title: String(source?.title || ''),
          price: Number(source?.price || 0),
          isOneTime: Number(source?.is_permanent) === 0,
        });
      }

      if (!result.image_ready) {
        if (result.previous_image_kept) {
          alert('Новая картинка пока не сгенерировалась. Старая картинка сохранена — попробуйте позже.');
        } else {
          alert('Картинку не удалось сгенерировать. Попробуйте позже.');
        }
      }
    } catch (err: any) {
      console.error('[Shop REGENERATE] error:', err);
      alert(`Ошибка перегенерации: ${err?.message || 'Неизвестная ошибка'}`);
    }
  };

  const currentChildApiId = currentChild?.apiChildId || currentChild?.id;
  const visiblePrizes = currentChildApiId
    ? prizes.filter((prize) => prize.child_id === currentChildApiId)
    : prizes;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {isProgressLoading ? (
        <div className="fixed top-0 left-0 right-0 z-[80] h-1 overflow-hidden bg-white/10">
          <div className="h-full w-1/3 bg-[var(--primary)] animate-[shopBar_1.2s_linear_infinite]" />
        </div>
      ) : null}
      <style>{`
        @keyframes shopBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Магазин призов</h2>
          <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5">Чем порадовать ребенка?</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[1.5rem] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white active:scale-[0.96] transition-all shadow-lg"
        >
          <Plus size={28} />
        </button>
      </div>

      {createFeedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            createFeedback.type === 'error'
              ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
              : createFeedback.type === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
          }`}
        >
          {createFeedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {isInitialLoading && visiblePrizes.length === 0 ? (
          <>
            {[1, 2].map((s) => (
              <div key={s} className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden p-6 animate-pulse">
                <div className="h-72 sm:h-80 rounded-[2rem] bg-white/5" />
                <div className="mt-6 h-8 w-2/3 bg-white/10 rounded-xl" />
                <div className="mt-3 h-4 w-1/2 bg-white/10 rounded-xl" />
                <div className="mt-6 h-14 w-full bg-white/10 rounded-2xl" />
              </div>
            ))}
          </>
        ) : visiblePrizes.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-card)] rounded-[2.5rem] border-2 border-dashed border-[var(--border)] opacity-60">
            <p className="font-black text-[var(--text-muted)] text-[12px] uppercase tracking-widest">АКТИВНЫХ НАГРАД НЕТ</p>
          </div>
        ) : (
          visiblePrizes.map(prize => (
            <div key={prize.id} className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden flex flex-col group hover:border-[var(--primary)]/30 transition-all shadow-xl">
              {/* Фото и Прайс-тег */}
            <div className="relative h-72 sm:h-80 overflow-hidden flex items-center justify-center">
              <div className="relative w-60 h-60 sm:w-72 sm:h-72 rounded-[2.5rem] bg-gradient-to-br from-white/12 via-white/6 to-white/0 border border-white/15 shadow-[0_35px_100px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.4),rgba(255,255,255,0.08)_45%,rgba(0,0,0,0)_75%)]" />
                {prize.image_url ? (
                  <img 
                    src={prize.image_url} 
                    alt={prize.title || prize.name}
                    className="relative w-full h-full object-cover scale-[1.2] transition-transform duration-500"
                  />
                ) : (
                  <div className="relative text-7xl sm:text-8xl opacity-90">{prize.icon || '🎁'}</div>
                )}
                {!prize.image_url ? (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-white/60 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                    Генерация...
                  </div>
                ) : null}
              </div>
              
              {/* Яркая плашка цены */}
              <div className="absolute top-4 right-4 px-4 py-2 bg-orange-500 rounded-2xl text-white shadow-2xl flex items-center gap-2 border border-white/20">
                  <span className="text-lg font-black">{prize.cost}</span>
                  <Star size={18} fill="currentColor" className="text-white" />
                </div>
                
                <button
                  onClick={() => handleRegenerateImage(prize.id)}
                  disabled={isPending(`regen:${prize.id}`)}
                  className="absolute top-4 left-4 p-2.5 bg-indigo-600/80 backdrop-blur-md rounded-xl text-white border border-white/10 hover:bg-indigo-500 active:scale-[0.96] transition-all disabled:opacity-50"
                  title="Перегенерировать картинку"
                >
                  <Repeat size={16} className={isPending(`regen:${prize.id}`) ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                <div>
                  <h4 className="text-xl font-black text-white leading-tight mb-2 uppercase tracking-tight">{prize.name}</h4>
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                    {prize.isOneTime ? <Box size={12} /> : <ShoppingCart size={12} />}
                    <span>{prize.isOneTime ? 'Разовая покупка' : 'Многоразовый слот'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleDeletePrize(prize.id)}
                    disabled={isPending(`delete:${prize.id}`)}
                    className="w-full py-4 bg-rose-500/10 text-rose-500 text-xs sm:text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white active:scale-[0.98] transition-all border border-rose-500/10 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {isPending(`delete:${prize.id}`) ? 'Удаляем...' : 'Удалить'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[3.5rem] p-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 overflow-y-auto no-scrollbar max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 text-white flex items-center gap-4">
              <Plus className="text-[var(--primary)]" />
              Новая награда
            </h3>
            
            <div className="space-y-8 mb-10">
              {/* Выбор детей */}
              <div className="space-y-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Для кого приз?</p>
                <div className="flex flex-wrap gap-3">
                  {allChildren.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleChildSelection(c.apiChildId || c.id)}
                      className={`
                        flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300
                        ${selectedChildIds.includes(c.apiChildId || c.id) 
                          ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)] shadow-lg' 
                          : 'bg-white/5 border-transparent text-[var(--text-muted)] opacity-60'
                        }
                      `}
                    >
                      <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full bg-white/10" />
                      <span className="text-sm font-black uppercase tracking-widest">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Детали</p>
                <div className="grid gap-4">
                  <input 
                    type="text" 
                    placeholder="Название награды" 
                    className="w-full h-16 rounded-2xl px-6 font-bold text-lg bg-black/50 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                    value={newPrize.name}
                    onChange={e => setNewPrize({...newPrize, name: e.target.value})}
                  />
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Стоимость (1-10 000 Звезд)" 
                      className="w-full h-16 rounded-2xl px-6 font-bold text-lg bg-black/50 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                      value={newPrize.cost}
                      onChange={e => setNewPrize({...newPrize, cost: e.target.value})}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <Star size={24} className="text-orange-500" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
              
              <label className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl cursor-pointer hover:bg-white/[0.06] transition-all border border-white/5 group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${newPrize.isPermanent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                    <ShoppingCart size={22} />
                  </div>
                  <div className="pr-4">
                    <span className="text-lg font-black text-white">Постоянный слот</span>
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">(Остаётся после покупки)</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="w-7 h-7 accent-indigo-500 rounded-lg cursor-pointer"
                  checked={newPrize.isPermanent}
                  onChange={e => setNewPrize({...newPrize, isPermanent: e.target.checked})}
                />
              </label>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setIsAdding(false); setSelectedChildIds([]); }} className="flex-1 py-5 text-sm font-black text-[var(--text-muted)] hover:text-white transition-colors uppercase tracking-widest">Отмена</button>
              <button 
                onClick={handleCreateReward}
                disabled={isPending('create-reward') || !newPrize.name || !newPrize.cost}
                className="btn-primary flex-[2] py-5 text-lg font-black rounded-2xl shadow-xl shadow-[var(--primary)]/30 active:scale-[0.98] disabled:opacity-20 transition-all"
              >
                {isPending('create-reward') ? 'Создаём...' : 'Создать'}
              </button>
            </div>
            {createFeedback && isAdding ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  createFeedback.type === 'error'
                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                    : createFeedback.type === 'success'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
                }`}
              >
                {createFeedback.message}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
