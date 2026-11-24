import { Modal, Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";
import { AppButton } from "./AppButton";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  /** Extra context line, e.g. "Bestehende Zuordnungen bleiben erhalten." */
  hint?: string | null;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** MudDialog-like confirmation for Deaktivieren / Aktivieren / Löschen. */
export function ConfirmDialog({
  visible,
  title,
  message,
  hint = null,
  confirmLabel,
  cancelLabel = "Abbrechen",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          className="rounded-mudlg bg-surface p-4"
          style={{ width: "100%", maxWidth: 480 }}
          testID="confirm-dialog"
        >
          <Text className="text-lg font-bold" style={{ color: colors.ink }}>
            {title}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: colors.ink }}>
            {message}
          </Text>
          {hint ? (
            <Text className="mt-1 text-xs" style={{ color: colors.inkSecondary }}>
              {hint}
            </Text>
          ) : null}
          <View className="mt-4 flex-row justify-end" style={{ gap: 8 }}>
            <AppButton label={cancelLabel} variant="outlined" onPress={onCancel} disabled={busy} />
            <AppButton
              label={confirmLabel}
              variant={destructive ? "danger" : "primary"}
              onPress={onConfirm}
              busy={busy}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
