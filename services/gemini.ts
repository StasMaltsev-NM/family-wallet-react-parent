import type { Child, Mission } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'https://family-wallet-api.maltsevstas21.workers.dev';

type AssistantMode = 'report' | 'missions' | 'rewards';
type AssistantCardType = 'advice' | 'missions' | 'prizes';
export type AssistantReportBlock =
  | 'analytics'
  | 'expert_advice'
  | 'execution_dynamics'
  | 'learning_trends'
  | 'saving_strategy';

type AssistantPayload = {
  mode: AssistantMode;
  child_profile: Record<string, unknown>;
  behavior_stats: Record<string, unknown>;
  parent_question?: string;
  child_id?: string;
  report_block?: AssistantReportBlock;
};

const FALLBACK_MISSION_IDEAS = [
  'Убрать игрушки',
  'Заправить кровать',
  'Помыть посуду',
  'Чтение 15 минут',
  'Полить цветы',
  'Собрать рюкзак',
  'Порядок на столе',
];

const FALLBACK_REWARD_IDEAS = [
  'Мороженое',
  'Картошка фри',
  'Поход в кино',
  'Аквапарк',
  'Прогулка в парке',
  'Вечер настолок',
  'Катание на самокате',
];

const normalizeAssistantText = (value: unknown): string => {
  return String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^["«]+/, '')
    .replace(/["»]+$/, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const toSafeNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const buildMissionStats = (missions: Mission[]) => {
  const active = missions.filter((m) => m.status === 'active').length;
  const pending = missions.filter((m) => m.status === 'pending').length;
  const completed = missions.filter((m) => m.status === 'completed').length;
  const recurring = missions.filter((m) => Boolean(m.isRecurring)).length;
  const team = missions.filter((m) => Boolean(m.isTeam)).length;
  return { active, pending, completed, recurring, team };
};

const buildCommonContext = (child: Child) => {
  const missions = Array.isArray(child.missions) ? child.missions : [];
  const activities = Array.isArray(child.activities) ? child.activities : [];
  const pendingPrizes = Array.isArray(child.pendingPrizes) ? child.pendingPrizes : [];
  const missionStats = buildMissionStats(missions);
  const dreamPrice = toSafeNumber(child.dream?.price);
  const dreamCurrent = toSafeNumber(child.dream?.current);
  const dreamLeft = Math.max(0, dreamPrice - dreamCurrent);
  const dreamProgress = dreamPrice > 0 ? Math.min(100, Math.round((dreamCurrent / dreamPrice) * 100)) : 0;

  return {
    child_profile: {
      child_name: child.name,
      child_id: child.id,
      gender: child.gender || 'unspecified',
      dream_title: child.dream?.title || '',
      dream_target_stars: dreamPrice,
      dream_current_stars: dreamCurrent,
      dream_left_stars: dreamLeft,
      dream_progress_pct: dreamProgress,
    },
    behavior_stats: {
      missions_total: missions.length,
      missions_active: missionStats.active,
      missions_pending: missionStats.pending,
      missions_completed: missionStats.completed,
      missions_recurring: missionStats.recurring,
      missions_team: missionStats.team,
      pending_rewards_total: pendingPrizes.length,
      balance_confirmed: toSafeNumber(child.balance?.confirmed),
      balance_pending: toSafeNumber(child.balance?.pending),
      recent_activities: activities.slice(0, 8).map((a) => ({
        date: a.date,
        type: a.type,
        amount: toSafeNumber(a.amount),
        description: a.description,
      })),
    },
  };
};

const REPORT_PROMPT = [
  'Ты семейный психолог-коуч для родителя.',
  'Работай только по входным данным, не выдумывай факты.',
  'Без диагнозов и медицинских рекомендаций.',
  'Запрещены общие фразы в стиле "отличные новости".',
  'Ответ только на русском и строго в формате:',
  'Итог недели:',
  'Наблюдения по поведению и мотивации:',
  '- 3-5 конкретных наблюдений по данным',
  'Возможные причины (гипотезы):',
  '- 2-4 мягкие гипотезы',
  'Что попробовать на следующей неделе:',
  '- 3 конкретных шага для родителя',
  'Фраза поддержки ребёнку:',
  'Точка контроля:',
  '- 1 метрика на 7 дней',
].join('\n');

const REPORT_BLOCK_PROMPTS: Record<AssistantReportBlock, string> = {
  analytics: [
    'Сформируй блок "Аналитика ИИ".',
    'До 200 токенов.',
    'Только суть: темп выполнения, регулярность, реакция на сложность, связь "усилие → награда", риски перегруза/скуки.',
    'Без заголовков, без markdown, без списков, 2-4 коротких абзаца.',
  ].join(' '),
  expert_advice: [
    'Сформируй блок "Совет эксперта".',
    'До 150 токенов.',
    '2-3 конкретных действия для родителя на ближайшую неделю.',
    'Без заголовков и markdown, коротко и практично.',
  ].join(' '),
  execution_dynamics: [
    'Сформируй блок "Динамика выполнения".',
    'До 70 токенов.',
    '1-2 короткие фразы про скорость выполнения, откладывание, рывки, затягивание.',
    'Без заголовков и markdown.',
  ].join(' '),
  learning_trends: [
    'Сформируй блок "Тренды обучения".',
    'До 70 токенов.',
    '1-2 короткие фразы про дисциплину, самостоятельность и формирование привычки.',
    'Без заголовков и markdown.',
  ].join(' '),
  saving_strategy: [
    'Сформируй блок "Стратегия накопления".',
    'До 70 токенов.',
    '1-2 короткие фразы: стратегическое накопление против импульсивных трат и влияние промежуточных наград.',
    'Без заголовков и markdown.',
  ].join(' '),
};

const CARD_PROMPTS: Record<AssistantCardType, string> = {
  advice: [
    'Дай 1 практический совет родителю на ближайшие 48 часов.',
    'Формат: максимум 2 предложения, без воды, без вступления.',
  ].join('\n'),
  missions: [
    'Предложи 7 миссий с учетом текущей динамики ребенка.',
    'Формат: только список, каждая строка с "- ", без вступления и без нумерации.',
  ].join('\n'),
  prizes: [
    'Предложи 7 наград для ребенка с фокусом на нематериальную мотивацию.',
    'Формат: только список, каждая строка с "- ", без вступления и нумерации.',
    'Каждый пункт строго 1-3 слова (например: "Поход в кино", "Картошка фри", "Аквапарк").',
    'Без точек и длинных пояснений.',
  ].join('\n'),
};

async function callParentAssistant(inviteCode: string, payload: AssistantPayload): Promise<string> {
  if (!inviteCode) {
    throw new Error('NO_INVITE_CODE');
  }

  const response = await fetch(`${API_BASE}/api/ai-assistant/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Invite-Code': inviteCode,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const msg = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const text = normalizeAssistantText(data?.text || data?.result || '');
  if (!text) throw new Error('AI_EMPTY_RESPONSE');
  return text;
}

const toBulletList = (items: string[]): string => items.map((item) => `- ${item}`).join('\n');

const callParentAssistantWithRetry = async (
  inviteCode: string,
  payload: AssistantPayload,
  retries = 1
): Promise<string> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callParentAssistant(inviteCode, payload);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }

  throw lastError;
};

/**
 * Основная аналитика прогресса через backend Kie Gemini.
 */
export const getChildInsights = async (child: Child, inviteCode: string): Promise<string> => {
  return getAIReportBlock('analytics', child, inviteCode);
};

export const getAIReportBlock = async (
  block: AssistantReportBlock,
  child: Child,
  inviteCode: string
): Promise<string> => {
  try {
    const context = buildCommonContext(child);
    return await callParentAssistant(inviteCode, {
      mode: 'report',
      report_block: block,
      child_profile: context.child_profile,
      behavior_stats: context.behavior_stats,
      parent_question: REPORT_BLOCK_PROMPTS[block] || REPORT_PROMPT,
      child_id: child.id,
    });
  } catch (error) {
    console.error(`AI report block generation error (${block}):`, error);
    return 'Нет данных для этого блока. Попробуйте обновить позже.';
  }
};

/**
 * Генерация специализированного контента для карточек через backend Kie Gemini.
 */
export const getAIContent = async (
  type: AssistantCardType,
  child: Child,
  inviteCode: string
): Promise<string> => {
  if (type === 'advice') {
    return getAIReportBlock('expert_advice', child, inviteCode);
  }

  const mode: AssistantMode = type === 'missions' ? 'missions' : type === 'prizes' ? 'rewards' : 'report';

  try {
    const context = buildCommonContext(child);
    return await callParentAssistantWithRetry(inviteCode, {
      mode,
      child_profile: context.child_profile,
      behavior_stats: context.behavior_stats,
      parent_question: CARD_PROMPTS[type],
      child_id: child.id,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    if (type === 'prizes') return toBulletList(FALLBACK_REWARD_IDEAS);
    if (type === 'missions') return toBulletList(FALLBACK_MISSION_IDEAS);
    return 'Нет данных для генерации.';
  }
};

/**
 * Редактирование изображения с помощью ИИ.
 * Используется gemini-2.5-flash-image для редактирования на основе исходного изображения и промпта.
 */
export const editImageWithAI = async (imageSource: string, prompt: string): Promise<string | null> => {
  const apiKey = String(import.meta.env.VITE_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('[AI IMAGE EDIT] VITE_API_KEY missing, skip client-side edit');
    return null;
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    let base64Data = '';
    let mimeType = 'image/png';

    // Обработка источника изображения (URL или Data URI)
    if (imageSource.startsWith('data:')) {
      const parts = imageSource.split(',');
      if (parts.length > 1) {
        base64Data = parts[1];
        const mimeMatch = parts[0].match(/data:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }
    } else {
      // Загрузка изображения по URL и конвертация в base64
      const res = await fetch(imageSource);
      const blob = await res.blob();
      mimeType = blob.type;
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Извлечение отредактированного изображения из ответа
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image editing error:", error);
    return null;
  }
};
