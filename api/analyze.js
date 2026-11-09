export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // Retrieve key from server environment variables
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on the Vercel server. Please add OPENAI_API_KEY in your Vercel Project Settings -> Environment Variables.'
    });
  }

  try {
    const { base64Data, mimeType = 'image/jpeg' } = req.body || {};

    if (!base64Data) {
      return res.status(400).json({ error: 'No image file data provided.' });
    }

    const prompt = `
You are an expert college academic timetable analyzer.
Analyze this image of a college/university timetable and extract the weekly schedule.

Output MUST be a single valid JSON object strictly matching this schema:
{
  "days": [
    {
      "dayName": "Monday",
      "slots": [
        {
          "subject": "Mathematics",
          "type": "Theory",
          "durationSlots": 1
        }
      ]
    }
  ]
}

Rules:
1. Identify all working weekdays present (Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday if scheduled).
2. For each day, extract all academic lecture, lab, and tutorial sessions in sequential order.
3. CRITICAL: Filter out non-attendance periods. DO NOT include:
   - Lunch Break / Recess / Tea Break / Tiffin
   - Library / Self Study / Free Period / Leisure
   - Sports / Games / Assembly / Mentorship
4. Labs / Practicals: If a lab spans 2 or 3 periods/hours (e.g., 2:00 to 4:00 PM or Periods 5 & 6), set durationSlots to 2 or 3, because colleges mark attendance for each period/hour.
5. Standardize subject names (e.g., 'Data Structures', 'Applied Mathematics', 'Operating Systems Lab', 'DBMS').
6. Classify type as "Theory", "Lab", or "Tutorial".
`;

    const requestPayload = (modelName) => ({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic timetable extraction assistant. You always respond with strictly valid JSON only.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096
    });

    let openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(requestPayload('gpt-4o'))
    });

    if (!openAiRes.ok) {
      const errBody = await openAiRes.json().catch(() => ({}));
      console.warn('gpt-4o attempt failed, trying gpt-4o-mini...', errBody?.error?.message);

      openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(requestPayload('gpt-4o-mini'))
      });

      if (!openAiRes.ok) {
        const fallbackErr = await openAiRes.json().catch(() => ({}));
        throw new Error(fallbackErr?.error?.message || errBody?.error?.message || `OpenAI error HTTP ${openAiRes.status}`);
      }
    }

    const data = await openAiRes.json();
    const rawJson = data.choices?.[0]?.message?.content;
    if (!rawJson) {
      return res.status(422).json({ error: 'OpenAI could not extract schedule from this timetable image.' });
    }

    const parsed = JSON.parse(rawJson);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Server error in api/analyze:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error while analyzing timetable with OpenAI.'
    });
  }
}
