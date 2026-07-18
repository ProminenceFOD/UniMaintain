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

import type { CatConfig } from "../../lib/constants";

export function FiltersBar({ search, setSearch, statusFilter, setStatusFilter, categoryFilter, setCategoryFilter }: {
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  categoryFilter: string; setCategoryFilter: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2 flex-1 min-w-48">
        <Search size={13} className="text-muted-foreground flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or ID…"
          className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground"
        />
      </div>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        className="bg-card border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer">
        <option value="">All Statuses</option>
        {(["pending","assigned","in_progress","resolved","closed","cancelled"] as Status[]).map(s => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
        className="bg-card border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer">
        <option value="">All Categories</option>
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
          <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
        ))}
      </select>
    </div>
  );
}
