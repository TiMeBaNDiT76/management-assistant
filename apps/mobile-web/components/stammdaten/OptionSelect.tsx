import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";

export interface SelectOption {
  value: string;
  label: string;
}

interface OptionSelectProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  caption?: string;
  error?: string | null;
  testID?: string;
}

/**
 * MudSelect-like single-select: a pressable field opening a modal option list.
 * Used for Land, Standort, Jahr, Geltungsbereich and Frequenz presets.
 */
export function OptionSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Bitte wählen",
  disabled = false,
  caption,
  error = null,
  testID = "option-select",
}: OptionSelectProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <View>
      <Text className="text-xs font-semibold" style={{ color: colors.inkSecondary }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className="mt-1 flex-row items-center justify-between rounded-mud border px-3 py-2"
        style={{
          borderColor: error ? colors.error : colors.divider,
          backgroundColor: disabled ? colors.canvas : colors.surface,
          opacity: disabled ? 0.6 : 1,
        }}
        testID={testID}
      >
        <Text
          className="text-sm"
          style={{ color: current ? colors.ink : colors.inkDisabled }}
          numberOfLines={1}
        >
          {current ? current.label : placeholder}
        </Text>
        <Text style={{ color: colors.inkSecondary }}>⌄</Text>
      </Pressable>
      {caption ? (
        <Text className="mt-1 text-xs" style={{ color: colors.inkSecondary }}>
          {caption}
        </Text>
      ) : null}
      {error ? (
        <Text className="mt-1 text-xs" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="rounded-mudlg bg-surface"
            style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}
            onPress={() => undefined}
          >
            <View className="border-b border-divider px-4 py-3">
              <Text className="text-sm font-semibold" style={{ color: colors.ink }}>
                {label}
              </Text>
            </View>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value || "__none__"}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between border-b border-divider px-4 py-3"
                  style={({ pressed }) => (pressed ? { backgroundColor: colors.primary.soft } : undefined)}
                  testID={`${testID}-option`}
                >
                  <Text
                    className="text-sm"
                    style={{
                      color: option.value === "" ? colors.inkSecondary : colors.ink,
                      fontWeight: selected ? "700" : "400",
                    }}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Text style={{ color: colors.primary.DEFAULT }}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
