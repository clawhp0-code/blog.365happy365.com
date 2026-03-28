"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface CalendarWidgetProps {
  locale?: Locale;
}

export function CalendarWidget({ locale = "ko" }: CalendarWidgetProps) {
  const [current, setCurrent] = useState(new Date());
  const dict = getDictionary(locale);
  const DAYS = dict.calendar.days;

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-[#999999] hover:text-[#607D8B] text-sm px-1">&laquo;</button>
        <span className="font-heading font-bold text-sm text-[#4A3728]">
          {year}/{String(month + 1).padStart(2, "0")}
        </span>
        <button onClick={nextMonth} className="text-[#999999] hover:text-[#607D8B] text-sm px-1">&raquo;</button>
      </div>
      <table className="w-full text-center text-[0.7rem]">
        <thead>
          <tr>
            {DAYS.map((d) => (
              <th key={d} className="py-1 text-[#999999] font-normal">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((day, i) => (
                <td
                  key={i}
                  className={`py-0.5 ${
                    isCurrentMonth && day === today.getDate()
                      ? "font-bold text-[#607D8B]"
                      : day ? "text-[#555555]" : ""
                  }`}
                >
                  {day || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
