import React, { useState, useRef } from 'react';
import { Upload, FileImage, Sparkles, AlertCircle, CheckCircle2, Trash2, Plus, RefreshCw } from 'lucide-react';
import { analyzeTimetableImage } from '../services/timetableAi';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableUploader({
  timetableSchedule,
  setTimetableSchedule,
  onTimetableProcessed
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeDayTab, setActiveDayTab] = useState('Monday');

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select or drop a timetable image or PDF first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const result = await analyzeTimetableImage(selectedFile);
      setTimetableSchedule(result.schedule);
      if (onTimetableProcessed) {
        onTimetableProcessed(result);
      }
    } catch (err) {
      console.error('Timetable AI analysis error:', err);
      let userFriendlyMsg = err.message || 'Failed to analyze timetable.';
      
      if (userFriendlyMsg.includes('API_KEY_INVALID') || userFriendlyMsg.includes('403') || userFriendlyMsg.includes('API key not valid')) {
        userFriendlyMsg = 'The configured Gemini API key is invalid or restricted. Please verify your GEMINI_API_KEY in Vercel settings.';
      } else if (userFriendlyMsg.includes('GEMINI_API_KEY is not configured')) {
        userFriendlyMsg = 'Website setup required: Please add GEMINI_API_KEY in your Vercel Project Settings -> Environment Variables.';
      } else if (userFriendlyMsg.includes('404')) {
        userFriendlyMsg = 'Model endpoint error (404). Please try again in a few moments.';
      } else if (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('high demand')) {
        userFriendlyMsg = 'The AI model is experiencing a brief high-demand spike. Please wait a few seconds and try again.';
      } else if (userFriendlyMsg.includes('Resource has been exhausted') || userFriendlyMsg.includes('429')) {
        userFriendlyMsg = 'API rate limit reached. Please wait 30 seconds and try again.';
      }
      
      setErrorMsg(userFriendlyMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateSlot = (day, slotId, field, value) => {
    if (!timetableSchedule) return;
    const daySlots = timetableSchedule[day] || [];
    const updated = daySlots.map((s) => {
      if (s.id === slotId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    const newSchedule = { ...timetableSchedule, [day]: updated };
    setTimetableSchedule(newSchedule);
    if (onTimetableProcessed) {
      onTimetableProcessed({ schedule: newSchedule });
    }
  };

  const handleDeleteSlot = (day, slotId) => {
    if (!timetableSchedule) return;
    const daySlots = timetableSchedule[day] || [];
    const updated = daySlots.filter((s) => s.id !== slotId);
    const newSchedule = { ...timetableSchedule, [day]: updated };
    setTimetableSchedule(newSchedule);
    if (onTimetableProcessed) {
      onTimetableProcessed({ schedule: newSchedule });
    }
  };

  const handleAddSlot = (day) => {
    if (!timetableSchedule) return;
    const daySlots = timetableSchedule[day] || [];
    const newSlot = {
      id: `${day.toLowerCase()}-${Date.now()}`,
      subject: 'New Subject',
      type: 'Theory',
      durationSlots: 1
    };
    const updated = [...daySlots, newSlot];
    const newSchedule = { ...timetableSchedule, [day]: updated };
    setTimetableSchedule(newSchedule);
    if (onTimetableProcessed) {
      onTimetableProcessed({ schedule: newSchedule });
    }
  };

  const handleResetTimetable = () => {
    setTimetableSchedule(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onTimetableProcessed) {
      onTimetableProcessed({ schedule: null, subjects: [] });
    }
  };

  const hasExtractedData = timetableSchedule && Object.keys(timetableSchedule).length > 0;

  return (
    <div className="card timetable-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Upload size={20} className="text-slate-700" />
            Upload College Timetable (AI Schedule Analyzer)
          </h2>
          <p className="section-subtitle">
            Upload your weekly timetable photo or PDF. AI will extract periods, subject frequencies, and calculate required college days.
          </p>
        </div>
        {hasExtractedData && (
          <button type="button" onClick={handleResetTimetable} className="chip-btn flex items-center gap-1">
            <RefreshCw size={13} />
            Re-upload Timetable
          </button>
        )}
      </div>

      {/* Upload Zone (shown when no timetable is parsed yet) */}
      {!hasExtractedData && (
        <div className="upload-container">
          <div
            className={`dropzone ${selectedFile ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="preview-container">
                <img src={previewUrl} alt="Timetable preview" className="preview-img" />
                <p className="text-xs text-slate-600 mt-2">
                  Selected: <strong>{selectedFile?.name}</strong> (Click or drop to replace)
                </p>
              </div>
            ) : selectedFile ? (
              <div className="file-info-box">
                <FileImage size={36} className="text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="dropzone-content">
                <Upload size={36} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  Drop your Timetable image or PDF here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PNG, JPG, JPEG, WEBP or PDF documents
                </p>
                <button type="button" className="chip-btn mt-3" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="error-banner mt-3">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span className="text-xs text-rose-700">{errorMsg}</span>
            </div>
          )}

          {selectedFile && (
            <div className="analyze-action-row mt-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="primary-btn w-full flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Analyzing Timetable with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Analyze Timetable & Calculate Days</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Extracted Timetable Grid & Verification */}
      {hasExtractedData && (
        <div className="extracted-schedule-wrapper">
          <div className="verification-header">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Timetable Successfully Analyzed</span>
            </div>
            <span className="text-xs text-slate-500">
              Review periods below. You can click on subject names or slot hours to edit if needed.
            </span>
          </div>

          {/* Weekday Tabs */}
          <div className="day-tabs-bar">
            {DAYS_OF_WEEK.map((day) => {
              const count = (timetableSchedule[day] || []).reduce(
                (sum, s) => sum + (Number(s.durationSlots) || 1),
                0
              );
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDayTab(day)}
                  className={`day-tab-btn ${activeDayTab === day ? 'active' : ''}`}
                >
                  <span>{day.slice(0, 3)}</span>
                  <span className="day-slot-badge">{count} classes</span>
                </button>
              );
            })}
          </div>

          {/* Slots Table for Selected Day */}
          <div className="active-day-slots-card">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {activeDayTab} Schedule (
                {(timetableSchedule[activeDayTab] || []).reduce(
                  (sum, s) => sum + (Number(s.durationSlots) || 1),
                  0
                )}{' '}
                Total Hours/Periods)
              </h4>
              <button
                type="button"
                onClick={() => handleAddSlot(activeDayTab)}
                className="chip-btn flex items-center gap-1"
              >
                <Plus size={13} />
                Add Period
              </button>
            </div>

            {(timetableSchedule[activeDayTab] || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                No classes scheduled on {activeDayTab}.
              </p>
            ) : (
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Subject Name</th>
                    <th>Type</th>
                    <th>Periods / Hours</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(timetableSchedule[activeDayTab] || []).map((slot) => (
                    <tr key={slot.id}>
                      <td>
                        <input
                          type="text"
                          value={slot.subject}
                          onChange={(e) =>
                            handleUpdateSlot(activeDayTab, slot.id, 'subject', e.target.value)
                          }
                          className="table-input w-full font-medium"
                        />
                      </td>
                      <td className="w-28">
                        <select
                          value={slot.type}
                          onChange={(e) =>
                            handleUpdateSlot(activeDayTab, slot.id, 'type', e.target.value)
                          }
                          className="table-input select-field w-full text-xs"
                        >
                          <option value="Theory">Theory</option>
                          <option value="Lab">Lab (Practical)</option>
                          <option value="Tutorial">Tutorial</option>
                        </select>
                      </td>
                      <td className="w-24">
                        <input
                          type="number"
                          min="1"
                          max="4"
                          value={slot.durationSlots}
                          onChange={(e) =>
                            handleUpdateSlot(
                              activeDayTab,
                              slot.id,
                              'durationSlots',
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="table-input w-16"
                        />
                        <span className="text-xs text-slate-500 ml-1">hr(s)</span>
                      </td>
                      <td className="w-12 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(activeDayTab, slot.id)}
                          className="delete-icon-btn"
                          title="Remove period"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
