import { Pressable, View } from "react-native";
import { colors } from "../../src/theme/tokens";
import { isHexColor } from "../../src/lib/master-data-ui";
import { TextField } from "./TextField";

/** Suggested kanban/badge colors from the mockup (stammdaten-taskstatus.html). */
export const PRESET_COLORS = [
  "#94A3B8",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#22C55E",
  "#EF4444",
  "#0F766E",
  "#4F46E5",
] as const;

interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  testID?: string;
}

/**
 * Hex color input with live swatch preview and preset palette — the mockup's
 * "Farbe · Live-Vorschau" field.
 */
export function ColorField({ value, onChange, error = null, testID = "color-field" }: ColorFieldProps) {
  const previewValid = isHexColor(value);
  return (
    <View>
      <TextField
        label="Farbe · Live-Vorschau"
        value={value}
        onChangeText={onChange}
        placeholder="#22C55E"
        autoCapitalize="none"
        error={error}
        testID={testID}
      />
      <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "rgba(15, 23, 42, 0.07)",
            backgroundColor: previewValid ? value.trim() : colors.canvas,
          }}
          testID={`${testID}-swatch`}
        />
        {PRESET_COLORS.map((preset) => (
          <Pressable
            key={preset}
            accessibilityLabel={`Farbe ${preset} übernehmen`}
            onPress={() => onChange(preset)}
            hitSlop={6}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: value.trim().toLowerCase() === preset.toLowerCase() ? 2 : 0,
              borderColor: colors.primary.DEFAULT,
              backgroundColor: preset,
            }}
            testID={`${testID}-preset-${preset}`}
          />
        ))}
      </View>
    </View>
  );
}
