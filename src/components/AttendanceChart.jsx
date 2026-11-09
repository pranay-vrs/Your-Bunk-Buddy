import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Sliders, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { generateTimelineData } from '../utils/calculator';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AttendanceChart({
  daysInfo,
  totalSemesterLectures,
  minCriteria = 75,
  lecturesPerDay = 6,
  currentAnalysis
}) {
  const [simulatedBunks, setSimulatedBunks] = useState(0);

  const targetCriteria = Number(minCriteria) > 0 ? Number(minCriteria) : 75;

  const timelineData = generateTimelineData({
    daysInfo,
    totalSemesterLectures,
    minCriteria: targetCriteria,
    lecturesPerDay: Number(lecturesPerDay) > 0 ? Number(lecturesPerDay) : 6,
    currentAnalysis,
    simulatedBunks
  });

  if (!daysInfo || !daysInfo.workingDates || daysInfo.workingDates.length === 0 || !timelineData.labels || timelineData.labels.length === 0) {
    return (
      <div className="empty-chart-box">
        <TrendingUp size={24} className="text-slate-400 mx-auto mb-1.5" />
        <h4 className="text-sm font-semibold text-slate-700">Attendance Trajectory</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Enter your semester start & end dates above to generate the visual attendance projection line.
        </p>
      </div>
    );
  }

  const datasets = [
    {
      label: `Required Target (${targetCriteria}%)`,
      data: timelineData.targetLineData,
      borderColor: '#F24B4B', // vibrant coral crimson
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0
    }
  ];

  if (timelineData.userTrajectoryData) {
    datasets.push({
      label: 'Your Trajectory (Attend Remaining Classes)',
      data: timelineData.userTrajectoryData,
      borderColor: '#3711BF', // electric indigo
      backgroundColor: 'rgba(55, 17, 191, 0.25)',
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#3711BF',
      fill: true,
      tension: 0.15
    });

    if (simulatedBunks > 0 && timelineData.simulatedTrajectoryData) {
      datasets.push({
        label: `Simulated: If you miss ${simulatedBunks} upcoming class${simulatedBunks > 1 ? 'es' : ''}`,
        data: timelineData.simulatedTrajectoryData,
        borderColor: '#8E9BD8', // periwinkle lavender
        borderWidth: 2,
        borderDash: [3, 3],
        pointRadius: 3,
        pointBackgroundColor: '#F24B4B',
        fill: false,
        tension: 0.15
      });
    }
  } else {
    // Default baseline if no current attendance has been input yet
    datasets.push({
      label: 'Target Trajectory',
      data: timelineData.targetLineData,
      borderColor: '#3711BF',
      backgroundColor: 'rgba(55, 17, 191, 0.15)',
      fill: true,
      borderWidth: 2,
      pointRadius: 2,
      tension: 0
    });
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 14,
          font: { family: 'inherit', size: 12 },
          color: '#FFFFFF'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(24, 14, 89, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#D9E0FF',
        borderColor: 'rgba(55, 17, 191, 0.6)',
        borderWidth: 1,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(201, 210, 255, 0.1)'
        },
        ticks: {
          font: { size: 11 },
          color: '#8E9BD8'
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(201, 210, 255, 0.1)'
        },
        ticks: {
          stepSize: 20,
          font: { size: 11 },
          color: '#8E9BD8',
          callback: (value) => `${value}%`
        }
      }
    }
  };

  // Calculate simulated end % if simulator is active
  let simulatedEndPct = null;
  if (simulatedBunks > 0 && timelineData.simulatedTrajectoryData) {
    simulatedEndPct = timelineData.simulatedTrajectoryData[timelineData.simulatedTrajectoryData.length - 1];
  }

  return (
    <div className="chart-container-card">
      <div className="chart-header">
        <div>
          <h3 className="section-title">Semester Attendance Trajectory</h3>
          <p className="section-subtitle">
            Timeline projection from Day 1 to Semester End relative to your {targetCriteria}% requirement.
          </p>
        </div>
        {currentAnalysis && (
          <div className="current-badge">
            <span
              className="badge-dot"
              style={{
                backgroundColor: currentAnalysis.currentPct >= targetCriteria ? '#4ade80' : '#F24B4B',
                boxShadow: currentAnalysis.currentPct >= targetCriteria ? '0 0 8px #4ade80' : '0 0 8px #F24B4B'
              }}
            ></span>
            Current Standing: <strong>{currentAnalysis.currentPct}%</strong>
          </div>
        )}
      </div>

      <div className="chart-canvas-wrapper">
        <Line data={{ labels: timelineData.labels, datasets }} options={chartOptions} />
      </div>

      {currentAnalysis && currentAnalysis.conducted > 0 && (
        <div className="simulator-panel">
          <div className="simulator-header">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-slate-600" />
              <span className="font-medium text-slate-800 text-sm">Interactive "What-If" Bunk Simulator</span>
            </div>
            <span className="text-xs text-slate-500">
              Test what happens to your percentage if you miss upcoming lectures (e.g. college fest, illness, trip).
            </span>
          </div>

          <div className="simulator-controls">
            <div className="simulator-slider-row">
              <label htmlFor="sim-bunks" className="text-sm text-slate-700">
                Miss next: <strong className="text-slate-900">{simulatedBunks}</strong> lecture{simulatedBunks === 1 ? '' : 's'}
              </label>
              <input
                id="sim-bunks"
                type="range"
                min="0"
                max={Math.min(30, currentAnalysis.remainingLectures || 20)}
                value={simulatedBunks}
                onChange={(e) => setSimulatedBunks(Number(e.target.value))}
                className="range-input"
              />
              <button
                type="button"
                className="reset-btn"
                onClick={() => setSimulatedBunks(0)}
                disabled={simulatedBunks === 0}
              >
                Reset
              </button>
            </div>

            {simulatedBunks > 0 && simulatedEndPct !== null && (
              <div className={`simulator-impact ${simulatedEndPct >= targetCriteria ? 'safe-impact' : 'danger-impact'}`}>
                {simulatedEndPct >= targetCriteria ? (
                  <>
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <span>
                      If you miss <strong>{simulatedBunks}</strong> lectures, your semester ending attendance will be approx{' '}
                      <strong>{simulatedEndPct}%</strong> (still safely above {targetCriteria}%).
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>
                      Warning! Missing <strong>{simulatedBunks}</strong> lectures drops your ending attendance to{' '}
                      <strong>{simulatedEndPct}%</strong>, which is <strong>below your required {targetCriteria}%</strong>!
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
