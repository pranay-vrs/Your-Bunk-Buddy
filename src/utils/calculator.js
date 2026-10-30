import { INDIAN_HOLIDAYS, getHolidaysForYear } from '../data/holidays.js';

/**
 * Checks if a Saturday is the nth Saturday of the month (1st, 2nd, 3rd, 4th, 5th)
 */
export function getNthSaturdayOfMonth(date) {
  if (date.getDay() !== 6) return 0;
  const dayOfMonth = date.getDate();
  return Math.ceil(dayOfMonth / 7);
}

/**
 * Checks if a given date is considered a weekend based on selected policy
 */
export function isWeekend(date, policy = '5-day') {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 0) return true; // Sunday is always off

  if (day === 6) {
    if (policy === '5-day') return true;
    if (policy === '6-day') return false;
    const nthSat = getNthSaturdayOfMonth(date);
    if (policy === 'alt-sat-2-4') {
      return nthSat === 2 || nthSat === 4;
    }
    if (policy === 'alt-sat-1-3') {
      return nthSat === 1 || nthSat === 3;
    }
  }

  return false;
}

/**
 * Formats a Date object as YYYY-MM-DD in local time
 */
export function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object safely
 */
export function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Retrieves all relevant holidays (national, gazetted, and user custom) between start and end date
 */
