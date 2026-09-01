"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkoutDay = {
  date: string;
  workoutId: string;
  routineName: string;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarHeatmap({ workouts }: { workouts: WorkoutDay[] }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const workoutMap = new Map<string, WorkoutDay[]>();
  for (const w of workouts) {
    const existing = workoutMap.get(w.date) ?? [];
    existing.push(w);
    workoutMap.set(w.date, existing);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-sm">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-sm text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = toDateKey(year, month, day);
          const dayWorkouts = workoutMap.get(dateKey);
          const hasWorkout = !!dayWorkouts && dayWorkouts.length > 0;
          const isToday = dateKey === todayKey;

          return (
            <button
              key={day}
              onClick={() => {
                if (hasWorkout) {
                  router.push(`/history/${dayWorkouts[0].workoutId}`);
                }
              }}
              className={`
                relative flex flex-col items-center justify-center rounded-lg py-2.5
                text-sm transition-colors
                ${hasWorkout ? "cursor-pointer active:scale-95" : "cursor-default"}
                ${isToday ? "ring-1 ring-primary" : ""}
                ${hasWorkout ? "bg-primary/10 font-medium" : ""}
              `}
            >
              {day}
              {hasWorkout && (
                <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
