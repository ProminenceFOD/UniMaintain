import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, CheckCircle2, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, Paperclip, ChevronDown, ChevronLeft, ChevronRight, Send, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Activity, Key, Trash2, Edit, Hash, PieChart } from "lucide-react";
import { formatDate, formatDateTime } from "../../lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CategoryTag } from "../../components/ui/CategoryTag";
import { PriorityLabel } from "../../components/ui/PriorityLabel";
import { CancelConfirmModal } from "../../components/requests/CancelConfirmModal";
import { FeedbackModal } from "../../components/requests/FeedbackModal";

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

export function RequestDetail({ request, currentUser, onClose, onStatusUpdate, onDelete, onAssign, officers, onAddComment }: {
  request: Request; currentUser: User; onClose: () => void;
  onStatusUpdate: (id: string, status: Status, note: string) => void;
  onDelete: (id: string) => void;
  onAssign: (requestId: string, officerId: string) => void;
  officers: User[];
  onAddComment?: (requestId: string, message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(true);

  const isMyRequest = ["student","staff"].includes(currentUser.role) && request.submittedBy === currentUser.id;
  const isMyTask    = currentUser.role === "officer"  && request.assignedTo  === currentUser.id;

  function nextStatus(): Status | null {
    if (isMyRequest) {
      if (request.status === "pending")  return "cancelled"; // cancel
      if (request.status === "resolved") return "closed"; // acknowledge
    }
    if (isMyTask) {
      if (request.status === "assigned")    return "in_progress";
      if (request.status === "in_progress") return "resolved";
    }
    if (currentUser.role === "admin" && request.status === "resolved") return "closed";
    return null;
  }

  const next = nextStatus();

  const ACTION_LABEL: Record<string, string> = {
    in_progress: "Start Work",
    resolved:    "Mark Resolved",
    cancelled:   "Cancel Request",
    closed:      isMyRequest && request.status === "resolved"
                   ? "Acknowledge & Close"
                   : "Close Request",
  };

  const ACTION_STYLE: Record<string, string> = {
    in_progress: "bg-primary text-primary-foreground hover:bg-primary/90",
    resolved:    "bg-emerald-600 text-white hover:bg-emerald-700",
    cancelled:   "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    closed:      "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full sm:w-[480px] bg-card flex flex-col h-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{request.id}</span>
            <h3 className="text-sm font-semibold text-foreground mt-0.5" style={{ fontFamily: "var(--font-display)" }}>
              Request Details
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {request.title}
            </h4>
            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge status={request.status} />
              <PriorityLabel priority={request.priority} />
              <CategoryTag category={request.category} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</div>
              <div className="flex items-start gap-1.5">
                <MapPin size={13} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground">{request.location}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Submitted</div>
              <div className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(request.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Submitted by</div>
              <div className="flex items-center gap-1.5">
                <Avatar name={request.submittedByName} size="sm" />
                <span className="text-xs text-foreground">{request.submittedByName}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assigned to</div>
              {request.assignedToName ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={request.assignedToName} size="sm" />
                  <span className="text-xs text-foreground">{request.assignedToName}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Unassigned</span>
              )}
            </div>
          </div>

          {request.hasAttachment && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2.5">
              <Paperclip size={13} />
              <span>Attachments included with this request</span>
            </div>
          )}

          {/* Feedback rating — visible to admin/officer when request is closed */}
          {["admin","officer"].includes(currentUser.role) && request.status === "closed" && (() => {
            const feedbackEntry = request.audit.find(a => a.details?.includes("Rating:"));
            if (!feedbackEntry) return null;
            const match = feedbackEntry.details.match(/Rating: (★+)(☆*)/);
            const commentMatch = feedbackEntry.details.match(/— "(.+)"$/);
            const stars = match ? match[1].length : 0;
            const comment = commentMatch ? commentMatch[1] : null;
            if (stars === 0) return null;
            return (
              <div className="bg-amber-50 border border-amber-100 rounded p-3.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                  Requester Feedback
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={s <= stars ? "#C9A227" : "none"}
                        stroke={s <= stars ? "#C9A227" : "#CBD5E1"}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  ))}
                  <span className="text-xs text-amber-700 ml-1 font-medium">{stars}/5</span>
                </div>
                {comment && (
                  <p className="text-xs text-amber-800 italic">"{comment}"</p>
                )}
                <div className="text-xs text-amber-600/70 mt-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatDate(feedbackEntry.timestamp)}
                </div>
              </div>
            );
          })()}

          {/* Comments/Updates Section */}
          {request.status !== "cancelled" && request.status !== "closed" && (
            <div>
              <button
                onClick={() => setShowComments(p => !p)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
              >
                <MessageSquare size={14} />
                Updates & Communication
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {(request.comments ?? []).length}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showComments ? "rotate-180" : ""}`} />
              </button>

              {showComments && (
                <div className="space-y-3">
                  {/* Comment list */}
                  {(request.comments ?? []).length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(request.comments ?? []).map((comment) => (
                        <div key={comment.id} className="bg-muted/40 rounded p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={comment.userName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">{comment.userName}</span>
                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                  comment.userRole === "officer" ? "bg-amber-100 text-amber-700" :
                                  comment.userRole === "admin" ? "bg-primary/10 text-primary" :
                                  "bg-muted text-muted-foreground"
                                }`} style={{ fontFamily: "var(--font-mono)" }}>
                                  {comment.userRole}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                                {formatDateTime(comment.timestamp)}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed pl-9">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment form */}
                  {onAddComment && (
                    <div className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add an update or ask a question…"
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (!newComment.trim()) return;
                          onAddComment(request.id, newComment);
                          setNewComment("");
                        }}
                        disabled={!newComment.trim()}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Send size={11} /> Post Update
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audit Timeline — staff/admin only */}
          {currentUser.role !== "student" && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity Log</div>
              <div className="space-y-3">
                {request.audit.map((entry, i) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary" style={{ fontSize: 8 }}>●</span>
                      </div>
                      {i < request.audit.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                          {entry.action}
                        </span>
                        <span className="text-xs text-muted-foreground">by {entry.performedByName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                      <div className="text-xs text-muted-foreground/60 mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                        {formatDateTime(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students see a simple status timeline instead */}
          {["student","staff"].includes(currentUser.role) && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Request Status</div>
              {request.status === "cancelled" ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded">
                  <span className="w-6 h-6 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center flex-shrink-0">
                    <X size={12} className="text-red-600" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-red-700">Request Cancelled</div>
                    <div className="text-xs text-red-500 mt-0.5">You cancelled this request.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(["pending","assigned","in_progress","resolved","closed","cancelled"] as Status[]).map((s) => {
                    const statusOrder = ["pending","assigned","in_progress","resolved","closed"];
                    const currentIdx = statusOrder.indexOf(request.status);
                    const stepIdx    = statusOrder.indexOf(s);
                    const isDone     = stepIdx <= currentIdx;
                    const isCurrent  = s === request.status;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                          isCurrent ? "border-primary bg-primary" :
                          isDone    ? "border-primary bg-primary/20" :
                                      "border-border bg-background"
                        }`}>
                          {isDone && !isCurrent && <CheckCircle2 size={12} className="text-primary" />}
                          {isCurrent && <span className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                          {STATUS_CONFIG[s].label}
                        </span>
                        {isCurrent && <StatusBadge status={s} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-border">

          {/* Admin: assign officer */}
          {currentUser.role === "admin" && !["resolved","closed","cancelled"].includes(request.status) && (
            <div className="px-6 py-3 border-b border-border space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Officer</div>
              <div className="flex gap-2">
                <select value={assignId} onChange={e => setAssignId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:border-primary transition-colors">
                  <option value="">Select officer…</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name} — {o.department}</option>
                  ))}
                </select>
                <button disabled={!assignId}
                  onClick={() => { onAssign(request.id, assignId); setAssignId(""); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Assign
                </button>
              </div>
            </div>
          )}

          {/* Primary status action */}
          {next && (
            <div className="px-6 py-4 space-y-3">
              {!(isMyRequest && request.status === "resolved") && (
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note (optional)…"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                  rows={2}
                />
              )}
              <button onClick={() => {
                  if (next === "cancelled") { setShowCancelConfirm(true); return; }
                  if (next === "closed" && isMyRequest && request.status === "resolved") { setShowFeedback(true); return; }
                  onStatusUpdate(request.id, next, note || ACTION_LABEL[next]); onClose();
                }}
                className={`w-full py-2.5 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${ACTION_STYLE[next]}`}
                style={{ fontFamily: "var(--font-display)" }}>
                <Send size={14} />
                {ACTION_LABEL[next]}
              </button>
            </div>
          )}

          {/* Admin: delete request */}
          {currentUser.role === "admin" && (
            <div className="px-6 pb-4">
              {confirmDelete ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3 space-y-2">
                  <p className="text-xs text-destructive font-medium">Permanently delete this request?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => { onDelete(request.id); onClose(); }}
                      className="flex-1 py-1.5 bg-destructive text-destructive-foreground rounded text-xs font-semibold hover:bg-destructive/90 transition-colors">
                      Yes, Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-xs text-destructive hover:underline">
                  Delete this request
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <CancelConfirmModal
          requestId={request.id}
          onConfirm={() => { onStatusUpdate(request.id, "cancelled", "Request cancelled by submitter."); onClose(); }}
          onClose={() => setShowCancelConfirm(false)}
        />
      )}

      {/* Feedback/rating modal on acknowledge */}
      {showFeedback && (
        <FeedbackModal
          requestId={request.id}
          onSubmit={(rating, comment) => {
            const feedback = `Acknowledged. Rating: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}${comment ? ` — "${comment}"` : ""}`;
            onStatusUpdate(request.id, "closed", feedback);
            onClose();
          }}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}
