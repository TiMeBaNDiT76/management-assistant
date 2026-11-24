import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface NavItem {
  /** German label, e.g. "Übersicht". */
  label: string;
  /** In-group route pushed on press, e.g. "/people". */
  route: string;
  icon: IconName;
}

/**
 * Desktop sidebar navigation (mockup: 240px drawer in
 * `/mockups/070-stammdaten/stammdaten-app.html`). The master-data area lives
 * under the "Administration" drawer label like in the mockup.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Übersicht", route: "/", icon: "grid-outline" },
  { label: "People", route: "/people", icon: "people-outline" },
  { label: "Gespräche", route: "/conversations", icon: "chatbubbles-outline" },
  { label: "Aufgaben", route: "/tasks", icon: "checkmark-done-outline" },
];

/** Administration section (below the drawer label in the mockup). */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Stammdaten", route: "/stammdaten", icon: "settings-outline" },
];

/**
 * True when the drawer entry should be highlighted for the current pathname.
 * Detail routes (e.g. `/stammdaten/rollen`, later `/people/[id]`) mark their
 * parent entry active.
 */
export function isNavActive(route: string, pathname: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** AppBar crumb for the active entry (mockup: "Administration / Stammdaten"). */
export function crumbForActiveItem(item: NavItem): string {
  return item.route === "/stammdaten"
    ? `Administration / ${item.label}`
    : item.label;
}
