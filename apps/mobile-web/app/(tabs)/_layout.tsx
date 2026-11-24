import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/auth-context";
import { useIsDesktop } from "../../src/hooks/useIsDesktop";
import { DesktopAppBar } from "../../components/shell/DesktopAppBar";
import { DesktopDrawer } from "../../components/shell/DesktopDrawer";
import { NAV_ITEMS, ADMIN_NAV_ITEMS, isNavActive, crumbForActiveItem } from "../../components/shell/nav-items";
import { colors } from "../../src/theme/tokens";

/**
 * App shell for the (tabs) area. Protected: signed-out visitors are
 * redirected to the login screen.
 *
 * Responsive (mockup `/mockups/070-stammdaten/_palette.css`):
 * - <760px: bottom tab bar (unchanged mobile behavior).
 * - ≥760px: desktop shell — AppBar (64px) plus a fixed 240px sidebar drawer
 *   with the navigation; the bottom tab bar is hidden. The Tabs navigator
 *   stays mounted so nested/detail routes keep working (deep links, static
 *   export routes).
 */
export default function TabsLayout() {
  const { status, signOut } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (status === "signedOut") {
      router.replace("/(auth)/login");
    }
  }, [status, router]);

  if (status !== "signedIn") {
    // Redirect in progress or session still loading.
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.canvas,
        }}
        testID="tabs-guard"
      >
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  const activeItem =
    [...NAV_ITEMS, ...ADMIN_NAV_ITEMS].find((item) => isNavActive(item.route, pathname)) ??
    null;

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.inkSecondary,
        // Desktop shell: navigation moves into the sidebar drawer.
        tabBarStyle: isDesktop ? { display: "none" } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Übersicht",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "Menschen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: "Gespräche",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Aufgaben",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="stammdaten/index"
        options={{
          title: "Stammdaten",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={String(color)} />
          ),
        }}
      />
      {/* Category editors render inside the shell but are not tab buttons. */}
      <Tabs.Screen name="stammdaten/rollen" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/abteilungen" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/beziehungstypen" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/terminarten" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/task-status" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/standorte" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/feiertage" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/laender" options={{ href: null }} />
    </Tabs>
  );

  if (!isDesktop) {
    return tabs;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary.DEFAULT }} testID="desktop-shell">
      <DesktopAppBar
        crumb={activeItem ? crumbForActiveItem(activeItem) : undefined}
        onSignOut={() => {
          void signOut();
        }}
      />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "stretch" }}>
        <DesktopDrawer pathname={pathname} />
        <View style={{ flex: 1 }}>{tabs}</View>
      </View>
    </View>
  );
}
