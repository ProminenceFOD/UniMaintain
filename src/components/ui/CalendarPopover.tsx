import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";


import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { DayPicker, DateRange } from "react-day-picker";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";

import type { CatConfig } from "../../lib/constants";

export function CalendarPopover({ label, value, onChange, mode = "single", rangeValue, onRangeChange }: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  mode?: "single" | "range";
  rangeValue?: { from: string; to: string };
  onRangeChange?: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = (() => {
    if (mode === "range") {
      if (rangeValue?.from && rangeValue?.to)
        return `${rangeValue.from} → ${rangeValue.to}`;
      if (rangeValue?.from) return `From ${rangeValue.from}`;
      return "Select range…";
    }
    return value || "Select date…";
  })();

  const selectedSingle = value ? new Date(value + "T00:00:00") : undefined;

  const selectedRange: DateRange | undefined = rangeValue?.from ? {
    from: new Date(rangeValue.from + "T00:00:00"),
    to:   rangeValue?.to ? new Date(rangeValue.to + "T00:00:00") : undefined,
  } : undefined;

  function toStr(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-2 bg-background border rounded text-sm transition-colors min-w-[180px] justify-between ${
          open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
        }`}>
        <span className={value || (rangeValue?.from) ? "text-foreground" : "text-muted-foreground"}>
          {displayValue}
        </span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded shadow-2xl p-3"
          style={{ minWidth: 280 }}>
          {mode === "single" ? (
            <DayPicker
              mode="single"
              selected={selectedSingle}
              onSelect={d => {
                if (d) { onChange?.(toStr(d)); setOpen(false); }
              }}
              className="!font-sans"
              classNames={{
                months:       "flex flex-col",
                month:        "space-y-2",
                caption:      "flex justify-center items-center relative py-1",
                caption_label:"text-sm font-semibold text-foreground",
                nav:          "flex items-center gap-1",
                nav_button:   "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                nav_button_previous: "absolute left-1",
                nav_button_next:     "absolute right-1",
                table:        "w-full border-collapse",
                head_row:     "flex",
                head_cell:    "text-muted-foreground rounded w-9 font-normal text-xs text-center",
                row:          "flex w-full mt-1",
                cell:         "text-center text-sm p-0 relative",
                day:          "h-9 w-9 p-0 font-normal rounded hover:bg-muted transition-colors text-xs mx-auto flex items-center justify-center",
                day_selected: "!bg-primary !text-primary-foreground hover:!bg-primary/90 font-semibold",
                day_today:    "border border-primary/40 text-primary font-semibold",
                day_outside:  "text-muted-foreground/40",
                day_disabled: "text-muted-foreground/30 cursor-not-allowed",
              }}
            />
          ) : (
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={range => {
                onRangeChange?.(
                  range?.from ? toStr(range.from) : "",
                  range?.to   ? toStr(range.to)   : ""
                );
              }}
              numberOfMonths={1}
              className="!font-sans"
              classNames={{
                months:       "flex flex-col",
                month:        "space-y-2",
                caption:      "flex justify-center items-center relative py-1",
                caption_label:"text-sm font-semibold text-foreground",
                nav:          "flex items-center gap-1",
                nav_button:   "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                nav_button_previous: "absolute left-1",
                nav_button_next:     "absolute right-1",
                table:        "w-full border-collapse",
                head_row:     "flex",
                head_cell:    "text-muted-foreground rounded w-9 font-normal text-xs text-center",
                row:          "flex w-full mt-1",
                cell:         "text-center text-sm p-0 relative",
                day:          "h-9 w-9 p-0 font-normal rounded hover:bg-muted transition-colors text-xs mx-auto flex items-center justify-center",
                day_selected: "!bg-primary !text-primary-foreground hover:!bg-primary/90",
                day_range_middle: "!bg-primary/15 !text-primary rounded-none",
                day_range_start:  "!bg-primary !text-primary-foreground rounded-r-none",
                day_range_end:    "!bg-primary !text-primary-foreground rounded-l-none",
                day_today:    "border border-primary/40 text-primary font-semibold",
                day_outside:  "text-muted-foreground/40",
              }}
            />
          )}
          {(mode === "range" && rangeValue?.from) && (
            <div className="border-t border-border pt-2 mt-2 flex justify-end">
              <button onClick={() => { onRangeChange?.("",""); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                Clear
              </button>
              {rangeValue.to && (
                <button onClick={() => setOpen(false)}
                  className="ml-2 text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 transition-colors font-semibold">
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
