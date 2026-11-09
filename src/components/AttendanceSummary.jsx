import React from 'react';
import { CheckCircle2, AlertOctagon, HelpCircle, Calendar, GraduationCap, Clock, Award, ShieldAlert, Sparkles, SunMedium } from 'lucide-react';

export default function AttendanceSummary({
  daysInfo,
  totalSemesterLectures,
  minLecturesToAttend,
  maxAllowedBunks,
  minDaysToAttend,
  maxFullDaysBunkable,
  policyMode,
  dayAnalysis,
  minCriteria,
  currentAnalysis,
  weekendPolicy,
  hasTimetable
}) {
  const { totalWorkingDays, weekendDaysCount, holidayDaysCount, totalCalendarDays } = daysInfo || {};

  return (
    <div className="summary-section">
      {/* Primary Status Banner (if current attendance is entered) */}
      {currentAnalysis && (
        <div className={`status-banner ${currentAnalysis.status.toLowerCase()}-banner`}>
          <div className="banner-icon-col">
            {currentAnalysis.status === 'SAFE' && <CheckCircle2 size={32} className="text-emerald-700" />}
            {currentAnalysis.status === 'SHORTAGE' && <AlertOctagon size={32} className="text-amber-700" />}
            {currentAnalysis.status === 'IRREVERSIBLE' && <AlertOctagon size={32} className="text-rose-700" />}
            {currentAnalysis.status === 'INVALID' && <AlertOctagon size={32} className="text-amber-700" />}
          </div>
          <div className="banner-content">
            <div className="banner-top">
              <span className="banner-badge">
                Current Attendance: <strong>{currentAnalysis.currentPct}%</strong>
              </span>
              <span className="banner-target">Target: {minCriteria}%</span>
            </div>
            <h3 className="banner-headline">
              {currentAnalysis.status === 'SAFE' && (
                <>
                  You're in the Safe Zone!{' '}
                  {currentAnalysis.safeBunksRightNow > 0 ? (
                    <>You can safely miss <strong>{currentAnalysis.safeBunksRightNow}</strong> lecture{currentAnalysis.safeBunksRightNow > 1 ? 's' : ''} right now.</>
                  ) : (
                    <>You're right on the edge of {minCriteria}%. Do not miss any upcoming lectures.</>
                  )}
                </>
              )}
              {currentAnalysis.status === 'SHORTAGE' && (
                <>
                  Attendance Shortage! You must attend the next{' '}
                  <strong className="text-rose-700 underline">{currentAnalysis.consecutiveNeededToReach}</strong> lecture{currentAnalysis.consecutiveNeededToReach > 1 ? 's' : ''} continuously.
                </>
              )}
              {currentAnalysis.status === 'IRREVERSIBLE' && (
                <>
                  Critical Detention Warning! Cannot mathematically reach {minCriteria}% without medical condonation.
                </>
              )}
              {currentAnalysis.status === 'INVALID' && (
                <>
                  Input Warning: Attended classes cannot exceed conducted classes.
                </>
              )}
            </h3>
            <p className="banner-detail">{currentAnalysis.message}</p>
          </div>
        </div>
      )}

      {/* Days Required Focus Headline Banner */}
      {totalWorkingDays > 0 && minCriteria > 0 && (
        <div className="days-requirement-banner">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                {hasTimetable ? 'AI Timetable Analysis Result' : 'Estimated Requirement'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                You actually need to attend{' '}
                <span className="text-emerald-700 underline decoration-2">{minDaysToAttend} days</span> of college out of {totalWorkingDays} working days
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {policyMode === 'overall' ? (
                  <>
                    Under <strong>Overall Aggregate ({minCriteria}%)</strong> policy, attending the heavier lecture days allows you to completely stay home for{' '}
                    <strong>{maxFullDaysBunkable} full college days</strong> without dropping below criteria.
                  </>
                ) : (
                  <>
                    Under <strong>Strict Subject-Wise ({minCriteria}%)</strong> policy, you can safely skip{' '}
                    <strong>{maxFullDaysBunkable} full college days</strong> while ensuring every single course stays above {minCriteria}%.
                  </>
                )}
              </p>
            </div>
            <div className="days-stat-pill">
              <span className="text-2xl font-black text-slate-900">{maxFullDaysBunkable}</span>
              <span className="text-xs text-slate-600 font-medium">Full Days Off</span>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="kpi-grid">
        {/* Days Required to Attend */}
        <div className="kpi-card target-card">
          <div className="kpi-label-row">
            <span className="kpi-label">Days to Attend</span>
            <Calendar size={18} className="text-emerald-700" />
          </div>
          <div className="kpi-value">{minDaysToAttend}</div>
          <div className="kpi-footer">
            <span>out of {totalWorkingDays} working days</span>
            <span className="kpi-subtle">({totalCalendarDays} calendar days)</span>
          </div>
        </div>

        {/* Full Days You Can Bunk */}
        <div className="kpi-card bunks-card">
          <div className="kpi-label-row">
            <span className="kpi-label">Full Days Allowed Off</span>
            <SunMedium size={18} className="text-rose-500" />
          </div>
          <div className="kpi-value">{maxFullDaysBunkable}</div>
          <div className="kpi-footer">
            <span>Entire college days you can miss</span>
            <span className="kpi-subtle">while meeting {minCriteria}%</span>
          </div>
        </div>

        {/* Total Lectures in Semester */}
        <div className="kpi-card">
          <div className="kpi-label-row">
            <span className="kpi-label">Total Semester Lectures</span>
            <Clock size={18} />
          </div>
          <div className="kpi-value">{totalSemesterLectures}</div>
          <div className="kpi-footer">
            <span>Scheduled classes & labs</span>
            <span className="kpi-subtle">{hasTimetable ? 'Exact from timetable' : 'Calculated from daily load'}</span>
          </div>
        </div>

        {/* Minimum Lectures to Attend */}
        <div className="kpi-card">
          <div className="kpi-label-row">
            <span className="kpi-label">Must Attend ({minCriteria}%)</span>
            <GraduationCap size={18} />
          </div>
          <div className="kpi-value">{minLecturesToAttend}</div>
          <div className="kpi-footer">
            <span>Max {maxAllowedBunks} lecture bunks allowed</span>
          </div>
        </div>
      </div>

      {/* Day-of-Week Bunk Strategy Analysis (from Timetable) */}
      {hasTimetable && dayAnalysis && dayAnalysis.length > 0 && (
        <div className="day-strategy-card mt-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={16} className="text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Weekday Bunk Feasibility & Risk Rating
            </h4>
          </div>
          <div className="day-strategy-grid">
            {dayAnalysis.map((item) => (
              <div
                key={item.dayOfWeek}
                className={`day-strategy-box ${
                  item.riskRating === 'HIGH_RISK'
                    ? 'day-high-risk'
                    : item.riskRating === 'SAFE_TO_BUNK'
                    ? 'day-safe'
                    : 'day-moderate'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-slate-900">{item.dayName}</span>
                  <span className="day-classes-badge">{item.lecturesPerDay} classes</span>
                </div>
                <div className="text-xs text-slate-600 mb-2">
                  Occurs {item.occurrencesInSemester}× ({item.totalSemesterClassesOnThisDay} total lectures)
                </div>
                <div className="text-xs font-semibold">
                  {item.riskRating === 'HIGH_RISK' && (
                    <span className="text-rose-700 flex items-center gap-1">
                      ⚠️ High-Risk Day (Do Not Bunk)
                    </span>
                  )}
                  {item.riskRating === 'SAFE_TO_BUNK' && (
                    <span className="text-emerald-700 flex items-center gap-1">
                      ✓ Safest Day to Bunk (Light Load)
                    </span>
                  )}
                  {item.riskRating === 'MODERATE' && (
                    <span className="text-slate-700">
                      Standard Load
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mid-Sem Detailed breakdown if current attendance is tracked */}
      {currentAnalysis && (
        <div className="card detailed-breakdown-card">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Mid-Semester Attendance Breakdown</h4>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <span className="breakdown-title">Conducted so far</span>
              <span className="breakdown-val">{currentAnalysis.conducted} classes</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-title">Attended so far</span>
              <span className="breakdown-val font-semibold text-slate-800">{currentAnalysis.attended} classes</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-title">Missed so far</span>
              <span className="breakdown-val text-rose-700 font-semibold">{currentAnalysis.conducted - currentAnalysis.attended} classes</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-title">Remaining in semester</span>
              <span className="breakdown-val">{currentAnalysis.remainingLectures} classes</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-title">Whole semester bunks left</span>
              <span className="breakdown-val font-semibold text-emerald-700">
                {Math.max(0, currentAnalysis.remainingBunksWholeSem)} classes
              </span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-title">Max achievable %</span>
              <span className="breakdown-val font-semibold text-slate-800">{currentAnalysis.maxPossiblePct}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
