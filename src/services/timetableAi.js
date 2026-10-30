import { GoogleGenAI, Type } from '@google/genai';

/**
 * Converts a File or Blob into a base64 string (without the data URL prefix)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts and analyzes college timetable using Gemini Vision
 */
export async function analyzeTimetableImage(file) {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : null;
  const apiKey = (envKey && envKey.trim()) || (localKey && localKey.trim());

  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY in your .env file or enter your API key in the app.'
    );
  }

  const base64Data = await fileToBase64(file);
  let mimeType = file.type || 'image/jpeg';
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

  const ai = new GoogleGenAI({ apiKey });

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
    // Try current active gemini-3-flash-preview
    response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      ...requestConfig
    });
  } catch (firstErr) {
    console.warn('gemini-3-flash-preview attempt failed, trying gemini-3.8-flash...', firstErr);
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        ...requestConfig
      });
    } catch (secondErr) {
      throw secondErr;
    }
  }

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error('AI could not extract text or schedule from this timetable image.');
  }

  const parsed = JSON.parse(rawJson);
  return normalizeExtractedTimetable(parsed);
}

/**
 * Normalizes timetable data and produces day summaries and weekly subject counts
 */
export function normalizeExtractedTimetable(parsedData) {
  const daysList = parsedData.days || [];
  const normalizedSchedule = {};
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Initialize all days
  dayOrder.forEach((day) => {
    normalizedSchedule[day] = [];
  });

  const subjectCounts = {};

  daysList.forEach((dayObj) => {
    // Normalize day name capitalization
    const matchedDay = dayOrder.find(
      (d) => d.toLowerCase() === (dayObj.dayName || '').toLowerCase().trim()
    );
    if (!matchedDay) return;

    const slots = (dayObj.slots || []).map((s, idx) => {
      const subjectName = (s.subject || 'Subject').trim();
      const slotsCount = Math.max(1, Number(s.durationSlots) || 1);
      const slotType = s.type || 'Theory';

      // Accumulate weekly subject count
      subjectCounts[subjectName] = (subjectCounts[subjectName] || 0) + slotsCount;

      return {
        id: `${matchedDay.toLowerCase()}-${idx}-${Date.now()}`,
        subject: subjectName,
        type: slotType,
        durationSlots: slotsCount
      };
    });

    normalizedSchedule[matchedDay] = slots;
  });

  // Calculate daily lecture totals
  const dailyLectureTotals = {};
  dayOrder.forEach((day) => {
    const totalSlots = normalizedSchedule[day].reduce((sum, s) => sum + s.durationSlots, 0);
    dailyLectureTotals[day] = totalSlots;
  });

  // Construct subjects list for downstream calculator
  const subjectsList = Object.keys(subjectCounts).map((subName, i) => ({
    id: `sub-ai-${i + 1}`,
    name: subName,
    weeklyCount: subjectCounts[subName],
    conducted: '',
    attended: ''
  }));

  return {
    schedule: normalizedSchedule,
    dailyLectureTotals,
    subjects: subjectsList
  };
}

