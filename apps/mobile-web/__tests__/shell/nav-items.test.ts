import { describe, expect, it } from "@jest/globals";
import {
  ADMIN_NAV_ITEMS,
  NAV_ITEMS,
  crumbForActiveItem,
  isNavActive,
  type NavItem,
} from "../../components/shell/nav-items";

describe("isNavActive", () => {
  it("matches the root route exactly (no prefix match)", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/", "/people")).toBe(false);
  });

  it("keeps the parent entry active for detail routes", () => {
    expect(isNavActive("/stammdaten", "/stammdaten")).toBe(true);
    expect(isNavActive("/stammdaten", "/stammdaten/rollen")).toBe(true);
    expect(isNavActive("/people", "/people/42")).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(isNavActive("/people", "/stammdaten/rollen")).toBe(false);
    expect(isNavActive("/tasks", "/tasksx")).toBe(false);
  });
});

describe("crumbForActiveItem", () => {
  it("prefixes the administration section for Stammdaten", () => {
    const stammdaten: NavItem = ADMIN_NAV_ITEMS[0];
    expect(stammdaten.route).toBe("/stammdaten");
    expect(crumbForActiveItem(stammdaten)).toBe("Administration / Stammdaten");
  });

  it("uses the plain label for workspace entries", () => {
    const label = crumbForActiveItem({
      label: "People",
      route: "/people",
      icon: "people-outline",
    });
    expect(label).toBe("People");
  });
});

describe("navigation entries (mockup drawer)", () => {
  it("exposes the 4 workspace entries plus the Administration section", () => {
    expect(NAV_ITEMS.map((item) => item.route)).toEqual([
      "/",
      "/people",
      "/conversations",
      "/tasks",
    ]);
    expect(ADMIN_NAV_ITEMS.map((item) => item.route)).toEqual(["/stammdaten"]);
  });
});
