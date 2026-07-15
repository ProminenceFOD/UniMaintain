const fs = require('fs');

const importsToAdd = {
  "src/pages/admin/SiteSettingsPage.tsx": [
    'import { CheckCircle2, Edit2 } from "lucide-react";',
    'import { CATEGORIES_KEY, SETTINGS_KEY, DEFAULT_CATEGORIES } from "../../lib/constants";',
    'import type { CategoryItem } from "../../types";',
    'function loadCategories() { try { const c = localStorage.getItem(CATEGORIES_KEY); return c ? JSON.parse(c) : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; } }'
  ],
  "src/pages/auth/LoginScreen.tsx": [
    'import { Wrench, CheckCircle2 } from "lucide-react";',
    'import { Avatar } from "../../components/ui/Avatar";',
    'import { apiLogin, saveToken } from "../../lib/api";',
    'import { USERS } from "../../data/mockData";'
  ],
  "src/pages/auth/RegisterScreen.tsx": [
    'import { ArrowLeft, Wrench, Sparkles, CheckCircle2, Circle } from "lucide-react";',
    'import { apiRegister, saveToken } from "../../lib/api";'
  ],
  "src/pages/dashboards/AdminDashboard.tsx": [
    'import { StatCard } from "../../components/ui/StatCard";',
    'import { RequestTable } from "../../components/tables/RequestTable";',
    'import { FiltersBar } from "../../components/tables/FiltersBar";',
    'import { Pagination } from "../../components/tables/Pagination";',
    'import { InviteUserModal } from "../../components/admin/InviteUserModal";',
    'import { EditUserModal } from "../../components/admin/EditUserModal";',
    'import { ResetPasswordModal } from "../../components/admin/ResetPasswordModal";',
    'import { Avatar } from "../../components/ui/Avatar";',
    'import { getGreeting, exportCSV, formatDate } from "../../lib/utils";',
    'import { CheckCircle2, Users, Activity } from "lucide-react";',
    'import { Tooltip } from "recharts";'
  ],
  "src/pages/dashboards/OfficerDashboard.tsx": [
    'import { StatCard } from "../../components/ui/StatCard";',
    'import { StatusBadge } from "../../components/ui/StatusBadge";',
    'import { CategoryTag } from "../../components/ui/CategoryTag";',
    'import { OfficerTaskTable } from "../../components/tables/OfficerTaskTable";',
    'import { getGreeting, formatDate } from "../../lib/utils";',
    'import { CheckCircle2, CheckCheck } from "lucide-react";'
  ],
  "src/pages/dashboards/StudentDashboard.tsx": [
    'import { StatCard } from "../../components/ui/StatCard";',
    'import { StatusBadge } from "../../components/ui/StatusBadge";',
    'import { CategoryTag } from "../../components/ui/CategoryTag";',
    'import { PriorityLabel } from "../../components/ui/PriorityLabel";',
    'import { Avatar } from "../../components/ui/Avatar";',
    'import { FiltersBar } from "../../components/tables/FiltersBar";',
    'import { Pagination } from "../../components/tables/Pagination";',
    'import { getGreeting, formatDate } from "../../lib/utils";',
    'import { CheckCircle2 } from "lucide-react";'
  ],
  "src/pages/ProfilePage.tsx": [
    'import { CheckCircle2 } from "lucide-react";',
    'import { formatDate } from "../lib/utils";'
  ]
};

for (const [file, lines] of Object.entries(importsToAdd)) {
  let content = fs.readFileSync(file, 'utf8');
  content = lines.join('\n') + '\n\n' + content;
  // some files had CheckCircle2 missing but it was imported as CheckCircle? Just adding it should fix unless it's not exported.
  // Actually, lucide-react 0.487.0 probably removed CheckCircle2. Let's replace CheckCircle2 with CheckCircle just in case.
  content = content.replace(/CheckCircle2/g, 'CheckCircle');
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
