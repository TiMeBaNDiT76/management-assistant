import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../src/theme/tokens";
import { ADMIN_NAV_ITEMS, NAV_ITEMS, isNavActive, type NavItem } from "./nav-items";

interface DesktopDrawerProps {
  /** Current pathname (from expo-router's `usePathname`). */
  pathname: string;
}

function DrawerItem({ item, active, testID }: { item: NavItem; active: boolean; testID: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={() => router.push(item.route)}
      hitSlop={4}
      className="flex-row items-center rounded-mud"
      style={{
        height: 42,
        gap: 13,
        marginVertical: 3,
        paddingHorizontal: 14,
        backgroundColor: active ? colors.primary.soft : "transparent",
      }}
      testID={testID}
    >
      <Ionicons
        name={item.icon}
        size={17}
        color={active ? colors.primary.dark : colors.inkSecondary}
      />
      <Text
        className="text-sm"
        style={{
          color: active ? colors.primary.dark : colors.inkSecondary,
          fontWeight: active ? "600" : "500",
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

/**
 * Desktop sidebar drawer (mockup: 240px, right border, workspace label,
 * nav entries + "Administration" section). Detail routes keep their parent
 * entry highlighted via `isNavActive`.
 */
export function DesktopDrawer({ pathname }: DesktopDrawerProps) {
  const activeAdmin = ADMIN_NAV_ITEMS.find((item) => isNavActive(item.route, pathname));
  const activeItem = activeAdmin ?? NAV_ITEMS.find((item) => isNavActive(item.route, pathname));

  return (
    <View
      className="w-60 border-r border-divider bg-surface"
      style={{ paddingVertical: 24, paddingHorizontal: 12 }}
      testID="desktop-drawer"
    >
      <Text
        className="mb-2 px-3.5 text-xs font-bold uppercase"
        style={{ color: colors.inkDisabled, letterSpacing: 0.8 }}
      >
        Workspace
      </Text>
      {NAV_ITEMS.map((item) => (
        <DrawerItem
          key={item.route}
          item={item}
          active={activeItem?.route === item.route}
          testID={`drawer-item-${item.route}`}
        />
      ))}
      <Text
        className="mb-2 mt-6 px-3.5 text-xs font-bold uppercase"
        style={{ color: colors.inkDisabled, letterSpacing: 0.8 }}
      >
        Administration
      </Text>
      {ADMIN_NAV_ITEMS.map((item) => (
        <DrawerItem
          key={item.route}
          item={item}
          active={activeItem?.route === item.route}
          testID={`drawer-item-${item.route}`}
        />
      ))}
    </View>
  );
}
