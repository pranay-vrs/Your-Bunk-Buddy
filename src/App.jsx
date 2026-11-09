import React, { useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import SemesterConfig from './components/SemesterConfig';
import TimetableUploader from './components/TimetableUploader';
import AttendanceSummary from './components/AttendanceSummary';
import SubjectManager from './components/SubjectManager';
import HolidaysList from './components/HolidaysList';
import { calculateAttendance } from './utils/calculator';
import './App.css';

export default function App() {
  // 1. Semester Inputs - Initially all 0 / empty as requested
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minCriteria, setMinCriteria] = useState(0);
  const [lecturesPerDay, setLecturesPerDay] = useState(0);
  const [weekendPolicy, setWeekendPolicy] = useState('5-day');
  const [policyMode, setPolicyMode] = useState('overall'); // 'overall' or 'subject'

  // 2. Timetable Schedule (extracted via OpenAI Vision)
  const [timetableSchedule, setTimetableSchedule] = useState(null);

  // 3. Mid-semester Tracking - Initially empty string
  const [isTrackingCurrent, setIsTrackingCurrent] = useState(false);
  const [currentConducted, setCurrentConducted] = useState('');
  const [currentAttended, setCurrentAttended] = useState('');

  // 4. Indian Holidays & Custom College Holidays
  const [disabledHolidayIds, setDisabledHolidayIds] = useState([]);
  const [customHolidays, setCustomHolidays] = useState([]);

  // 5. Subject List (auto-populated by timetable, or manual)
  const [subjects, setSubjects] = useState([]);

  // Handle timetable processed by AI
  const handleTimetableProcessed = (result) => {
    if (result && result.subjects && result.subjects.length > 0) {
      setSubjects(result.subjects);
    }
  };

  // Reset to initial 0 state
  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setMinCriteria(0);
    setLecturesPerDay(0);
    setWeekendPolicy('5-day');
    setPolicyMode('overall');
    setTimetableSchedule(null);
    setIsTrackingCurrent(false);
    setCurrentConducted('');
    setCurrentAttended('');
    setDisabledHolidayIds([]);
    setCustomHolidays([]);
    setSubjects([]);
  };

  // Perform Calculations
  const calculationResult = useMemo(() => {
    return calculateAttendance({
      startDate,
      endDate,
      minCriteria: Number(minCriteria) || 0,
      lecturesPerDay: Number(lecturesPerDay) || 0,
      weekendPolicy,
      disabledHolidayIds,
      customHolidays,
      timetableSchedule,
      subjects,
      policyMode,
      currentAttended: isTrackingCurrent ? currentAttended : null,
      currentConducted: isTrackingCurrent ? currentConducted : null
    });
  }, [
    startDate,
    endDate,
    minCriteria,
    lecturesPerDay,
    weekendPolicy,
    disabledHolidayIds,
    customHolidays,
    timetableSchedule,
    subjects,
    policyMode,
    isTrackingCurrent,
    currentAttended,
    currentConducted
  ]);

  const hasTimetable = Boolean(timetableSchedule && Object.keys(timetableSchedule).length > 0);

  return (
    <div className="app-layout">
      <Navbar onReset={handleReset} />

      <main className="main-content">
        <div className="container">
          {/* Top Intro Header */}
          <div className="editorial-intro">
            <h2 className="page-heading">College Attendance & Bunk Planner</h2>
            <p className="page-description">
              Upload your timetable to automatically analyze lectures, calculate the minimum days you actually need
              to attend college, and plan your allowable bunks around Indian holidays and academic policies.
            </p>
          </div>

          {/* 1. Semester Schedule & College Criteria Tab shifted to the TOP */}
          <div className="mb-6">
            <SemesterConfig
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              minCriteria={minCriteria}
              setMinCriteria={setMinCriteria}
              weekendPolicy={weekendPolicy}
              setWeekendPolicy={setWeekendPolicy}
              policyMode={policyMode}
              setPolicyMode={setPolicyMode}
              currentConducted={currentConducted}
              setCurrentConducted={setCurrentConducted}
              currentAttended={currentAttended}
              setCurrentAttended={setCurrentAttended}
              isTrackingCurrent={isTrackingCurrent}
              setIsTrackingCurrent={setIsTrackingCurrent}
              hasTimetable={hasTimetable}
              subjects={subjects}
              // Embedded trajectory graph props
              daysInfo={calculationResult.daysInfo}
              totalSemesterLectures={calculationResult.totalSemesterLectures}
              currentAnalysis={calculationResult.currentAnalysis}
              lecturesPerDay={lecturesPerDay}
            />
          </div>

          {/* 2. Upload Timetable with AI Schedule Extraction */}
          <div className="mb-6">
            <TimetableUploader
              timetableSchedule={timetableSchedule}
              setTimetableSchedule={setTimetableSchedule}
              onTimetableProcessed={handleTimetableProcessed}
            />
          </div>

          {/* 3. Results & Metrics Summary (starts at 0 initially) */}
          <div className="mb-6">
            <AttendanceSummary
              daysInfo={calculationResult.daysInfo}
              totalSemesterLectures={calculationResult.totalSemesterLectures}
              minLecturesToAttend={calculationResult.minLecturesToAttend}
              maxAllowedBunks={calculationResult.maxAllowedBunks}
              minDaysToAttend={calculationResult.minDaysToAttend}
              maxFullDaysBunkable={calculationResult.maxFullDaysBunkable}
              policyMode={policyMode}
              dayAnalysis={calculationResult.dayAnalysis}
              minCriteria={Number(minCriteria) || 0}
              currentAnalysis={calculationResult.currentAnalysis}
              weekendPolicy={weekendPolicy}
              hasTimetable={hasTimetable}
            />
          </div>

          {/* 4. Lower Tools Grid: Subjects & Holidays */}
          <div className="content-grid mt-6">
            <div className="space-y-6">
              {/* Subject Breakdown & Weighting */}
              <SubjectManager
                subjects={subjects}
                setSubjects={setSubjects}
                minCriteria={Number(minCriteria) || 75}
                subjectAnalysis={calculationResult.subjectAnalysis}
                hasTimetable={hasTimetable}
                policyMode={policyMode}
              />
            </div>

            <div className="space-y-6">
              {/* Holidays & Custom Leaves */}
              <HolidaysList
                startDate={startDate}
                endDate={endDate}
                disabledHolidayIds={disabledHolidayIds}
                setDisabledHolidayIds={setDisabledHolidayIds}
                customHolidays={customHolidays}
                setCustomHolidays={setCustomHolidays}
                weekendPolicy={weekendPolicy}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <p>© {new Date().getFullYear()} Your Bunk Buddy — Designed for Indian University Students.</p>
          <p className="text-xs text-slate-500 mt-1">
            Compatible with UGC, AICTE, VTU, AKTU, Anna University, Mumbai University, and Delhi University attendance guidelines.
          </p>
        </div>
      </footer>
    </div>
  );
}
