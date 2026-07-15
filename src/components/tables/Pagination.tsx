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

export function Pagination({ page, total, perPage, onPage }: {
  page: number; total: number; perPage: number; onPage: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
      <span>
        {total === 0 ? "0" : `${Math.min((page - 1) * perPage + 1, total)}–${Math.min(page * perPage, total)}`} of {total}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(page - 1)} disabled={page === 1}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
            let p = i + 1;
            if (pages > 5) {
              if (page <= 3) p = i + 1;
              else if (page >= pages - 2) p = pages - 4 + i;
              else p = page - 2 + i;
            }
            return (
              <button key={p} onClick={() => onPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => onPage(page + 1)} disabled={page === pages}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
