import { Switch, Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";

interface SwitchFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  caption?: string;
  disabled?: boolean;
  testID?: string;
}

/** Labeled switch (Aktiv / isDone toggles in the editors). */
export function SwitchField({
  label,
  value,
  onValueChange,
  caption,
  disabled = false,
  testID = "switch-field",
}: SwitchFieldProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm" style={{ color: colors.ink }}>
          {label}
        </Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: "#CBD5E1", true: colors.success }}
          thumbColor="#FFFFFF"
          testID={testID}
        />
      </View>
      {caption ? (
        <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
