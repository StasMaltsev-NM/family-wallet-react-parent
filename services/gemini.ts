
import { GoogleGenAI } from "@google/genai";

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'https://family-wallet-api.maltsevstas21.workers.dev';

async function callParentAssistant(
  inviteCode: string,
  payload: {
    mode: 'report' | 'missions' | 'rewards';
    child_profile: Record<string, unknown>;
    behavior_stats: Record<string, unknown>;
    parent_question?: string;
    child_id?: string;
  }
): Promise<string> {
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

  const text = data?.text || data?.result || '';
  if (!text) throw new Error('AI_EMPTY_RESPONSE');
  return String(text);
}

/**
 * Основная аналитика прогресса через backend Kie Gemini.
 */
export const getChildInsights = async (
  childName: string,
  missionsCount: number,
  recentActivity: string,
  inviteCode: string,
  childId?: string
): Promise<string> => {
  try {
    return await callParentAssistant(inviteCode, {
      mode: 'report',
      child_profile: {
        child_name: childName,
      },
      behavior_stats: {
        missions_count_hint: missionsCount,
        recent_activity_hint: recentActivity,
      },
      parent_question: 'Сделай короткую сводку прогресса и рекомендации на ближайшую неделю.',
      child_id: childId,
    });
  } catch (error) {
    console.error('Insights generation error:', error);
    return 'Не удалось получить аналитику. Попробуйте позже.';
  }
};

/**
 * Генерация специализированного контента для карточек через backend Kie Gemini.
 */
export const getAIContent = async (
  type: 'advice' | 'missions' | 'prizes',
  childContext: string,
  inviteCode: string,
  childId?: string
): Promise<string> => {
  const mode = type === 'missions' ? 'missions' : type === 'prizes' ? 'rewards' : 'report';
  const parentQuestion =
    type === 'advice'
      ? `Дай один практический совет для родителя на основе контекста: ${childContext}`
      : undefined;

  try {
    return await callParentAssistant(inviteCode, {
      mode,
      child_profile: { context_hint: childContext },
      behavior_stats: { source: 'parent_app_ai_cards' },
      parent_question: parentQuestion,
      child_id: childId,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return 'Ошибка генерации идей.';
  }
};

/**
 * Редактирование изображения с помощью ИИ.
 * Используется gemini-2.5-flash-image для редактирования на основе исходного изображения и промпта.
 */
export const editImageWithAI = async (imageSource: string, prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY as string });
  
  try {
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
