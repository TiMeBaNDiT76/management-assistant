import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { colors } from "../../src/theme/tokens";

export interface RowAction {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Shown instead of executing when disabled (e.g. delete with usageCount > 0). */
  hint?: string;
}

interface RowActionsMenuProps {
  actions: RowAction[];
  testID?: string;
}

/** The mockup's "•••" row menu (Bearbeiten / Deaktivieren / Aktivieren / Löschen). */
export function RowActionsMenu({ actions, testID = "row-actions" }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aktionen"
        onPress={() => setOpen(true)}
        hitSlop={8}
        testID={testID}
      >
        <Text className="text-base" style={{ color: colors.inkSecondary }}>
          •••
        </Text>
      </Pressable>
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
            style={{ width: "100%", maxWidth: 380, alignSelf: "center" }}
            onPress={() => undefined}
          >
            {actions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                disabled={action.disabled}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                className="border-b border-divider px-4 py-3"
                style={({ pressed }) =>
                  pressed && !action.disabled ? { backgroundColor: colors.primary.soft } : undefined
                }
                testID={`${testID}-${action.key}`}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: action.disabled
                      ? colors.inkDisabled
                      : action.destructive
                        ? colors.error
                        : colors.ink,
                  }}
                >
                  {action.label}
                </Text>
                {action.hint ? (
                  <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
                    {action.hint}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
