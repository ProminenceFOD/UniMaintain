import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, Layers, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";


import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";

import type { CatConfig } from "../../lib/constants";

export function CategoryTag({ category }: { category: string }) {
  const key = (category || "other").toLowerCase();
  const c = CATEGORY_CONFIG[key as Category] || CATEGORY_CONFIG[category as Category];

  const label = c?.label || (() => {
    try {
      const saved = localStorage.getItem("unimaintain_categories");
      if (saved) {
        const items = JSON.parse(saved) as { id: string; name: string }[];
        const found = items.find(i => i.id === category || i.name.toLowerCase() === key)?.name;
        if (found) return found;
      }
    } catch {}
    return category ? category.charAt(0).toUpperCase() + category.slice(1) : "Other";
  })();

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
      {c?.icon ?? <Layers className="w-4 h-4 text-slate-500" />}
      <span>{label}</span>
    </span>
  );
}
