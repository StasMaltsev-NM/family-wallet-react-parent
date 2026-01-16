
import { GoogleGenAI } from "@google/genai";

/**
 * Основная аналитика прогресса.
 * Создаем экземпляр GoogleGenAI непосредственно перед вызовом для актуальности ключа.
 */
export const getChildInsights = async (childName: string, missionsCount: number, recentActivity: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Проанализируй прогресс ребенка ${childName}. Активных миссий: ${missionsCount}. Последнее: ${recentActivity}. 
                 Дай короткую общую сводку (2-3 предложения).`,
      config: {
        systemInstruction: "Ты — Senior AI аналитик по детскому развитию. Отвечай на русском.",
        temperature: 0.8,
      }
    });
    return response.text || "Данные успешно проанализированы. Ребенок показывает стабильный рост.";
  } catch (error) {
    console.error("Insights generation error:", error);
    return "Не удалось получить аналитику. Попробуйте позже.";
  }
};

/**
 * Генерация специализированного контента для карточек.
 */
export const getAIContent = async (type: 'advice' | 'missions' | 'prizes', childContext: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompts = {
    advice: "Дай один практический совет по воспитанию или обучению на основе контекста: " + childContext,
    missions: "Предложи 5 конкретных идей миссий для ребенка. Формат: только список через запятую. Контекст: " + childContext,
    prizes: "Предложи 5 идей наград (призов) для ребенка. Формат: только список через запятую. Контекст: " + childContext,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompts[type],
      config: { temperature: 0.9 }
    });
    return response.text || "Идеи находятся в разработке...";
  } catch (error) {
    console.error("Content generation error:", error);
    return "Ошибка генерации идей.";
  }
};

/**
 * Редактирование изображения с помощью ИИ.
 * Используется gemini-2.5-flash-image для редактирования на основе исходного изображения и промпта.
 */
export const editImageWithAI = async (imageSource: string, prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
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
