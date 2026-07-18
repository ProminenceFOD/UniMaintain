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

export function CancelConfirmModal({ requestId, onConfirm, onClose }: {
  requestId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
          <AlertTriangle size={22} className="text-destructive" />
        </div>
        <h3 className="text-base font-bold text-center text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Cancel this request?
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          <span className="font-mono text-xs text-foreground">{requestId}</span> will be marked as cancelled and can no longer be processed.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">
            Keep it
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded text-sm font-semibold hover:bg-destructive/90 transition-colors"
            style={{ fontFamily: "var(--font-display)" }}>
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
}
