import type { ReactNode } from "react";
import { Children } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";
import { useIsDesktop } from "../../src/hooks/useIsDesktop";
import { AppButton } from "./AppButton";

interface FormDialogProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave: () => void;
  /** e.g. "Änderungen speichern" / "Feiertag speichern" */
  saveLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  /** Inline German validation / API error shown above the actions. */
  error?: string | null;
  children: ReactNode;
}

/**
 * Responsive form row inside dialogs (mockup `stammdaten-rollen.html`
 * `.form-grid`: multiple columns on desktop, stacked below the breakpoint).
 * Short fields (name + color etc.) sit side by side on desktop; children
 * stack full-width on phones.
 */
export function FormRow({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  return (
    <View
      style={{ flexDirection: isDesktop ? "row" : "column", gap: 14 }}
      testID="form-row"
    >
      {Children.map(children, (child) => (
        <View style={isDesktop ? { flex: 1 } : undefined}>{child}</View>
      ))}
    </View>
  );
}

/**
 * MudDialog-like create/edit modal for the Stammdaten editors. Errors are
 * rendered inline (red banner) so entered values are preserved — see the
 * 409-hint in the mockups.
 */
export function FormDialog({
  visible,
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel = "Änderungen speichern",
  cancelLabel = "Abbrechen",
  saving = false,
  error = null,
  children,
}: FormDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          className="rounded-mudlg bg-surface"
          style={{ width: "100%", maxWidth: 640, maxHeight: "90%" }}
          testID="form-dialog"
        >
          <View
            className="flex-row items-start justify-between border-b border-divider px-4 pb-3 pt-4"
          >
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold" style={{ color: colors.ink }}>
                {title}
              </Text>
              {subtitle ? (
                <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dialog schließen"
              onPress={onClose}
              hitSlop={12}
              testID="form-dialog-close"
            >
              <Text className="text-xl" style={{ color: colors.inkSecondary }}>
                ×
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="px-4 py-4" contentContainerStyle={{ gap: 14 }}>
            {children}
            {error ? (
              <View
                className="rounded-mud px-3 py-2"
                style={{ backgroundColor: "#FDECEA" }}
                testID="form-dialog-error"
              >
                <Text className="text-sm" style={{ color: colors.error }}>
                  {error}
                </Text>
              </View>
            ) : null}
            <View className="flex-row justify-end" style={{ gap: 8 }}>
              <AppButton label={cancelLabel} variant="outlined" onPress={onClose} disabled={saving} />
              <AppButton label={saveLabel} onPress={onSave} busy={saving} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
