const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const icons = [
  "Bell", "Search", "LogOut", "Plus", "Download", "X", "Zap", "Wifi", "Menu", "UserPlus", "EyeOff", "ArrowLeft",
  "Droplets", "Package", "Wrench", "Wind", "CheckCircle", "CheckCircle2", "Clock",
  "AlertTriangle", "AlertCircle", "Users", "BarChart2", "Eye",
  "Home", "FileText", "Shield", "MapPin", "Paperclip", "ChevronDown",
  "ChevronLeft", "ChevronRight", "UserCheck", "ArrowUpRight",
  "Send", "Building2", "Edit2", "CheckCheck", "Circle", "Filter", "Check", "Copy",
  "RefreshCw", "Layers", "ClipboardList", "TrendingUp", "Printer", "Code", "Settings",
  "MessageSquare", "ImageIcon", "Calendar", "Activity", "Sparkles", "Key", "Sun", "Moon", "Trash2", "Edit", "Hash", "PieChart"
];

const utils = ["initials", "formatDate", "formatDateTime", "generateId", "exportCSV", "getGreeting"];
const api = ["apiLogin", "apiRegister", "apiGetMe", "apiGetRequests", "apiGetRequest", "apiCreateRequest", "apiUpdateStatus", "apiAssignOfficer", "apiGetStats", "apiGetUsers", "apiGetOfficers", "apiToggleUser", "apiGetNotifications", "apiMarkRead", "apiMarkAllRead", "saveToken", "clearToken"];
const mockData = ["USERS", "INITIAL_REQUESTS", "INITIAL_NOTIFICATIONS"];
const constants = ["STATUS_CONFIG", "PRIORITY_CONFIG", "CATEGORY_CONFIG", "DEFAULT_CATEGORIES", "CATEGORIES_KEY", "SETTINGS_KEY"];

const types = ["Role", "Status", "Priority", "Category", "User", "AuditEntry", "Request", "Notification", "Comment", "CategoryItem"];
const components = ["Avatar", "StatCard", "StatusBadge", "CategoryTag", "PriorityLabel", "Spinner", "RequestTable", "Pagination", "FiltersBar", "OfficerTaskTable", "CalendarPopover", "MonthPicker", "RequestDetail", "NewRequestModal", "CancelConfirmModal", "FeedbackModal", "EditUserModal", "InviteUserModal", "ResetPasswordModal"];
const reactDayPicker = ["DayPicker", "DateRange"];

const files = walk('src');

files.forEach(file => {
  if (file === 'src/app/App.tsx' || file === 'src/main.tsx') return; // Skip entry points
  let content = fs.readFileSync(file, 'utf8');

  // calculate relative path to src
  const depth = file.split('/').length - 2;
  const relSrc = depth === 0 ? './' : '../'.repeat(depth);

  const neededIcons = icons.filter(i => new RegExp(`\\b${i}\\b`).test(content));
  const neededUtils = utils.filter(i => new RegExp(`\\b${i}\\b`).test(content));
  const neededApi = api.filter(i => new RegExp(`\\b${i}\\b`).test(content));
  const neededData = mockData.filter(i => new RegExp(`\\b${i}\\b`).test(content));
  const neededConsts = constants.filter(i => new RegExp(`\\b${i}\\b`).test(content));
  const neededTypes = types.filter(i => new RegExp(`\\b${i}\\b`).test(content));
  const neededDayPicker = reactDayPicker.filter(i => new RegExp(`\\b${i}\\b`).test(content));

  let importsToAdd = [];

  if (neededIcons.length > 0 && !content.includes('from "lucide-react"')) {
    importsToAdd.push(`import { ${neededIcons.join(', ')} } from "lucide-react";`);
  } else if (neededIcons.length > 0) {
    // Just blindly add them if some are missing, maybe duplicate but it's okay, esbuild handles duplicates fine or TS throws duplicate identifier, so better to be safe
    // Actually TS throws duplicate identifier. We should parse existing imports or just add a separate import block? TS allows multiple imports from same module!
    importsToAdd.push(`import { ${neededIcons.join(', ')} } from "lucide-react";`);
  }

  if (neededUtils.length > 0) importsToAdd.push(`import { ${neededUtils.join(', ')} } from "${relSrc}lib/utils";`);
  if (neededApi.length > 0) importsToAdd.push(`import { ${neededApi.join(', ')} } from "${relSrc}lib/api";`);
  if (neededData.length > 0) importsToAdd.push(`import { ${neededData.join(', ')} } from "${relSrc}data/mockData";`);
  if (neededConsts.length > 0) importsToAdd.push(`import { ${neededConsts.join(', ')} } from "${relSrc}lib/constants";`);
  if (neededTypes.length > 0) importsToAdd.push(`import type { ${neededTypes.join(', ')} } from "${relSrc}types";`);
  if (neededDayPicker.length > 0) {
      importsToAdd.push(`import { ${neededDayPicker.join(', ')} } from "react-day-picker";`);
  }

  // Component imports
  components.forEach(comp => {
    if (new RegExp(`\\b${comp}\\b`).test(content) && !content.includes(`import { ${comp} }`) && !file.includes(comp)) {
        // Find where comp is located
        const compPath = files.find(f => f.endsWith(`/${comp}.tsx`));
        if (compPath) {
            // compPath is like src/components/ui/Avatar.tsx
            const relComp = relSrc + compPath.replace('src/', '').replace('.tsx', '');
            importsToAdd.push(`import { ${comp} } from "${relComp}";`);
        }
    }
  });

  if (content.includes('loadSiteSettings')) {
      importsToAdd.push(`function loadSiteSettings() {
  try {
    const s = localStorage.getItem("SETTINGS_KEY");
    return s ? JSON.parse(s) : { allowSignups: true, emailNotifs: false, institution: "MIVA Open University", supportEmail: "maintenance@university.edu" };
  } catch { return { allowSignups: true, emailNotifs: false, institution: "MIVA Open University", supportEmail: "maintenance@university.edu" }; }
}`);
  }

  if (importsToAdd.length > 0) {
    content = importsToAdd.join('\n') + '\n\n' + content;
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log("Auto-import completed.");
