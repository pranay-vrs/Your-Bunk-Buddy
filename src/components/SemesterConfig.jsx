import React from 'react';
import { Calendar, Percent, BookOpen, Clock, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
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
  subjects = [],
  // Props for the embedded attendance chart
  daysInfo,
  totalSemesterLectures,
  currentAnalysis,
  lecturesPerDay = 6
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

  // Check if user has entered subject-level attendance in subjects table
  const subjectsHeldSum = (subjects || []).reduce(
    (sum, s) => sum + (Number(s.conducted) || 0),
    0
  );
  const subjectsAttSum = (subjects || []).reduce(
    (sum, s) => sum + (Number(s.attended) || 0),
    0
  );

  const handleAutoFillFromSubjects = () => {
    setCurrentConducted(subjectsHeldSum);
    setCurrentAttended(subjectsAttSum);
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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsTrackingCurrent(!isTrackingCurrent);
            }
          }}
        >
          <div className="toggle-container">
            <div className={`custom-checkbox ${isTrackingCurrent ? 'checked' : ''}`}>
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
          </div>
          <div className="toggle-chevron">
            {isTrackingCurrent ? (
              <ChevronUp size={18} className="text-slate-500" />
            ) : (
              <ChevronDown size={18} className="text-slate-500" />
            )}
          </div>
        </div>

        {/* Trajectory Graph and Inputs directly under Track Current Semester Standing */}
        {isTrackingCurrent && (
          <div className="tracking-expanded-content">
            <div className="current-inputs-box">
              <div className="form-group">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="curr-conducted" className="form-label mb-0">
                    Classes Conducted So Far
                  </label>
                  {subjectsHeldSum > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoFillFromSubjects}
                      className="text-xs text-amber-900 font-semibold underline hover:text-amber-950"
                      title="Sync from subjects table"
                    >
                      Fill from subjects ({subjectsHeldSum} held)
                    </button>
                  )}
                </div>
                <input
                  id="curr-conducted"
                  type="number"
                  min="0"
                  placeholder="e.g. 40"
                  value={currentConducted !== null && currentConducted !== undefined ? currentConducted : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentConducted(val === '' ? '' : Math.max(0, Number(val)));
                  }}
                  className="input-field"
                />
                <span className="helper-text">Total lectures held till date across all subjects</span>
              </div>

              <div className="form-group">
                <label htmlFor="curr-attended" className="form-label">
                  Classes Attended So Far
                </label>
                <input
                  id="curr-attended"
                  type="number"
                  min="0"
                  placeholder="e.g. 32"
                  value={currentAttended !== null && currentAttended !== undefined ? currentAttended : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentAttended(val === '' ? '' : Math.max(0, Number(val)));
                  }}
                  className="input-field"
                />
                <span className="helper-text">Lectures and labs you were present for</span>
              </div>
            </div>

            {/* Live Standing Feedback Card */}
            {currentAnalysis && (
              <div
                className={`current-standing-feedback mt-3 ${
                  currentAnalysis.status === 'SAFE'
                    ? 'feedback-safe'
                    : currentAnalysis.status === 'SHORTAGE'
                    ? 'feedback-shortage'
                    : 'feedback-danger'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-slate-900">
                      {currentAnalysis.currentPct}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Current Standing (Target: {minCriteria || 75}%)
                    </span>
                  </div>
                  <span
                    className={`feedback-pill ${
                      currentAnalysis.status === 'SAFE'
                        ? 'pill-safe'
                        : currentAnalysis.status === 'SHORTAGE'
                        ? 'pill-warning'
                        : 'pill-danger'
                    }`}
                  >
                    {currentAnalysis.status === 'SAFE' && '✓ In Safe Zone'}
                    {currentAnalysis.status === 'SHORTAGE' && '⚠️ Shortage Alert'}
                    {currentAnalysis.status === 'IRREVERSIBLE' && '⛔ Critical Shortage'}
                    {currentAnalysis.status === 'INVALID' && '⚠️ Input Warning'}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-semibold mt-1.5 mb-2">
                  {currentAnalysis.message}
                </p>

                {currentAnalysis.status !== 'INVALID' && (
                  <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-2 border-t border-black/5">
                    <span>
                      Attended: <strong>{currentAnalysis.attended}</strong> / {currentAnalysis.conducted}
                    </span>
                    <span>•</span>
                    <span>
                      Missed: <strong>{currentAnalysis.conducted - currentAnalysis.attended}</strong> classes
                    </span>
                    <span>•</span>
                    {currentAnalysis.safeBunksRightNow > 0 && (
                      <span className="text-emerald-700 font-semibold">
                        Safe Bunks Right Now: {currentAnalysis.safeBunksRightNow}
                      </span>
                    )}
                    {currentAnalysis.consecutiveNeededToReach > 0 && (
                      <span className="text-rose-700 font-semibold">
                        Need Next: {currentAnalysis.consecutiveNeededToReach} classes
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Semester Attendance Trajectory Graph placed directly here */}
            <div className="mt-4">
              <AttendanceChart
                daysInfo={daysInfo}
                totalSemesterLectures={totalSemesterLectures}
                minCriteria={minCriteria || 75}
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
