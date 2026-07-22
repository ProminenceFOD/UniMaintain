import { Zap, Droplets, Wind, Wifi, Armchair, Sparkles, HelpCircle, Layers } from "lucide-react";

import type { Status, Priority, Category, CategoryItem } from "../types";

import React from "react";

export const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending Review", bg: "bg-amber-50 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400" },
  assigned: { label: "Assigned", bg: "bg-purple-50 dark:bg-purple-500/20", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500 dark:bg-purple-400" },
  in_progress: { label: "In Progress", bg: "bg-blue-50 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500 dark:bg-blue-400" },
  resolved: { label: "Resolved", bg: "bg-emerald-50 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
  closed: { label: "Closed", bg: "bg-gray-50 dark:bg-gray-500/20", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-500 dark:bg-gray-400" },
  cancelled: { label: "Cancelled", bg: "bg-slate-50 dark:bg-slate-500/20", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500 dark:bg-slate-400" },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/20 ring-red-500/20 dark:ring-red-400/30" },
  high: { label: "High", color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/20 ring-orange-500/20 dark:ring-orange-400/30" },
  medium: { label: "Medium", color: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/20 ring-yellow-500/20 dark:ring-yellow-400/30" },
  low: { label: "Low", color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/20 ring-green-500/20 dark:ring-green-400/30" },
};

export type CatConfig = { label: string; icon: React.ReactNode };
export const CATEGORY_CONFIG: Record<string, CatConfig> & Record<Category, CatConfig> = {
  electricity: { label: "Electricity", icon: <Zap className="w-4 h-4 text-amber-500" /> },
  electrical: { label: "Electricity", icon: <Zap className="w-4 h-4 text-amber-500" /> },
  plumbing: { label: "Plumbing", icon: <Droplets className="w-4 h-4 text-blue-500" /> },
  hvac: { label: "HVAC", icon: <Wind className="w-4 h-4 text-cyan-500" /> },
  internet: { label: "Internet", icon: <Wifi className="w-4 h-4 text-indigo-500" /> },
  furniture: { label: "Furniture", icon: <Armchair className="w-4 h-4 text-orange-500" /> },
  cleaning: { label: "Cleaning", icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
  other: { label: "Other", icon: <HelpCircle className="w-4 h-4 text-slate-500" /> },
  general: { label: "General", icon: <Layers className="w-4 h-4 text-slate-500" /> },
};

export const SETTINGS_KEY = "unimaintain_site_settings";
export const CATEGORIES_KEY = "unimaintain_categories";
export type CategoryItem = { id: string; name: string; desc: string };
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "electricity", name: "Electricity",   desc: "Outages, power outlets, light fixtures, wiring" },
  { id: "plumbing",    name: "Plumbing",      desc: "Leaks, pipe repairs, clogged drains, water pressure" },
  { id: "hvac",        name: "HVAC",          desc: "Air conditioning, heating, ceiling fans, ventilation" },
  { id: "internet",    name: "Internet / IT", desc: "Wi-Fi access points, ethernet ports, network connectivity" },
  { id: "furniture",   name: "Furniture",     desc: "Broken desks, chairs, tables, whiteboards, blinds" },
  { id: "cleaning",    name: "Cleaning",      desc: "Spills, waste disposal, sanitization, deep cleaning" },
  { id: "general",     name: "General",       desc: "General maintenance, structural items, painting" },
  { id: "other",       name: "Other",         desc: "General repairs, structural, doors, windows, unlisted" },
];
