import {
  Building2Icon,
  LayoutDashboardIcon,
  NetworkIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react";

import { PERMISSIONS, type Permission } from "@/constants/permissions";

/**
 * Sidebar navigation.
 *
 * Explicit configuration rather than something derived from a resource
 * registry. Navigation order, grouping and labels are editorial decisions that
 * rarely match the order modules happen to be defined in, and a registry would
 * make "why is this link here?" a question you answer by tracing imports.
 *
 * Items whose `permission` the user lacks are filtered out — a link that leads
 * to a forbidden page is worse than no link.
 */
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Matches nested routes too, e.g. `/providers/123/edit`. */
  matchNested?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    title: "Directory",
    items: [
      {
        title: "Providers",
        href: "/providers",
        icon: StethoscopeIcon,
        permission: PERMISSIONS.provider.view,
        matchNested: true,
      },
      {
        title: "Facilities",
        href: "/facilities",
        icon: Building2Icon,
        permission: PERMISSIONS.facility.view,
        matchNested: true,
      },
      {
        title: "Departments",
        href: "/departments",
        icon: NetworkIcon,
        permission: PERMISSIONS.department.view,
        matchNested: true,
      },
    ],
  },
];

/** True when `href` should be highlighted for the current pathname. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.matchNested) return pathname === item.href || pathname.startsWith(`${item.href}/`);

  return pathname === item.href;
}
