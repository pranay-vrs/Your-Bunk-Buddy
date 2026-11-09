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
 * Extracts and analyzes college timetable using OpenAI Vision.
 * Priority 1: Calls secure serverless backend (/api/analyze) running on owner's OPENAI_API_KEY.
 * Priority 2: If /api/analyze is unavailable (e.g. standalone Vite dev server), falls back to local VITE_OPENAI_API_KEY.
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
  const localEnvKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!localEnvKey) {
    throw new Error(
      'OpenAI API is not configured on the server. Please add OPENAI_API_KEY in your Vercel Project Settings -> Environment Variables.'
    );
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
              url: `data:${mimeType};base64,${base64}`,
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

  let response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localEnvKey.trim()}`
    },
    body: JSON.stringify(requestPayload('gpt-4o'))
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    console.warn('gpt-4o failed, falling back to gpt-4o-mini...', errJson?.error?.message);

    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localEnvKey.trim()}`
      },
      body: JSON.stringify(requestPayload('gpt-4o-mini'))
    });

    if (!response.ok) {
      const fallbackErr = await response.json().catch(() => ({}));
      throw new Error(fallbackErr?.error?.message || errJson?.error?.message || 'Failed to analyze timetable with OpenAI.');
    }
  }

  const result = await response.json();
  const rawJson = result.choices?.[0]?.message?.content;
  if (!rawJson) {
    throw new Error('AI could not extract schedule from this timetable image.');
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
