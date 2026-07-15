import React from "react";
import { AlertCircle, Info } from "lucide-react";
import type { Status, Priority, Category } from "../types";

export const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: "Pending Review",  bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500" },
  in_progress: { label: "In Progress",     bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500" },
  resolved:    { label: "Resolved",        bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500" },
  cancelled:   { label: "Cancelled",       bg: "bg-slate-50",   text: "text-slate-700",  dot: "bg-slate-500" },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "text-red-600 bg-red-50 ring-red-500/20" },
  high:   { label: "High",   color: "text-orange-600 bg-orange-50 ring-orange-500/20" },
  medium: { label: "Medium", color: "text-yellow-600 bg-yellow-50 ring-yellow-500/20" },
  low:    { label: "Low",    color: "text-green-600 bg-green-50 ring-green-500/20" },
};

export type CatConfig = { label: string; icon: React.ReactNode };
export const CATEGORY_CONFIG: Record<Category, CatConfig> = {
  plumbing:   { label: "Plumbing",   icon: <AlertCircle className="w-4 h-4" /> },
  electrical: { label: "Electrical", icon: <AlertCircle className="w-4 h-4" /> },
  hvac:       { label: "HVAC",       icon: <AlertCircle className="w-4 h-4" /> },
  furniture:  { label: "Furniture",  icon: <Info className="w-4 h-4" /> },
  cleaning:   { label: "Cleaning",   icon: <Info className="w-4 h-4" /> },
  general:    { label: "General",    icon: <Info className="w-4 h-4" /> },
};

export const SETTINGS_KEY = "unimaintain_site_settings";
export const CATEGORIES_KEY = "unimaintain_categories";
export type CategoryItem = { id: string; name: string; desc: string };
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat_1", name: "Plumbing", desc: "Leaks, clogs, water pressure" },
  { id: "cat_2", name: "Electrical", desc: "Outages, fixtures, wiring" },
  { id: "cat_3", name: "HVAC", desc: "Heating, cooling, ventilation" },
  { id: "cat_4", name: "Furniture", desc: "Broken desks, chairs, beds" },
  { id: "cat_5", name: "Cleaning", desc: "Spills, deep cleaning needs" },
  { id: "cat_6", name: "General", desc: "Other maintenance issues" },
];
