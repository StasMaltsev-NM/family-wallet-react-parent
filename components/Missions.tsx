import React, { useEffect, useMemo, useState } from "react";
import { Child, Mission } from "../types";
import {
  Plus,
  Trash2,
  Check,
  X,
  Trophy,
  RefreshCcw,
  Star,
  ChevronDown,
  CalendarDays,
  Users,
} from "lucide-react";
import { parentApi } from "../services/api";
import { getErrorMessage, useInstantAction } from "../hooks/useInstantAction";
interface Props {
  child: Child;
  allChildren: Child[];
  onUpdateChild: (child: Child) => void;

  // API-действие приходит из App.tsx (confirm/reject)
  onTaskAction: (taskId: string, action: "confirm" | "reject" | "delete") => Promise<void>;

  // нужно для createTask
  parentCode: string;

  // чтобы после create/confirm/reject тянуть свежие tasks
  onRefresh: () => Promise<void> | void;
}
// Реальная структура задач из backend
export type ApiTask = {
  id: string;
  family_id: string;
  child_id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  icon: string | null;
  status: "IDLE" | "WAITING" | "CONFIRMED";
  recurring?: any;
  recurring_days?: any;
  created_at?: string;
  updated_at?: string;
  child_name?: string;
};

const DAYS_OF_WEEK = [
  { id: "mon", label: "ПН" },
  { id: "tue", label: "ВТ" },
  { id: "wed", label: "СР" },
  { id: "thu", label: "ЧТ" },
  { id: "fri", label: "ПТ" },
  { id: "sat", label: "СБ" },
  { id: "sun", label: "ВС" },
];

// Маппинг статусов backend -> UI статусы (НЕ меняем смысл, это только отображение)
function mapApiStatusToUi(status: ApiTask["status"]): "pending" | "active" | "confirmed" {
  if (status === "WAITING") return "pending";
  if (status === "IDLE") return "active";
  return "confirmed";
}

const Missions: React.FC<Props> = ({ child, allChildren, onUpdateChild, onTaskAction, parentCode, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const { runInstant, isPending } = useInstantAction();
  const isCreatingMission = isPending("mission:create");
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // UI-форма (пока это локальная форма, создание через API сделаем отдельным шагом)
  const [newMission, setNewMission] = useState({
    title: "",
    reward: "",
    isRecurring: false,
    isTeam: false,
    recurrenceType: "daily",
    selectedDays: [] as string[],
  });

  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([child.id]);
  const showSoonFeatureNotice = () => {
    setActionFeedback({
      type: "info",
      message: "СКОРО: функция появится в ближайших обновлениях.",
    });
  };
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => setActionFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  useEffect(() => {
    if (!isAdding) return;
    if (allChildren.length === 1) {
      setSelectedChildIds([allChildren[0].id]);
      return;
    }
    if (selectedChildIds.length === 0) {
      setSelectedChildIds([child.id]);
    }
  }, [allChildren, child.id, isAdding, selectedChildIds.length]);
const sortedMissions: Mission[] = useMemo(() => {
  const list = Array.isArray(child.missions) ? child.missions : [];

  return [...list].sort((a: any, b: any) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return 0;
  });
}, [child.missions]);

const applyMissionActionOptimistic = (
  missionId: string,
  action: "confirm" | "reject" | "delete"
) => {
  const currentMissions = Array.isArray(child.missions) ? [...child.missions] : [];
  const index = currentMissions.findIndex((m: any) => m.id === missionId);
  if (index === -1) return;

  const mission: any = currentMissions[index];
  const nextChild: any = {
    ...child,
    balance: { ...child.balance },
    missions: currentMissions,
    activities: Array.isArray(child.activities) ? [...child.activities] : [],
  };

  if (action === "delete") {
    nextChild.missions.splice(index, 1);
    onUpdateChild(nextChild);
    return;
  }

  if (action === "confirm") {
    nextChild.balance.confirmed += mission.reward;
    nextChild.balance.pending = Math.max(0, nextChild.balance.pending - mission.reward);

    const newActivity: any = {
      id: Math.random().toString(36).slice(2, 11),
      type: "mission",
      description: `Миссия: ${mission.title}`,
      amount: mission.reward,
      date: "Сейчас",
    };
    nextChild.activities = [newActivity, ...nextChild.activities];

    if (mission.isRecurring) {
      nextChild.missions[index] = { ...mission, status: "active" };
    } else {
      nextChild.missions.splice(index, 1);
    }
  } else {
    nextChild.balance.pending = Math.max(0, nextChild.balance.pending - mission.reward);
    nextChild.missions[index] = { ...mission, status: "active" };
  }

  onUpdateChild(nextChild);
};

  // --- МОСТ: confirm/reject через API ---
const handleAction = async (
  missionId: string,
  action: "confirm" | "reject" | "delete"
) => {
  const key = `task:${action}:${missionId}`;
  if (isPending(key)) return;
  applyMissionActionOptimistic(missionId, action);
  try {
    const started = await runInstant(key, async () => onTaskAction(missionId, action));
    if (started === null) return;
  } catch (e) {
    console.error(e);
    setActionFeedback({ type: "error", message: getErrorMessage(e, "Не удалось выполнить действие по миссии.") });
    try {
      await onRefresh();
    } catch {
      // ignore refresh errors, main error already shown above
    }
  }
};

  // --- UI helpers (твои, оставляем) ---
  const toggleChildSelection = (id: string) => {
    setSelectedChildIds((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]));
  };

  const toggleDaySelection = (dayId: string) => {
    setNewMission((prev) => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayId) ? prev.selectedDays.filter((d) => d !== dayId) : [...prev.selectedDays, dayId],
    }));
  };

  // ВАЖНО: создание миссии пока локальное - чтобы UI не сломать.
  // Реальный create через backend вынесем следующим шагом, когда подтвердим endpoint.
