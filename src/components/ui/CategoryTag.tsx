import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell, Check, ChevronDown, Filter, LogOut, Menu, MoreVertical,
  Plus, Search, Settings, User as UserIcon, X, Calendar, Clock,
  MessageSquare, FileText, AlertTriangle, AlertCircle, Info,
  MapPin, CheckCircle, Mail, Key, Shield, UserPlus, Eye, EyeOff,
  Edit, Trash2, Download, RefreshCw, BarChart2, PieChart, TrendingUp, ChevronLeft, ChevronRight, Hash
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { CatConfig } from "../../lib/constants";
\nexport function CategoryTag({ category }: { category: string }) {
  const c = CATEGORY_CONFIG[category as Category];
  // For custom categories stored by ID (e.g. "c7"), look up name from localStorage
  const customLabel = (() => {
    if (c) return null;
    try {
      const saved = localStorage.getItem("unimaintain_categories");
      if (!saved) return null;
      const items = JSON.parse(saved) as { id: string; name: string }[];
      return items.find(i => i.id === category)?.name ?? category;
    } catch { return category; }
  })();
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {c?.icon ?? <Layers size={12} />} {c?.label ?? customLabel}
    </span>
  );
}\n