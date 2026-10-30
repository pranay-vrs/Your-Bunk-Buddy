import React, { useState } from 'react';
import { CalendarCheck, Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getSemesterHolidays, parseDate, isWeekend } from '../utils/calculator';

export default function HolidaysList({
  startDate,
  endDate,
  disabledHolidayIds,
  setDisabledHolidayIds,
  customHolidays,
  setCustomHolidays,
  weekendPolicy
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customDays, setCustomDays] = useState(1);

  const holidays = getSemesterHolidays(startDate, endDate, disabledHolidayIds, customHolidays);

  const toggleHoliday = (id) => {
    if (disabledHolidayIds.includes(id)) {
      setDisabledHolidayIds(disabledHolidayIds.filter((item) => item !== id));
    } else {
      setDisabledHolidayIds([...disabledHolidayIds, id]);
    }
  };

  const handleAddCustomHoliday = (e) => {
    e.preventDefault();
    if (!customName.trim() || !customDate) return;

    const daysCount = Math.max(1, Number(customDays) || 1);
    const newItems = [];
    const baseDate = parseDate(customDate);

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate.getTime());
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      newItems.push({
        id: `custom-${Date.now()}-${i}`,
        name: daysCount > 1 ? `${customName.trim()} (Day ${i + 1})` : customName.trim(),
        date: dateStr,
        type: 'Custom College'
      });
    }

    setCustomHolidays([...customHolidays, ...newItems]);
    setCustomName('');
    setCustomDate('');
    setCustomDays(1);
  };

  const handleRemoveCustomHoliday = (id) => {
    setCustomHolidays(customHolidays.filter((h) => h.id !== id));
  };

  // Count active holidays on weekdays
  const workingDayHolidaysCount = holidays.filter((h) => {
    if (h.disabled) return false;
    const d = parseDate(h.date);
    return !isWeekend(d, weekendPolicy);
  }).length;

  return (
    <div className="card holidays-card">
      <div className="card-header cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <CalendarCheck size={20} className="text-slate-700" />
          <div>
            <h2 className="card-title">
              Indian Festival & College Holidays ({workingDayHolidaysCount} Teaching Days Saved)
            </h2>
            <p className="section-subtitle">
              Includes Gazetted & National holidays. Add college-specific fests, exam breaks & vacations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium border border-slate-200">
            {isOpen ? 'Collapse' : 'View & Manage Holidays'}
          </span>
          {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </div>
      </div>

      {isOpen && (
        <div className="holidays-content mt-4">
          {/* Add custom holiday / vacation form */}
          <form onSubmit={handleAddCustomHoliday} className="add-custom-holiday-form">
            <div className="flex-1">
              <label htmlFor="custom-holiday-name" className="text-xs font-semibold text-slate-700 block mb-1">
                Custom College Holiday / Vacation
              </label>
              <input
                id="custom-holiday-name"
                type="text"
                placeholder="e.g. Diwali Break, Annual Tech Fest, Study Leave"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="w-40">
              <label htmlFor="custom-holiday-date" className="text-xs font-semibold text-slate-700 block mb-1">
                Start Date
              </label>
              <input
                id="custom-holiday-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="w-24">
              <label htmlFor="custom-holiday-days" className="text-xs font-semibold text-slate-700 block mb-1">
                Days
              </label>
              <input
                id="custom-holiday-days"
                type="number"
                min="1"
                max="30"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="self-end">
              <button type="submit" className="primary-btn flex items-center gap-1">
                <Plus size={16} />
                Add
              </button>
            </div>
          </form>

          {/* List of holidays */}
          <div className="holidays-table-wrapper">
            {holidays.length === 0 ? (
              <p className="text-sm text-slate-500 py-3 text-center">
                No holidays recorded in the chosen date range. You can add your college-specific holidays above.
              </p>
            ) : (
              <table className="holidays-table">
                <thead>
                  <tr>
                    <th className="w-12">Active</th>
                    <th>Holiday / Festival</th>
                    <th>Date</th>
                    <th>Day of Week</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => {
                    const d = parseDate(h.date);
                    const isWknd = isWeekend(d, weekendPolicy);
                    const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
                    const formattedDate = d.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    return (
                      <tr key={h.id} className={h.disabled ? 'opacity-50 line-through-text' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!h.disabled}
                            onChange={() => toggleHoliday(h.id)}
                            className="cursor-pointer"
                            title="Toggle holiday on or off"
                          />
                        </td>
                        <td className="font-medium text-slate-800">
                          {h.name}
                          {isWknd && (
                            <span className="text-xs text-slate-400 block font-normal">
                              (Falls on weekend)
                            </span>
                          )}
                        </td>
                        <td className="text-slate-600 text-sm">{formattedDate}</td>
                        <td className="text-slate-600 text-sm">{dayName}</td>
                        <td>
                          <span
                            className={`holiday-type-pill ${
                              h.type === 'National'
                                ? 'pill-national'
                                : h.type === 'Custom College'
                                ? 'pill-custom'
                                : 'pill-gazetted'
                            }`}
                          >
                            {h.type}
                          </span>
                        </td>
                        <td>
                          {h.type === 'Custom College' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomHoliday(h.id)}
                              className="delete-icon-btn"
                              title="Delete custom holiday"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

