import { Text, View } from "react-native";
import { colors } from "../src/theme/tokens";

interface StatCardProps {
  value: string;
  label: string;
}

/** Compact KPI card for the dashboard (see /mockups mockup palette). */
export function StatCard({ value, label }: StatCardProps) {
  return (
    <View
      className="flex-1 rounded-mudlg border border-divider bg-surface p-4"
      testID="stat-card"
    >
      <Text className="text-2xl font-bold" style={{ color: colors.primary.DEFAULT }}>
        {value}
      </Text>
      <Text className="text-xs" style={{ color: colors.inkSecondary }}>
        {label}
      </Text>
    </View>
  );
}
