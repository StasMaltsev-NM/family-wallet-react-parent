
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Use process.env.API_KEY directly as per guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Uses Gemini 2.5 Flash Image to edit images.
 */
export const editImageWithAI = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
    });

    // Iterate through parts to find the image part, as recommended in guidelines
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image editing failed:", error);
    return null;
  }
};

/**
 * Uses Gemini 3 Flash Preview to get insights about the child's progress.
 */
export const getChildInsights = async (childName: string, missionsCount: number, recentActivity: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Сгенерируй короткий, вдохновляющий совет (2 предложения) для родителя о прогрессе ребенка по имени ${childName}. 
                 У него/нее ${missionsCount} активных миссий. 
                 Последнее событие: ${recentActivity}. 
                 Формат: Профессиональный, но теплый и на русском языке.`,
      config: {
        systemInstruction: "Ты — полезный ИИ-ассистент по финансовой грамотности для семей. Отвечай всегда на русском языке.",
        temperature: 0.7,
      }
    });
    // Use .text property instead of text() method
    return response.text || "Продолжайте отличную работу! Мониторинг прогресса помогает формировать полезные привычки.";
  } catch (error) {
    console.error("Text insight failed:", error);
    return "Анализируем прогресс... Загляните через минуту!";
  }
};