const handleAddMission = async () => {
  if (isPending("mission:create")) return;
  if (!newMission.title || !newMission.reward || selectedChildIds.length === 0) {
    setActionFeedback({ type: "error", message: "Заполните название, награду и выберите ребёнка." });
    return;
  }

  const title = newMission.title.trim();
  const rewardAmount = Number(newMission.reward);
  if (!title || !Number.isFinite(rewardAmount) || rewardAmount <= 0) {
    setActionFeedback({ type: "error", message: "Введите корректную награду (число больше 0)." });
    return;
  }

  // 1) Готовим миссию (локальный fallback, чтобы UI не ломался)
  const teamNames = allChildren
    .filter((c: any) => selectedChildIds.includes(c.id))
    .map((c: any) => c.name);

  const missionToAdd: Mission = {
    id: Math.random().toString(36).substr(2, 9),
    title,
    reward: rewardAmount,
    status: "active",
    category: "chores",
    isRecurring: newMission.isRecurring,
    isTeam: newMission.isTeam,
    assignedToNames: newMission.isTeam ? teamNames : undefined,
  };

  setActionFeedback(null);
  setIsAdding(false);

  try {
    const started = await runInstant("mission:create", async () => {
      // 2) Если createTask уже есть - создаём в backend по каждому выбранному ребёнку
      const api: any = parentApi as any;

      if (typeof api?.createTask === "function") {
        const createResults = await Promise.allSettled(
          selectedChildIds.map((uiId) => {
            const uiChild: any = allChildren.find((c: any) => c.id === uiId);
            const childIdForApi = uiChild?.apiChildId || uiChild?.id;

            if (!childIdForApi) {
              return Promise.reject(new Error("Не найден child_id для выбранного ребёнка."));
            }

            return api.createTask(parentCode, {
              child_id: childIdForApi,
              title,
              description: null,
              reward_amount: rewardAmount,
              icon: "✅",
              status: "IDLE",
              recurring: newMission.isRecurring ? true : null,
              recurring_days:
                newMission.isRecurring && newMission.recurrenceType === "custom"
                  ? newMission.selectedDays
                  : null,
            });
          })
        );

        const successCount = createResults.filter((r) => r.status === "fulfilled").length;
        if (successCount === 0) {
          throw new Error("Миссия не создана ни для одного ребёнка.");
        }

        // подтягиваем свежие задачи из API, чтобы миссия появилась из tasks
        await onRefresh();
        if (successCount < selectedChildIds.length) {
          setActionFeedback({
            type: "info",
            message: `Создано миссий: ${successCount}. Часть детей не обновилась.`,
          });
          return;
        }
      } else {
        // 3) Fallback: если API метода нет - обновляем локально, как раньше
        allChildren.forEach((c: any) => {
          if (selectedChildIds.includes(c.id)) {
            onUpdateChild({
              ...c,
              missions: [...(c.missions || []), missionToAdd],
            });
          }
        });
      }

      // На успешном create не показываем отдельный баннер:
      // после skeleton сразу должна появляться карточка миссии.
      setActionFeedback(null);
    });
    if (started === null) return;

    // 4) Сброс формы
    setIsAdding(false);
    setNewMission({
      title: "",
      reward: "",
      isRecurring: false,
      isTeam: false,
      recurrenceType: "daily",
      selectedDays: [],
    });
    setSelectedChildIds(allChildren.length === 1 ? [allChildren[0].id] : [child.id]);
  } catch (e) {
    console.error(e);
    setActionFeedback({ type: "error", message: getErrorMessage(e, "Не удалось создать миссию.") });
  }
};

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black truncate text-white">Миссии</h2>
          <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5 truncate">
            Контроль задач и наград
          </p>
        </div>
        <div className="p-3.5 bg-white/5 rounded-2xl text-[var(--primary)] border border-white/5">
          <Trophy size={28} />
        </div>
      </div>
      {actionFeedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            actionFeedback.type === "error"
              ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
              : actionFeedback.type === "success"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
          }`}
        >
          {actionFeedback.message}
        </div>
      ) : null}

      <div className="space-y-5">
        {isCreatingMission ? (
          <div className="p-6 rounded-[2.2rem] border bg-[var(--bg-card)] border-[var(--border)] shadow-xl animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="h-8 w-32 rounded-xl bg-white/10" />
                <div className="h-10 w-52 max-w-[80%] rounded-full bg-white/10" />
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 flex-shrink-0" />
            </div>
          </div>
        ) : null}

        {sortedMissions.length === 0 && !isCreatingMission ? (
          <div className="text-center py-20 bg-[var(--bg-card)] rounded-[2.5rem] border-2 border-dashed border-[var(--border)] opacity-60">
            <p className="font-black text-[var(--text-muted)] text-[12px] uppercase tracking-widest">Активных миссий нет</p>
          </div>
        ) : (
          sortedMissions.map((mission: any) => (
            <div
              key={mission.id}
              className={`
                p-6 rounded-[2.2rem] border transition-all flex items-center justify-between gap-4 shadow-xl
                ${mission.status === "pending" ? "bg-amber-500/10 border-amber-400/40 ring-1 ring-amber-400/20" : "bg-[var(--bg-card)] border-[var(--border)]"}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2.5">
                  <p className="font-black text-xl sm:text-2xl text-white truncate leading-tight">{mission.title}</p>
                  {mission.isRecurring && <RefreshCcw size={16} className="text-[var(--primary)] animate-pulse flex-shrink-0" />}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-white/5 w-fit px-4 py-1.5 rounded-full border border-white/5">
                    <Star size={16} className="text-amber-400" fill="currentColor" />
                    <span className="text-[12px] font-black text-white uppercase tracking-wider">{mission.reward} звёзд на счёт</span>
                  </div>

                  {/* Подпись команды */}
                  {mission.isTeam && mission.assignedToNames && (
                    <div className="flex items-center gap-2 text-[var(--text-muted)] ml-1">
                      <Users size={14} className="opacity-60" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
                        Команда: {mission.assignedToNames.join(" + ")}
                      </span>
                    </div>
                  )}

                  {mission.status === "pending" && (
                    <span className="w-fit text-[10px] bg-amber-400 text-black font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-amber-400/20">
                      На проверке
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                {mission.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleAction(mission.id, "confirm")}
                      disabled={isPending(`task:confirm:${mission.id}`)}
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500 text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                    >
                      <Check size={28} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => handleAction(mission.id, "reject")}
                      disabled={isPending(`task:reject:${mission.id}`)}
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500 text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                    >
                      <X size={24} strokeWidth={3} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleAction(mission.id, "delete")}
                  disabled={isPending(`task:delete:${mission.id}`)}
                  className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setIsAdding(true)}
        className="fixed bottom-32 right-8 w-16 h-16 sm:w-20 sm:h-20 bg-[var(--primary)] text-white rounded-[2rem] shadow-[0_20px_50px_var(--primary-glow)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <Plus size={40} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[3.5rem] p-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 overflow-y-auto no-scrollbar max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 text-white flex items-center gap-4">
              <Plus className="text-[var(--primary)]" />
              Новая миссия
            </h3>

            <div className="space-y-8 mb-10">
              {/* Выбор детей */}
              <div className="space-y-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Кому назначить?</p>
                <div className="flex flex-wrap gap-3 mb-4">
                  {allChildren.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleChildSelection(c.id)}
                      className={`
                        flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300
                        ${selectedChildIds.includes(c.id)
                          ? "bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                          : "bg-white/5 border-transparent text-[var(--text-muted)] opacity-60"
                        }
                      `}
                    >
                      <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full bg-white/10" />
                      <span className="text-sm font-black uppercase tracking-widest">{c.name}</span>
                    </button>
                  ))}
                </div>

                {/* Чекбокс Командная */}
                <label
                  onClick={showSoonFeatureNotice}
                  className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl cursor-pointer hover:bg-white/[0.05] transition-all border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl transition-colors bg-white/10 text-[var(--text-muted)]">
                      <Users size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-base font-black text-white">✨ Командная миссия</span>
                    </div>
                  </div>
                  <div className="ml-3 w-[78px] shrink-0 flex flex-col items-center justify-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-[9px] font-black tracking-widest text-amber-300">СКОРО</span>
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-amber-500 rounded-lg pointer-events-none"
                      checked={false}
                      readOnly
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">О задаче</p>
                <div className="grid gap-4">
                  <input
                    type="text"
                    placeholder="Что нужно сделать?"
                    className="w-full h-16 rounded-2xl px-6 font-bold text-lg bg-black/50 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                    value={newMission.title}
                    onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                  />
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Награда (звёзд)"
                      className="w-full h-16 rounded-2xl px-6 font-bold text-lg bg-black/50 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                      value={newMission.reward}
                      onChange={(e) => setNewMission({ ...newMission, reward: e.target.value })}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <Star size={24} className="text-amber-400" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Настройка повторений */}
              <div className="space-y-4">
                <label
                  onClick={showSoonFeatureNotice}
                  className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl cursor-pointer hover:bg-white/[0.05] transition-all border border-white/5"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-3 rounded-xl transition-colors bg-white/10 text-[var(--text-muted)]">
                      <RefreshCcw size={22} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-lg font-black text-white">Повторяющаяся</span>
                    </div>
                  </div>
                  <div className="ml-3 w-[84px] shrink-0 flex flex-col items-center justify-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-[9px] font-black tracking-widest text-amber-300">СКОРО</span>
                    <input
                      type="checkbox"
                      className="w-7 h-7 accent-[var(--primary)] rounded-lg pointer-events-none"
                      checked={false}
                      readOnly
                    />
                  </div>
                </label>

                {newMission.isRecurring && (
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-3">
                      <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">График выполнения</p>
                      <div className="relative">
                        <select
                          className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-6 font-bold appearance-none outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          value={newMission.recurrenceType}
                          onChange={(e) => setNewMission({ ...newMission, recurrenceType: e.target.value })}
                        >
                          <option value="daily">Ежедневно</option>
                          <option value="weekends">По выходным</option>
                          <option value="custom">Выбрать дни недели</option>
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                      </div>
                    </div>

                    {newMission.recurrenceType === "custom" && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                          <CalendarDays size={14} /> Отметьте дни
                        </p>
                        <div className="flex justify-between gap-1.5 overflow-x-auto no-scrollbar py-1">
                          {DAYS_OF_WEEK.map((day) => (
                            <button
                              key={day.id}
                              onClick={() => toggleDaySelection(day.id)}
                              className={`
                                flex-1 min-w-[44px] h-12 rounded-xl text-[12px] font-black transition-all
                                ${newMission.selectedDays.includes(day.id)
                                  ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 scale-105"
                                  : "bg-white/5 text-[var(--text-muted)] border border-white/5 hover:bg-white/10"
                                }
                              `}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onPointerDown={() => setIsAdding(false)}
                onClick={() => setIsAdding(false)}
                className="flex-1 py-5 text-sm font-black text-[var(--text-muted)] hover:text-white transition-colors uppercase tracking-widest"
              >
                Отмена
              </button>
              <button
                onClick={handleAddMission}
                disabled={isPending("mission:create") || !newMission.title || !newMission.reward}
                className="btn-primary flex-[2] py-5 text-lg font-black rounded-2xl shadow-xl shadow-[var(--primary)]/30 active:scale-[0.98] disabled:opacity-20 disabled:grayscale transition-all"
              >
                {isPending("mission:create") ? "Создаём..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Missions;
