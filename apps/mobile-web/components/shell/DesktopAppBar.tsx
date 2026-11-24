import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface DesktopAppBarProps {
  crumb?: string;
  onSignOut: () => void;
}

/**
 * Desktop app bar (mockup `_palette.css`: 64px, primary background, brand
 * mark "M" + title + breadcrumb, sign-out on the right).
 */
export function DesktopAppBar({ crumb, onSignOut }: DesktopAppBarProps) {
  return (
    <View
      className="h-16 flex-row items-center bg-primary"
      style={{ gap: 18, paddingHorizontal: 24 }}
      testID="desktop-appbar"
    >
      <View
        className="items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: "rgba(255, 255, 255, 0.15)",
        }}
      >
        <Text className="text-lg font-extrabold text-white">M</Text>
      </View>
      <Text className="text-lg font-semibold text-white">ManagementBuddy</Text>
      {crumb ? (
        <Text
          className="text-sm"
          style={{
            color: "#DBEAFE",
            borderLeftWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.33)",
            paddingLeft: 18,
          }}
        >
          {crumb}
        </Text>
      ) : null}
      <View style={{ flex: 1 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abmelden"
        onPress={onSignOut}
        hitSlop={8}
        className="flex-row items-center"
        style={{ gap: 8 }}
        testID="desktop-signout"
      >
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text className="text-sm font-semibold text-white">Abmelden</Text>
      </Pressable>
    </View>
  );
}
