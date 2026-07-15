import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";


import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import type { CatConfig } from "../../lib/constants";

export function MonthPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(value ? parseInt(value.slice(0, 4)) : currentYear);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : -1;
  const selectedYear  = value ? parseInt(value.slice(0, 4)) : -1;

  const displayValue = value
    ? `${MONTHS[parseInt(value.slice(5,7)) - 1]} ${value.slice(0,4)}`
    : "Select month…";

  function selectMonth(m: number) {
    const mm = String(m + 1).padStart(2, "0");
    onChange(`${year}-${mm}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-2 bg-background border rounded text-sm transition-colors min-w-[180px] justify-between ${
          open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
        }`}>
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{displayValue}</span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded shadow-2xl p-4 w-64">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setYear(y => y - 1)}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const isSelected = selectedYear === year && selectedMonth === i;
              const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === i;
              return (
                <button key={m} onClick={() => selectMonth(i)}
                  className={`py-2 rounded text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                      ? "border border-primary/40 text-primary hover:bg-primary/10"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}>
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
