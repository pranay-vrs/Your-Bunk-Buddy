import React, { useState } from 'react';
import { Layers, Plus, Trash2, AlertCircle, BookOpen, CheckCircle2 } from 'lucide-react';

export default function SubjectManager({
  subjects,
  setSubjects,
  minCriteria,
  subjectAnalysis,
  hasTimetable,
  policyMode
}) {
  const [newSubName, setNewSubName] = useState('');
  const [newSubWeekly, setNewSubWeekly] = useState(4);

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newSub = {
      id: 'sub-' + Date.now(),
      name: newSubName.trim(),
      weeklyCount: Number(newSubWeekly) || 3,
      conducted: '',
      attended: ''
    };

    setSubjects([...subjects, newSub]);
    setNewSubName('');
    setNewSubWeekly(4);
  };

  const handleRemoveSubject = (id) => {
    setSubjects(subjects.filter((s) => s.id !== id));
  };

  const handleUpdateSubject = (id, field, value) => {
    setSubjects(
      subjects.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  return (
    <div className="card subjects-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Layers size={20} className="text-slate-700" />
            {hasTimetable ? 'Subjects Extracted from Timetable' : 'Subject-Wise Attendance Breakdown'}
          </h2>
          <p className="section-subtitle">
            {hasTimetable
              ? 'Automatically populated from your uploaded schedule. Highlights heavy-credit subjects and individual targets.'
              : 'Shows subject load once you upload a timetable above, or you can add subjects manually.'}
          </p>
        </div>
      </div>

      {/* When timetable is not yet uploaded and no subjects exist */}
      {!hasTimetable && subjects.length === 0 ? (
        <div className="empty-subjects-state">
          <BookOpen size={28} className="text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No Timetable Uploaded Yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload your college timetable in the section above. AI will automatically extract all subjects, lecture counts, and individual attendance targets.
          </p>
        </div>
      ) : (
        <>
          {/* Add Subject manually if desired */}
          {!hasTimetable && (
            <form onSubmit={handleAddSubject} className="add-subject-form">
              <div className="flex-1">
                <label htmlFor="new-sub-name" className="text-xs font-semibold text-slate-600 block mb-1">
                  Subject Name
                </label>
                <input
                  id="new-sub-name"
                  type="text"
                  placeholder="e.g. Mathematics, Operating Systems, Lab"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="w-36">
                <label htmlFor="new-sub-weekly" className="text-xs font-semibold text-slate-600 block mb-1">
                  Lectures / Week
                </label>
                <input
                  id="new-sub-weekly"
                  type="number"
                  min="1"
                  max="15"
                  value={newSubWeekly}
                  onChange={(e) => setNewSubWeekly(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="self-end">
                <button type="submit" className="primary-btn flex items-center gap-1">
                  <Plus size={16} />
                  Add Subject
                </button>
              </div>
            </form>
          )}

          {/* Subjects Table */}
          <div className="table-responsive">
            <table className="subjects-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Weekly Load</th>
                  <th>Impact Level</th>
                  <th>Total Lectures</th>
                  <th>Req. ({minCriteria}%)</th>
                  <th>Max Bunks</th>
                  <th>Held / Attended</th>
                  {!hasTimetable && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {subjectAnalysis.map((sub) => {
                  const hasStatus = sub.conducted && Number(sub.conducted) > 0;
                  return (
                    <tr key={sub.id} className={sub.isHighImpact ? 'high-impact-row' : ''}>
                      <td>
                        <div className="subject-name-cell">
                          <strong>{sub.name}</strong>
                          {sub.isHighImpact && (
                            <span
                              className="high-impact-badge"
                              title="High weekly lecture frequency. Missing classes in this subject affects total attendance heavily."
                            >
                              ⚡ High Impact ({sub.impactRatio}x sensitivity)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-slate-800">{sub.weeklyCount}</span>
                        <span className="text-xs text-slate-500 ml-1">hrs/wk</span>
                      </td>
                      <td>
                        {sub.isHighImpact ? (
                          <span className="badge-critical">Heavy Weight</span>
                        ) : (
                          <span className="badge-normal">Normal</span>
                        )}
                      </td>
                      <td className="font-semibold text-slate-800">{sub.totalSemesterLectures}</td>
                      <td className="font-semibold text-amber-700">{sub.minRequired}</td>
                      <td className="font-semibold text-emerald-700">{sub.maxBunks}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="Held"
                            value={sub.conducted || ''}
                            onChange={(e) => handleUpdateSubject(sub.id, 'conducted', e.target.value)}
                            className="table-input w-16"
                            title="Classes conducted so far"
                          />
                          <span className="text-slate-400">/</span>
                          <input
                            type="number"
                            placeholder="Att."
                            value={sub.attended || ''}
                            onChange={(e) => handleUpdateSubject(sub.id, 'attended', e.target.value)}
                            className="table-input w-16"
                            title="Classes attended so far"
                          />
                        </div>
                        {hasStatus && (
                          <div className="text-xs mt-1">
                            <span
                              className={
                                sub.currentPct >= minCriteria
                                  ? 'text-emerald-700 font-medium'
                                  : 'text-rose-700 font-medium'
                              }
                            >
                              {sub.currentPct}%
                            </span>
                            {sub.currentPct >= minCriteria ? (
                              <span className="text-slate-500 ml-1">
                                ({sub.safeBunksNow} safe bunks)
                              </span>
                            ) : (
                              <span className="text-rose-600 font-medium ml-1">
                                (need {sub.needAttendNow} classes)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {!hasTimetable && (
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubject(sub.id)}
                            className="delete-icon-btn"
                            title="Remove subject"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {subjectAnalysis.some((s) => s.isHighImpact) && (
            <div className="high-impact-notice mt-3">
              <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Important:</strong> Subjects marked with{' '}
                <span className="font-semibold">⚡ High Impact</span> have significantly more lectures scheduled per week.
                Missing 1 lecture in a high-load subject has higher mathematical impact on your attendance compared to a 1-lecture elective or tutorial.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
