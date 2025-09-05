// /api/translate.js

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return response.status(500).json({ error: 'API key is not configured on the server.' });
    }

    try {
        const { text, language } = request.body;
        if (!text || !language) {
            return response.status(400).json({ error: 'Text and target language are required.' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        // New, more sophisticated system prompt
        const systemPrompt = `You are an expert communication assistant. The user will describe a situation or what they want to express in Chinese. Your task is to:
1.  Understand the user's intent, context, and nuance.
2.  Generate a natural, appropriate, and idiomatic phrase in the target language (${language}) that accurately conveys the user's message.
3.  Provide a direct, literal Chinese translation of the phrase you just generated.
4.  You MUST return the result as a JSON object with two keys: "generated_phrase" (the string in the target language) and "chinese_translation" (the Chinese translation string). Do not add any extra text, explanations, or markdown formatting around the JSON object.`;

        const payload = {
            contents: [{ parts: [{ text: text }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "generated_phrase": { "type": "STRING" },
                        "chinese_translation": { "type": "STRING" }
                    },
                    required: ["generated_phrase", "chinese_translation"]
                }
            }
        };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error('Gemini API Error:', errorBody);
            return response.status(geminiResponse.status).json({ error: `Gemini API request failed.` });
        }

        const result = await geminiResponse.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            try {
                // The response from Gemini is a string that needs to be parsed into a JSON object
                const parsedResult = JSON.parse(candidate.content.parts[0].text);
                return response.status(200).json(parsedResult);
            } catch (e) {
                 console.error("Failed to parse JSON response from Gemini:", candidate.content.parts[0].text);
                 return response.status(500).json({ error: 'The API returned an invalid format.' });
            }
        } else {
            if (candidate && candidate.finishReason === 'SAFETY') {
                 return response.status(500).json({ error: 'Request blocked due to safety settings.' });
            }
            return response.status(500).json({ error: 'Failed to get a valid response from the API.' });
        }

    } catch (error) {
        console.error('Error in serverless function:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}

