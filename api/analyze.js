import { GoogleGenAI, Type } from '@google/genai';

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
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the Vercel server. Please add GEMINI_API_KEY in your Vercel Project Settings -> Environment Variables.'
    });
  }

  try {
    const { base64Data, mimeType = 'image/jpeg' } = req.body || {};

    if (!base64Data) {
      return res.status(400).json({ error: 'No image or PDF file data provided.' });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    const prompt = `
You are an expert college academic timetable analyzer.
Analyze this image or document of a college/university timetable and extract the weekly schedule:

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

    const requestConfig = {
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            days: {
              type: Type.ARRAY,
              description: 'List of days of the week in the timetable',
              items: {
                type: Type.OBJECT,
                properties: {
                  dayName: {
                    type: Type.STRING,
                    description: 'Name of the day: Monday, Tuesday, Wednesday, Thursday, Friday, or Saturday'
                  },
                  slots: {
                    type: Type.ARRAY,
                    description: 'List of academic classes/labs on this day',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        subject: {
                          type: Type.STRING,
                          description: 'Clean name of the course/subject'
                        },
                        type: {
                          type: Type.STRING,
                          description: 'Theory, Lab, or Tutorial'
                        },
                        durationSlots: {
                          type: Type.INTEGER,
                          description: 'Number of lecture periods this slot occupies (1 for regular lecture, 2 or 3 for long lab)'
                        }
                      },
                      required: ['subject', 'type', 'durationSlots']
                    }
                  }
                },
                required: ['dayName', 'slots']
              }
            }
          },
          required: ['days']
        }
      }
    };

    let response;
    try {
      // Primary model: gemini-3-flash-preview
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        ...requestConfig
      });
    } catch (firstErr) {
      console.warn('gemini-3-flash-preview failed, trying gemini-3.8-flash...', firstErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        ...requestConfig
      });
    }

    const rawJson = response.text;
    if (!rawJson) {
      return res.status(422).json({ error: 'AI could not extract schedule from this timetable image.' });
    }

    const parsed = JSON.parse(rawJson);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Server error in api/analyze:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error while analyzing timetable.'
    });
  }
}
