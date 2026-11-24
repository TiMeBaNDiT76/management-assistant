import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../src/theme/tokens";

type AppButtonVariant = "primary" | "outlined" | "danger" | "ghost";

const STYLES = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  primary: { backgroundColor: colors.primary.DEFAULT },
  outlined: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
  danger: { backgroundColor: "#FDECEA" },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: "600" },
  labelPrimary: { color: "#FFFFFF" },
  labelOutlined: { color: colors.ink },
  labelDanger: { color: colors.error },
  labelGhost: { color: colors.primary.DEFAULT },
});

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  /** Shows a spinner and blocks interaction. */
  busy?: boolean;
}

/** MudBlazor-like button used across the Stammdaten editors. */
export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
}: AppButtonProps) {
  const inactive = disabled || busy;
  const textColor =
    variant === "primary"
      ? STYLES.labelPrimary
      : variant === "outlined"
        ? STYLES.labelOutlined
        : variant === "danger"
          ? STYLES.labelDanger
          : STYLES.labelGhost;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        STYLES.base,
        STYLES[variant],
        inactive ? STYLES.disabled : undefined,
        pressed && !inactive ? { opacity: 0.85 } : undefined,
      ]}
      testID={`button-${variant}`}
    >
      {busy ? <ActivityIndicator size="small" color={textColor.color} /> : null}
      <Text style={[STYLES.label, textColor]}>{label}</Text>
    </Pressable>
  );
}
