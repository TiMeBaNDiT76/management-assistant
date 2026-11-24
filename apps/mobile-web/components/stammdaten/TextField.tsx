import { Text, TextInput, View } from "react-native";
import { colors } from "../../src/theme/tokens";

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Hint below the input (mockup captions like "Pflichtfeld"). */
  caption?: string;
  error?: string | null;
  multiline?: boolean;
  required?: boolean;
  /** Read-only display for immutable values (e.g. the location key after creation). */
  locked?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  testID?: string;
}

/** Labeled text input matching the mockup field style. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  caption,
  error = null,
  multiline = false,
  required = false,
  locked = false,
  autoCapitalize = "none",
  testID = "text-field",
}: TextFieldProps) {
  return (
    <View>
      <Text className="text-xs font-semibold" style={{ color: colors.inkSecondary }}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        className="mt-1 rounded-mud border px-3 py-2 text-sm"
        style={{
          borderColor: error ? colors.error : colors.divider,
          backgroundColor: locked ? colors.canvas : colors.surface,
          color: locked ? colors.inkSecondary : colors.ink,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkDisabled}
        multiline={multiline}
        numberOfLines={multiline ? 3 : undefined}
        editable={!locked}
        autoCapitalize={autoCapitalize}
        testID={testID}
      />
      {caption ? (
        <Text className="mt-1 text-xs" style={{ color: colors.inkSecondary }}>
          {caption}
        </Text>
      ) : null}
      {error ? (
        <Text className="mt-1 text-xs" style={{ color: colors.error }} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
