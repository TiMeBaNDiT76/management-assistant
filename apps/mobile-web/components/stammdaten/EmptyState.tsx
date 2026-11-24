import { Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";
import { AppButton } from "./AppButton";

interface EmptyStateProps {
  /** e.g. "Noch keine Rollen angelegt." */
  title: string;
  description?: string;
  /** CTA label, e.g. "Erste Rolle anlegen". */
  actionLabel?: string;
  onPress?: () => void;
}

/** Empty list state with the mockup's "Ersten Eintrag anlegen" CTA. */
export function EmptyState({ title, description, actionLabel, onPress }: EmptyStateProps) {
  return (
    <View
      className="items-center rounded-mudlg border border-dashed border-divider bg-surface p-6"
      testID="empty-state"
    >
      <Text className="text-base font-semibold" style={{ color: colors.ink }}>
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 text-center text-sm" style={{ color: colors.inkSecondary }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onPress ? (
        <View className="mt-4">
          <AppButton label={actionLabel} onPress={onPress} />
        </View>
      ) : null}
    </View>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

/** Error state with retry — counters/tables never silently show 0 on failure. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View
      className="rounded-mudlg p-4"
      style={{ backgroundColor: "#FDECEA" }}
      testID="error-state"
    >
      <Text className="text-sm" style={{ color: colors.error }}>
        {message ?? "Stammdaten konnten nicht geladen werden."}
      </Text>
      <View className="mt-3">
        <AppButton label="Erneut versuchen" variant="ghost" onPress={onRetry} />
      </View>
    </View>
  );
}
