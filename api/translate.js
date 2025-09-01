// /api/translate.js

export default async function handler(request, response) {
    // 1. 检查请求方法是否为 POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. 从 Vercel 环境变量中获取 API 密钥
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return response.status(500).json({ error: 'API key is not configured on the server.' });
    }

    try {
        // 3. 从请求体中获取待翻译的文本
        const { text } = request.body;
        if (!text) {
            return response.status(400).json({ error: 'Text to translate is required.' });
        }

        // 4. 准备对 Gemini API 的请求
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const systemPrompt = "You are an expert translator. Translate the given Chinese text to Swedish. Provide only the direct Swedish translation, without any additional text, explanations, or quotation marks.";
        
        const payload = {
            contents: [{ parts: [{ text: text }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        // 5. 调用 Gemini API
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error('Gemini API Error:', errorBody);
            return response.status(geminiResponse.status).json({ error: `Gemini API request failed with status ${geminiResponse.status}` });
        }

        const result = await geminiResponse.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const translatedText = candidate.content.parts[0].text.trim();
            // 6. 将成功的翻译结果返回给前端
            return response.status(200).json({ translation: translatedText });
        } else {
            return response.status(500).json({ error: 'Failed to get a valid translation from the API response.' });
        }

    } catch (error) {
        console.error('Error in serverless function:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}
