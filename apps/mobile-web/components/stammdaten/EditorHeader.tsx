import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";
import { StatusChip } from "../StatusChip";

interface EditorHeaderProps {
  /** e.g. "Stammdaten · People" */
  eyebrow?: string;
  title: string;
  subtitle: string;
  /** e.g. "5 aktiv · 1 inaktiv" */
  countChip?: string;
  /** e.g. "＋ Rolle anlegen" */
  createLabel?: string;
  onCreate?: () => void;
  /** e.g. "Bearbeiten" — primary action of a detail page. */
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
}

/** Editor page header with back navigation, matching the mockup page-head. */
export function EditorHeader({
  eyebrow,
  title,
  subtitle,
  countChip,
  createLabel,
  onCreate,
  actionLabel,
  onAction,
  actionTestID = "editor-action",
}: EditorHeaderProps) {
  const router = useRouter();
  return (
    <View className="px-6 pb-4 pt-12">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zurück"
        onPress={() => router.back()}
        hitSlop={10}
        className="mb-2 self-start"
        testID="editor-back"
      >
        <Ionicons name="chevron-back" size={22} color={colors.primary.DEFAULT} />
      </Pressable>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text className="text-xs font-semibold uppercase" style={{ color: colors.primary.DEFAULT }}>
              {eyebrow}
            </Text>
          ) : null}
          <Text className="text-3xl font-bold" style={{ color: colors.ink }}>
            {title}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
            {subtitle}
          </Text>
        </View>
        <View className="items-end" style={{ gap: 8 }}>
          {countChip ? <StatusChip label={countChip} /> : null}
          {actionLabel && onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAction}
              className="rounded-mud px-3.5 py-2"
              style={{ backgroundColor: colors.primary.DEFAULT }}
              testID={actionTestID}
            >
              <Text className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
          {createLabel && onCreate ? (
            <Pressable
              accessibilityRole="button"
              onPress={onCreate}
              className="rounded-mud px-3.5 py-2"
              style={{ backgroundColor: colors.primary.DEFAULT }}
              testID="editor-create"
            >
              <Text className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
                {createLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
