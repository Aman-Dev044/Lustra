import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Box,
  BrainCircuit,
  CalendarDays,
  Clock,
  Crown,
  FileText,
  FolderOpen,
  Gauge,
  KanbanSquare,
  Megaphone,
  MessagesSquare,
  Plug,
  Receipt,
  Route,
  ScanSearch,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Ticket,
  Users,
  UserRound,
  Workflow,
  Wrench,
  ClipboardList,
} from "lucide-react";
import type { Feature } from "@/lib/plans";

export interface AppNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  feature?: Feature;
  addOn?: "visualizer";
  managerOnly?: boolean;
}

export const appNav: { group: string; items: AppNavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/app", icon: Gauge },
      { label: "AI Insights", href: "/app/insights", icon: BrainCircuit, feature: "ai_insights", managerOnly: true },
      { label: "Live Board", href: "/app/board", icon: KanbanSquare },
      { label: "Calendar", href: "/app/calendar", icon: CalendarDays },
      { label: "Routes", href: "/app/routes", icon: Route },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Jobs", href: "/app/jobs", icon: Wrench },
      { label: "Quotes", href: "/app/quotes", icon: FileText },
      { label: "Invoices", href: "/app/invoices", icon: Receipt },
      { label: "Customers", href: "/app/customers", icon: UserRound },
      { label: "Lead Forms", href: "/app/forms", icon: ClipboardList, feature: "lead_forms", managerOnly: true },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Inspections", href: "/app/inspections", icon: ScanSearch },
      { label: "Certificates", href: "/app/certificates", icon: ShieldCheck },
      { label: "Documents", href: "/app/documents", icon: FolderOpen, feature: "documents" },
      { label: "Inventory", href: "/app/inventory", icon: Boxes },
      { label: "Marketplace", href: "/app/marketplace", icon: ShoppingCart, feature: "marketplace", managerOnly: true },
      { label: "3D Visualizer", href: "/app/visualizer", icon: Box, addOn: "visualizer" },
    ],
  },
  {
    group: "Growth",
    items: [
      { label: "Messages", href: "/app/messages", icon: MessagesSquare },
      { label: "Campaigns", href: "/app/campaigns", icon: Megaphone, feature: "campaigns", managerOnly: true },
      { label: "Reviews", href: "/app/reviews", icon: Star, feature: "reviews" },
      { label: "Promotions", href: "/app/promotions", icon: Ticket, managerOnly: true },
      { label: "Automations", href: "/app/automations", icon: Workflow, feature: "automations", managerOnly: true },
      { label: "Memberships", href: "/app/memberships", icon: Crown, feature: "memberships" },
    ],
  },
  {
    group: "Team & Admin",
    items: [
      { label: "Team", href: "/app/team", icon: Users, managerOnly: true },
      { label: "Time Clock", href: "/app/time", icon: Clock },
      { label: "Analytics", href: "/app/analytics", icon: BarChart3, managerOnly: true },
      { label: "Integrations", href: "/app/integrations", icon: Plug, managerOnly: true },
      { label: "Settings", href: "/app/settings", icon: Settings, managerOnly: true },
    ],
  },
];