export function getSemesterHolidays(startDateStr, endDateStr, disabledHolidayIds = [], customHolidays = []) {
  if (!startDateStr || !endDateStr) return [];
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  let pool = [...INDIAN_HOLIDAYS];
  for (let y = startYear; y <= endYear; y++) {
    const extra = getHolidaysForYear(y);
    extra.forEach(h => {
      if (!pool.some(existing => existing.id === h.id)) {
        pool.push(h);
      }
    });
  }

  // Add custom holidays
  pool = [...pool, ...customHolidays];

  // Filter within date range
  return pool
    .filter(h => {
      const hDate = parseDate(h.date);
      return hDate >= start && hDate <= end;
    })
    .map(h => ({
      ...h,
      disabled: disabledHolidayIds.includes(h.id)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculates semester working days and day-of-week frequencies
 */
export function calculateSemesterDays(startDateStr, endDateStr, weekendPolicy = '5-day', disabledHolidayIds = [], customHolidays = []) {
  if (!startDateStr || !endDateStr) {
    return {
      totalCalendarDays: 0,
      totalWorkingDays: 0,
      weekendDaysCount: 0,
      holidayDaysCount: 0,
      dayFrequencies: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      workingDates: [],
      holidaysOnWorkingDays: []
    };
  }

  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  if (start > end) {
    return {
      totalCalendarDays: 0,
      totalWorkingDays: 0,
      weekendDaysCount: 0,
      holidayDaysCount: 0,
      dayFrequencies: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      workingDates: [],
      holidaysOnWorkingDays: []
    };
  }

  const allHolidays = getSemesterHolidays(startDateStr, endDateStr, disabledHolidayIds, customHolidays);
  const activeHolidaysMap = new Map();
  allHolidays.forEach(h => {
    if (!h.disabled) {
      activeHolidaysMap.set(h.date, h);
    }
  });

  let totalCalendarDays = 0;
  let totalWorkingDays = 0;
  let weekendDaysCount = 0;
  let holidayDaysCount = 0;
  const dayFrequencies = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const workingDates = [];
  const holidaysOnWorkingDays = [];

  const curr = new Date(start.getTime());
  while (curr <= end) {
    totalCalendarDays++;
    const dateStr = formatDateISO(curr);
    const dayOfWeek = curr.getDay();
    const isWknd = isWeekend(curr, weekendPolicy);
    const holiday = activeHolidaysMap.get(dateStr);

    if (isWknd) {
      weekendDaysCount++;
    } else if (holiday) {
      holidayDaysCount++;
      holidaysOnWorkingDays.push({ ...holiday, dayOfWeek });
    } else {
      totalWorkingDays++;
      dayFrequencies[dayOfWeek] = (dayFrequencies[dayOfWeek] || 0) + 1;
      workingDates.push({ date: dateStr, dayOfWeek });
    }

    curr.setDate(curr.getDate() + 1);
  }

  return {
    totalCalendarDays,
    totalWorkingDays,
    weekendDaysCount,
    holidayDaysCount,
    dayFrequencies,
    workingDates,
    holidaysOnWorkingDays
  };
}

const DOW_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

/**
 * Core Attendance & Minimum Days Optimization Engine
 */
export function calculateAttendance({
  startDate,
  endDate,
  minCriteria = 75,
  lecturesPerDay = 6,
  weekendPolicy = '5-day',
  disabledHolidayIds = [],
  customHolidays = [],
  timetableSchedule = null,
  timetableDailyLectures = null,
  subjects = [],
  policyMode = 'overall', // 'overall' or 'subject'
  currentAttended = null,
  currentConducted = null
}) {
  const daysInfo = calculateSemesterDays(startDate, endDate, weekendPolicy, disabledHolidayIds, customHolidays);
  const { totalWorkingDays, dayFrequencies, workingDates } = daysInfo;

  let totalSemesterLectures = 0;
  let subjectAnalysis = [];
  let dayAnalysis = [];
  let minDaysToAttend = 0;
  let maxFullDaysBunkable = 0;

  const targetCriteria = Number(minCriteria) || 0;

  // Case 1: Timetable is provided from AI analysis
  if (timetableSchedule && Object.keys(timetableSchedule).length > 0) {
    // 1. Calculate lectures per day of the week & occurrences
    const dayLecturesMap = {};
    const daySlotsMap = {};

    [1, 2, 3, 4, 5, 6].forEach(dow => {
      const dayName = DOW_NAMES[dow];
      const slots = timetableSchedule[dayName] || [];
      const totalSlots = slots.reduce((sum, s) => sum + (Number(s.durationSlots) || 1), 0);
      dayLecturesMap[dow] = totalSlots;
      daySlotsMap[dow] = slots;
    });

    // 2. Compute exact total semester lectures from calendar day frequencies
    [1, 2, 3, 4, 5, 6].forEach(dow => {
      const count = dayFrequencies[dow] || 0;
      const lecturesOnDay = dayLecturesMap[dow] || 0;
      totalSemesterLectures += count * lecturesOnDay;
    });

    // 3. Extract and compute exact total semester lectures for each subject
    const subjectTotals = {};
    const subjectWeeklyLoad = {};

    [1, 2, 3, 4, 5, 6].forEach(dow => {
      const dowCount = dayFrequencies[dow] || 0;
      const slots = daySlotsMap[dow] || [];

      slots.forEach(slot => {
        const subName = slot.subject;
        const duration = Number(slot.durationSlots) || 1;
        subjectTotals[subName] = (subjectTotals[subName] || 0) + (dowCount * duration);
        subjectWeeklyLoad[subName] = (subjectWeeklyLoad[subName] || 0) + duration;
      });
    });

    // Construct subjectAnalysis
    Object.keys(subjectTotals).forEach(subName => {
      const totalSubLectures = subjectTotals[subName];
      const minReq = Math.ceil(totalSubLectures * (targetCriteria / 100));
      const maxBunks = Math.max(0, totalSubLectures - minReq);

      // Check if user provided attendance tracking for this subject
      const existingSub = (subjects || []).find(s => s.name === subName);
      const subAttended = existingSub ? Number(existingSub.attended) || 0 : 0;
      const subConducted = existingSub ? Number(existingSub.conducted) || 0 : 0;
      let subCurrentPct = subConducted > 0 ? (subAttended / subConducted) * 100 : 0;

      let subSafeBunksNow = 0;
      let subNeedAttendNow = 0;
      if (subConducted > 0 && targetCriteria > 0) {
        if (subCurrentPct >= targetCriteria) {
          subSafeBunksNow = Math.floor((100 * subAttended - targetCriteria * subConducted) / targetCriteria);
        } else {
          subNeedAttendNow = Math.ceil((targetCriteria * subConducted - 100 * subAttended) / (100 - targetCriteria));
        }
      }

      subjectAnalysis.push({
        id: existingSub?.id || `sub-${subName}`,
        name: subName,
        weeklyCount: subjectWeeklyLoad[subName] || 1,
        totalSemesterLectures: totalSubLectures,
        minRequired: minReq,
        maxBunks: maxBunks,
        conducted: existingSub?.conducted || '',
        attended: existingSub?.attended || '',
        currentPct: Math.round(subCurrentPct * 10) / 10,
        safeBunksNow: Math.max(0, subSafeBunksNow),
        needAttendNow: Math.max(0, subNeedAttendNow)
      });
    });

    // Relative weight & sensitivity factor
    const avgLectures = totalSemesterLectures / Math.max(1, subjectAnalysis.length);
    subjectAnalysis = subjectAnalysis.map(sub => {
      const impactRatio = avgLectures > 0 ? sub.totalSemesterLectures / avgLectures : 1;
      return {
        ...sub,
        impactRatio: Math.round(impactRatio * 10) / 10,
        isHighImpact: impactRatio >= 1.25
      };
    }).sort((a, b) => b.totalSemesterLectures - a.totalSemesterLectures);

    // 4. Day-of-Week Sensitivity Breakdown (e.g., Monday vs Tuesday vs Wednesday)
    [1, 2, 3, 4, 5, 6].forEach(dow => {
      const dayName = DOW_NAMES[dow];
      const count = dayFrequencies[dow] || 0;
      const lectures = dayLecturesMap[dow] || 0;
      if (count > 0 && lectures > 0) {
        let riskRating = 'MODERATE';
        if (lectures >= 6) riskRating = 'HIGH_RISK';
        else if (lectures <= 3) riskRating = 'SAFE_TO_BUNK';

        dayAnalysis.push({
          dayOfWeek: dow,
          dayName,
          occurrencesInSemester: count,
          lecturesPerDay: lectures,
          totalSemesterClassesOnThisDay: count * lectures,
          riskRating
        });
      }
    });

    // 5. Optimization: Calculating Minimum College Days to Attend
    const minLecturesNeededOverall = Math.ceil(totalSemesterLectures * (targetCriteria / 100));

    if (policyMode === 'overall') {
      // Greedily attend days with highest lectures first to minimize total days on campus
      const workingDaysWithLectures = workingDates.map(wd => ({
        ...wd,
        lectures: dayLecturesMap[wd.dayOfWeek] || 0
      })).sort((a, b) => b.lectures - a.lectures);

      let accumulatedLectures = 0;
      let daysCount = 0;
      for (const day of workingDaysWithLectures) {
        if (accumulatedLectures >= minLecturesNeededOverall && targetCriteria > 0) break;
        accumulatedLectures += day.lectures;
        daysCount++;
      }

      minDaysToAttend = targetCriteria > 0 ? daysCount : 0;
      maxFullDaysBunkable = Math.max(0, totalWorkingDays - minDaysToAttend);

    } else {
      // Policy: 'subject' (Strict per-subject attendance criteria)
      const subjectAllowedBunks = {};
      subjectAnalysis.forEach(s => {
        subjectAllowedBunks[s.name] = s.maxBunks;
      });

      const subjectBunksTaken = {};
      subjectAnalysis.forEach(s => {
        subjectBunksTaken[s.name] = 0;
      });

      const workingDaysToBunk = workingDates.map(wd => ({
        ...wd,
        slots: daySlotsMap[wd.dayOfWeek] || []
      })).sort((a, b) => (dayLecturesMap[a.dayOfWeek] || 0) - (dayLecturesMap[b.dayOfWeek] || 0));

      let fullDaysBunked = 0;
      for (const day of workingDaysToBunk) {
        let canBunk = true;
        for (const slot of day.slots) {
          const subName = slot.subject;
          const duration = Number(slot.durationSlots) || 1;
          if ((subjectBunksTaken[subName] || 0) + duration > (subjectAllowedBunks[subName] || 0)) {
            canBunk = false;
            break;
          }
        }

        if (canBunk && targetCriteria > 0) {
          day.slots.forEach(slot => {
            const subName = slot.subject;
            const duration = Number(slot.durationSlots) || 1;
            subjectBunksTaken[subName] = (subjectBunksTaken[subName] || 0) + duration;
          });
          fullDaysBunked++;
        }
      }

      maxFullDaysBunkable = fullDaysBunked;
      minDaysToAttend = Math.max(0, totalWorkingDays - maxFullDaysBunkable);
    }

  } else {
    // Case 2: Fallback without timetable (Daily lecture load default)
    const dailyCount = Number(lecturesPerDay) > 0 ? Number(lecturesPerDay) : 6;
    totalSemesterLectures = totalWorkingDays * dailyCount;
    const minLecturesNeeded = Math.ceil(totalSemesterLectures * (targetCriteria / 100));
    
    minDaysToAttend = dailyCount > 0 && targetCriteria > 0 ? Math.ceil(minLecturesNeeded / dailyCount) : 0;
    maxFullDaysBunkable = Math.max(0, totalWorkingDays - minDaysToAttend);
  }

  // Minimum required lectures & allowed bunks overall
  const minLecturesToAttend = targetCriteria > 0 ? Math.ceil(totalSemesterLectures * (targetCriteria / 100)) : 0;
  const maxAllowedBunks = Math.max(0, totalSemesterLectures - minLecturesToAttend);

  // Current Standing / Catch-up calculations
  const conducted = currentConducted !== null && currentConducted !== '' ? Number(currentConducted) : null;
  const attended = currentAttended !== null && currentAttended !== '' ? Number(currentAttended) : null;

  let currentAnalysis = null;

  if (conducted !== null && conducted > 0 && attended !== null) {
    if (attended > conducted) {
      currentAnalysis = {
        conducted,
        attended,
        currentPct: Math.round((attended / conducted) * 1000) / 10,
        remainingLectures: Math.max(0, totalSemesterLectures - conducted),
        maxPossiblePct: 100,
        consecutiveNeededToReach: 0,
        safeBunksRightNow: 0,
        remainingBunksWholeSem: 0,
        status: 'INVALID',
        message: 'Classes attended cannot exceed classes conducted. Please adjust your values.'
      };
    } else {
      const currentPct = (attended / conducted) * 100;
      const remainingLectures = Math.max(0, totalSemesterLectures - conducted);
      const maxPossibleAttendance = attended + remainingLectures;
      const maxPossiblePct = totalSemesterLectures > 0 ? (maxPossibleAttendance / totalSemesterLectures) * 100 : 0;

      let consecutiveNeededToReach = 0;
      let safeBunksRightNow = 0;
      let status = 'SAFE';
      let message = '';

      if (targetCriteria <= 0) {
        status = 'SAFE';
        message = 'Set your target attendance criteria above (e.g. 75%) to calculate safe bunks.';
      } else if (currentPct >= targetCriteria) {
        status = 'SAFE';
        safeBunksRightNow = Math.floor((100 * attended - targetCriteria * conducted) / targetCriteria);
        message = safeBunksRightNow > 0 
          ? `You can safely miss ${safeBunksRightNow} more lecture${safeBunksRightNow > 1 ? 's' : ''} right now while staying above ${targetCriteria}%.`
          : `You are exactly at the threshold (${Math.round(currentPct * 10) / 10}%). Do not miss the next lecture.`;
      } else {
        status = 'SHORTAGE';
        consecutiveNeededToReach = Math.ceil((targetCriteria * conducted - 100 * attended) / (100 - targetCriteria));
        
        if (totalSemesterLectures > 0 && maxPossibleAttendance < minLecturesToAttend) {
          status = 'IRREVERSIBLE';
          message = `Alert: Mathematically impossible to reach ${targetCriteria}% with remaining ${remainingLectures} lectures. Maximum achievable is ${Math.round(maxPossiblePct * 10) / 10}%. Medical condonation needed!`;
        } else {
          message = `You must attend the next ${consecutiveNeededToReach} lecture${consecutiveNeededToReach > 1 ? 's' : ''} continuously to reach ${targetCriteria}%.`;
        }
      }

      currentAnalysis = {
        conducted,
        attended,
        currentPct: Math.round(currentPct * 10) / 10,
        remainingLectures,
        maxPossiblePct: Math.round(maxPossiblePct * 10) / 10,
        consecutiveNeededToReach: Math.max(0, consecutiveNeededToReach),
        safeBunksRightNow: Math.max(0, safeBunksRightNow),
        remainingBunksWholeSem: Math.max(0, (attended + remainingLectures) - minLecturesToAttend),
        status,
        message
      };
    }
  }

  return {
    daysInfo,
    totalSemesterLectures,
    minLecturesToAttend,
    maxAllowedBunks,
    minDaysToAttend,
    maxFullDaysBunkable,
    policyMode,
    dayAnalysis,
    subjectAnalysis,
    currentAnalysis
  };
}

/**
 * Generates data for the Attendance Graph over the semester
 */
export function generateTimelineData({
  daysInfo,
  totalSemesterLectures,
  minCriteria,
  lecturesPerDay = 6,
  currentAnalysis,
  simulatedBunks = 0
}) {
  const { workingDates } = daysInfo || {};
  if (!workingDates || workingDates.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Derive realistic daily load
  const dailyLoad = (totalSemesterLectures > 0 && workingDates.length > 0)
    ? (totalSemesterLectures / workingDates.length)
    : (Number(lecturesPerDay) > 0 ? Number(lecturesPerDay) : 6);

  const step = Math.max(1, Math.floor(workingDates.length / 15));
  const milestones = [];
  for (let i = 0; i < workingDates.length; i += step) {
    milestones.push({ index: i, item: workingDates[i] });
  }
  if (milestones[milestones.length - 1].index !== workingDates.length - 1) {
    milestones.push({ index: workingDates.length - 1, item: workingDates[workingDates.length - 1] });
  }

  const labels = milestones.map(m => {
    const d = parseDate(m.item.date);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  });

  const targetLineData = milestones.map(() => minCriteria);
  const fullAttendanceData = milestones.map(() => 100);

  let userTrajectoryData = null;
  let simulatedTrajectoryData = null;

  if (currentAnalysis && currentAnalysis.conducted > 0 && currentAnalysis.status !== 'INVALID') {
    const currentClassIndex = Math.min(
      workingDates.length - 1,
      Math.floor(currentAnalysis.conducted / Math.max(1, dailyLoad))
    );

    userTrajectoryData = milestones.map(m => {
      if (m.index <= currentClassIndex) {
        const progress = m.index / Math.max(1, currentClassIndex);
        return Math.round((currentAnalysis.currentPct * progress + (100 * (1 - progress))) * 10) / 10;
      } else {
        const futureClassesDone = (m.index - currentClassIndex) * dailyLoad;
        const projectedAttended = currentAnalysis.attended + futureClassesDone;
        const projectedTotal = currentAnalysis.conducted + futureClassesDone;
        return Math.round((projectedAttended / projectedTotal) * 1000) / 10;
      }
    });

    if (simulatedBunks > 0) {
      simulatedTrajectoryData = milestones.map(m => {
        if (m.index <= currentClassIndex) {
          return userTrajectoryData[milestones.indexOf(m)];
        } else {
          const futureClassesDone = (m.index - currentClassIndex) * dailyLoad;
          const adjustedAttended = Math.max(0, currentAnalysis.attended + Math.max(0, futureClassesDone - simulatedBunks));
          const projectedTotal = currentAnalysis.conducted + futureClassesDone;
          return Math.round((adjustedAttended / projectedTotal) * 1000) / 10;
        }
      });
    }
  }

  return {
    labels,
    targetLineData,
    fullAttendanceData,
    userTrajectoryData,
    simulatedTrajectoryData
  };
}
