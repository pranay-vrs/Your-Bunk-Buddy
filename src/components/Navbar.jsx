import React, { useState } from 'react';
import { Calculator, HelpCircle, RotateCcw, X, ExternalLink } from 'lucide-react';

export default function Navbar({ onReset }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-icon">
            <Calculator size={22} />
          </div>
          <div>
            <h1 className="brand-title">Your Bunk Buddy</h1>
            <span className="brand-tagline">Indian College Attendance & Bunk Calculator</span>
          </div>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="navbar-btn"
            title="How calculations work"
          >
            <HelpCircle size={16} />
            <span>Rules & Formulas</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="navbar-btn text-rose-700"
            title="Reset to default settings"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Indian College Attendance Rules & Mathematics</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="delete-icon-btn"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body space-y-4 text-sm text-slate-700 leading-relaxed">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">1. The 75% Minimum Criteria (UGC / AICTE)</h4>
                <p>
                  Most Indian universities (VTU, AKTU, Anna University, Mumbai University, Delhi University, etc.) mandate a minimum of <strong>75% attendance</strong> to be eligible to sit for semester examinations. Falling below 75% without authorized medical condonation (which usually permits up to 65%) results in detention (repeating the course).
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-1">2. How consecutive classes to attend are calculated:</h4>
                <p className="bg-black/40 p-2.5 rounded-lg border border-indigo-500/30 font-mono text-xs text-white my-1.5">
                  Needed = ⌈ (Target% × Conducted - 100 × Attended) / (100 - Target%) ⌉
                </p>
                <p className="text-xs text-indigo-200 mt-1">
                  Example: If you attended 18 out of 30 classes (60%), and need 75%:
                  ⌈ (0.75 × 30 - 18) / (1 - 0.75) ⌉ = ⌈ (22.5 - 18) / 0.25 ⌉ = ⌈ 18 ⌉ = You must attend the next <strong>18 consecutive lectures</strong>!
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-1">3. How safe bunks are calculated:</h4>
                <p className="bg-black/40 p-2.5 rounded-lg border border-indigo-500/30 font-mono text-xs text-white my-1.5">
                  Safe Bunks = ⌊ (100 × Attended - Target% × Conducted) / Target% ⌋
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-1">4. High-Impact Subject Sensitivity:</h4>
                <p>
                  A course that meets 5 times a week contributes much more to your total attendance pool than a 1-lecture elective or 2-hour lab. Missing even 2 classes of a 5-lecture subject can decrease your overall percentage rapidly.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="primary-btn"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

