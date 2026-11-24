import { View, Text } from "react-native";
import { colors } from "../src/theme/tokens";

export type ChipTone = "primary" | "success" | "warning" | "error" | "info";

const TONE_STYLES: Record<ChipTone, { bg: string; text: string }> = {
  primary: { bg: colors.primary.soft, text: colors.primary.DEFAULT },
  success: { bg: "#E8F5E9", text: colors.success },
  warning: { bg: "#FFF4D6", text: "#8A5B00" },
  error: { bg: "#FDECEA", text: colors.error },
  info: { bg: "#E1F5FE", text: colors.info },
};

interface StatusChipProps {
  label: string;
  tone?: ChipTone;
  /** Master-data color (`#RRGGBB`) overriding the tone — e.g. Einsatzstandorte. */
  color?: string;
}

/** Small pill label used for statuses, moods and locations. */
export function StatusChip({ label, tone = "primary", color }: StatusChipProps) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{
        backgroundColor: color ? `${color}1F` : toneStyle.bg,
        borderWidth: color ? 1 : 0,
        borderColor: color ? `${color}59` : undefined,
      }}
      accessibilityRole="text"
    >
      <Text className="text-xs font-semibold" style={{ color: color ?? toneStyle.text }}>
        {label}
      </Text>
    </View>
  );
}
