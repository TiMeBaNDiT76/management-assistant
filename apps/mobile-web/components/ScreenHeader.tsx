import { Text, View } from "react-native";
import { colors } from "../src/theme/tokens";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

/** Shared page header (eyebrow style like the mockups). */
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View className="mb-4">
      <Text className="text-3xl font-bold" style={{ color: colors.ink }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
