import React from 'react';
import { Calendar, Percent, BookOpen, Clock, CheckCircle2, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import AttendanceChart from './AttendanceChart';

export default function SemesterConfig({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  minCriteria,
  setMinCriteria,
  weekendPolicy,
  setWeekendPolicy,
  policyMode,
  setPolicyMode,
  currentConducted,
  setCurrentConducted,
  currentAttended,
  setCurrentAttended,
  isTrackingCurrent,
  setIsTrackingCurrent,
  hasTimetable,
  // Props for the embedded attendance chart
  daysInfo,
  totalSemesterLectures,
  currentAnalysis
}) {
  // Preset Semester Helpers for Indian colleges
  const setPresetOddSemester = () => {
    const currentYear = new Date().getFullYear();
    setStartDate(`${currentYear}-08-01`);
    setEndDate(`${currentYear}-12-15`);
    if (!minCriteria) setMinCriteria(75);
  };

  const setPresetEvenSemester = () => {
    const currentYear = new Date().getFullYear();
    setStartDate(`${currentYear}-01-15`);
    setEndDate(`${currentYear}-05-25`);
    if (!minCriteria) setMinCriteria(75);
  };

  return (
    <div className="card config-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Calendar size={20} className="text-slate-700" />
            Semester Schedule & College Criteria
          </h2>
          <p className="section-subtitle">
            Configure your semester dates, attendance rules, and weekend schedule.
          </p>
        </div>
        <div className="preset-buttons">
          <span className="preset-label">Quick Presets:</span>
          <button type="button" onClick={setPresetOddSemester} className="chip-btn">
            Odd Sem (Aug - Dec)
          </button>
          <button type="button" onClick={setPresetEvenSemester} className="chip-btn">
            Even Sem (Jan - May)
          </button>
        </div>
      </div>

      {/* 1 & 2: Balanced Semester Start Date and Semester End Date */}
      <div className="date-inputs-row">
        <div className="form-group date-col">
          <label htmlFor="start-date" className="form-label">
            1. Semester Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field date-input"
          />
          <span className="helper-text">First teaching day of semester</span>
        </div>

        <div className="form-group date-col">
          <label htmlFor="end-date" className="form-label">
            2. Semester End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field date-input"
          />
          <span className="helper-text">Last teaching day of semester</span>
        </div>
      </div>

      {/* 3 & 4: Minimum Attendance & Attendance Rule Policy */}
      <div className="grid-form-row">
        {/* Minimum Attendance Criteria */}
        <div className="form-group flex-1">
          <label htmlFor="min-criteria" className="form-label">
            3. Minimum Attendance Required (%)
          </label>
          <div className="flex gap-2">
            <input
              id="min-criteria"
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={minCriteria === 0 ? '' : minCriteria}
              onChange={(e) => {
                const val = e.target.value;
                setMinCriteria(val === '' ? 0 : Math.max(0, Math.min(100, Number(val))));
              }}
              className="input-field w-28"
            />
            <div className="criteria-presets">
              {[75, 80, 85, 65].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMinCriteria(val)}
                  className={`criteria-btn ${minCriteria === val ? 'active' : ''}`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
          <span className="helper-text">UGC & AICTE norm is typically 75%</span>
        </div>

        {/* Attendance Policy Mode: Overall vs Individual Subject */}
        <div className="form-group flex-1">
          <label htmlFor="policy-mode" className="form-label">
            4. Attendance Criteria Policy
          </label>
          <select
            id="policy-mode"
            value={policyMode}
            onChange={(e) => setPolicyMode(e.target.value)}
            className="input-field select-field"
          >
            <option value="overall">Overall Attendance (Aggregate across all subjects)</option>
            <option value="subject">Individual Subject-Wise (Every subject must reach criteria)</option>
          </select>
          <span className="helper-text">
            {policyMode === 'overall'
              ? 'Calculates minimum days to attend based on overall college attendance'
              : 'Ensures you do not get detained in any single high-load subject'}
          </span>
        </div>
      </div>

      {/* College Weekend Policy */}
      <div className="form-group mt-4">
        <label htmlFor="weekend-policy" className="form-label">
          College Weekend Pattern
        </label>
        <select
          id="weekend-policy"
          value={weekendPolicy}
          onChange={(e) => setWeekendPolicy(e.target.value)}
          className="input-field select-field"
        >
          <option value="5-day">5-Day Week (Saturday & Sunday OFF)</option>
          <option value="6-day">6-Day Week (Sunday OFF, Saturday Working)</option>
          <option value="alt-sat-2-4">2nd & 4th Saturday OFF</option>
          <option value="alt-sat-1-3">1st & 3rd Saturday OFF</option>
        </select>
        <span className="helper-text">Weekends are excluded from semester teaching days</span>
      </div>

      {/* Track Current Semester Standing & Trajectory Tab */}
      <div className="tracking-toggle-section">
        <div
          className="tracking-toggle-header"
          onClick={() => setIsTrackingCurrent(!isTrackingCurrent)}
        >
          <label className="toggle-container" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isTrackingCurrent}
              onChange={(e) => setIsTrackingCurrent(e.target.checked)}
              className="visually-hidden"
            />
            <div className="custom-checkbox">
              {isTrackingCurrent && <CheckCircle2 size={16} className="text-white" />}
            </div>
            <div className="toggle-text">
              <div className="flex items-center gap-2">
                <strong>Track Current Semester Standing</strong>
                <span className="status-pill-toggle">
                  {isTrackingCurrent ? 'Active' : 'Click to Enable'}
                </span>
              </div>
              <span className="block text-xs text-slate-500 mt-0.5">
                Enter classes attended so far to calculate safe bunks, catch-up lectures, and view your semester trajectory graph.
              </span>
            </div>
          </label>
          <div className="toggle-chevron">
            {isTrackingCurrent ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
          </div>
        </div>

        {/* Trajectory Graph directly under Track Current Semester Standing */}
        {isTrackingCurrent && (
          <div className="tracking-expanded-content">
            <div className="current-inputs-box">
              <div className="form-group">
                <label htmlFor="curr-conducted" className="form-label">
                  Classes Conducted So Far
                </label>
                <input
                  id="curr-conducted"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={currentConducted === 0 ? '' : currentConducted}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentConducted(val === '' ? 0 : Math.max(0, Number(val)));
                  }}
                  className="input-field"
                />
                <span className="helper-text">Total lectures held till date</span>
              </div>

              <div className="form-group">
                <label htmlFor="curr-attended" className="form-label">
                  Classes Attended So Far
                </label>
                <input
                  id="curr-attended"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={currentAttended === 0 ? '' : currentAttended}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentAttended(val === '' ? 0 : Math.max(0, Number(val)));
                  }}
                  className="input-field"
                />
                <span className="helper-text">Lectures you were present for</span>
              </div>
            </div>

            {/* Semester Attendance Trajectory Graph placed directly here */}
            <div className="mt-4">
              <AttendanceChart
                daysInfo={daysInfo}
                totalSemesterLectures={totalSemesterLectures}
                minCriteria={minCriteria}
                lecturesPerDay={lecturesPerDay}
                currentAnalysis={currentAnalysis}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
