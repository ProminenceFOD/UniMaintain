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
\nexport function FeedbackModal({ requestId, onSubmit, onClose }: {
  requestId: string;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const labels: Record<number, string> = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 mx-auto mb-4">
          <CheckCircle2 size={22} className="text-emerald-600" />
        </div>
        <h3 className="text-base font-bold text-center text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Request resolved!
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          How satisfied are you with the resolution of <span className="font-mono text-xs text-foreground">{requestId}</span>?
        </p>

        {/* Star rating */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1,2,3,4,5].map(star => (
            <button key={star} type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={(hovered || rating) >= star ? "#C9A227" : "none"}
                  stroke={(hovered || rating) >= star ? "#C9A227" : "#CBD5E1"}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
        {(hovered || rating) > 0 && (
          <p className="text-xs text-center text-muted-foreground mb-4">{labels[hovered || rating]}</p>
        )}

        {/* Comment */}
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Any additional feedback? (optional)"
          rows={3}
          className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors mb-4"
        />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">
            Skip
          </button>
          <button
            disabled={rating === 0}
            onClick={() => { onSubmit(rating, comment); onClose(); }}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-display)" }}>
            Submit feedback
          </button>
        </div>
      </div>
    </div>
  );
}\n