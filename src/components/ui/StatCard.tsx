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
\nexport function StatCard({ label, value, sub, icon, accent = false }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`bg-card border border-border rounded p-5 flex items-start gap-4 ${accent ? "border-l-2 border-l-accent" : ""}`}>
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70 mt-1">{sub}</div>}
      </div>
    </div>
  );
}\n