import { GoogleGenAI, Type } from '@google/genai';

/**
 * Converts a File or Blob into a base64 string, auto-downscaling large images
 * to keep network requests fast and within serverless body limits.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // If it's a PDF, read directly
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve({ base64: result.split(',')[1], mimeType: 'application/pdf' });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
      return;
    }

    // For images, optimize size if dimensions exceed 1800px
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1800;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
        } else {
          const rawBase64 = e.target.result.split(',')[1];
          let mime = file.type || 'image/jpeg';
          if (mime === 'image/jpg') mime = 'image/jpeg';
          resolve({ base64: rawBase64, mimeType: mime });
        }
      };
      img.onerror = () => {
        const rawBase64 = e.target.result.split(',')[1];
        resolve({ base64: rawBase64, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts and analyzes college timetable using Gemini Vision.
 * Priority 1: Calls secure serverless backend (/api/analyze) running on owner's GEMINI_API_KEY.
 * Priority 2: If /api/analyze is unavailable (e.g. standalone Vite dev server), falls back to local VITE_GEMINI_API_KEY.
 */
export async function analyzeTimetableImage(file) {
  const { base64, mimeType } = await fileToBase64(file);

  // 1. Try serverless backend API route (/api/analyze)
  let backendFailedWith404 = false;
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data: base64, mimeType })
    });

    if (res.ok) {
      const data = await res.json();
      return normalizeExtractedTimetable(data);
    }

    if (res.status === 404) {
      // Local development without Vercel CLI serverless runner
      backendFailedWith404 = true;
    } else {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `Server responded with HTTP status ${res.status}`);
    }
  } catch (err) {
    if (!backendFailedWith404 && err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    backendFailedWith404 = true;
  }

  // 2. Client-side fallback for local development if /api/analyze is 404
  const localEnvKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!localEnvKey) {
    throw new Error(
      'Gemini API is not configured on the server. Please add GEMINI_API_KEY in your Vercel Project Settings -> Environment Variables.'
    );
  }

  const ai = new GoogleGenAI({ apiKey: localEnvKey.trim() });
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
          data: base64,
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
    response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      ...requestConfig
    });
  } catch (firstErr) {
    console.warn('gemini-3-flash-preview attempt failed, trying gemini-3.8-flash...', firstErr);
    response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      ...requestConfig
    });
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
    const matchedDay = dayOrder.find(
      (d) => d.toLowerCase() === (dayObj.dayName || '').toLowerCase().trim()
    );
    if (!matchedDay) return;

    const slots = (dayObj.slots || []).map((s, idx) => {
      const subjectName = (s.subject || 'Subject').trim();
      const slotsCount = Math.max(1, Number(s.durationSlots) || 1);
      const slotType = s.type || 'Theory';

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
