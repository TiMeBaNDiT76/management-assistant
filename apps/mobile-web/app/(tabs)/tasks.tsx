import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusChip } from "../../components/StatusChip";
import { ResponsiveGrid } from "../../components/ResponsiveGrid";
import { ScreenContainer } from "../../components/ScreenContainer";
import { sampleActionItems } from "../../src/fixtures/sample-data";
import { colors } from "../../src/theme/tokens";
import { isWideLayout } from "../../src/lib/responsive";

const STATUS_TONES = {
  open: "warning",
  in_progress: "primary",
  done: "success",
  cancelled: "error",
} as const;

const STATUS_LABELS = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
  cancelled: "Abgebrochen",
} as const;

/**
 * Aufgabenliste (see /mockups/040-tasks/liste.html).
 * Wide desktop windows (≥1050px) show the cards in two columns.
 * TODO(backend-wiring): replace fixtures with `trpc.actionItems.list.useQuery({ openOnly: true })`.
 */
export default function TasksScreen() {
  const { width } = useWindowDimensions();
  const columns = isWideLayout(width) ? 2 : 1;

  return (
    <View className="flex-1 bg-canvas">
      <ScreenContainer>
        <View className="px-6 pt-12 pb-2">
          <ScreenHeader title="Aufgaben" subtitle="Wiedervorlagen aus deinen 1:1s." />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          <ResponsiveGrid
            items={sampleActionItems}
            columns={columns}
            keyOf={(item) => item.id}
            gap={8}
            renderItem={(item) => (
              <View
                className="rounded-mudlg border border-divider bg-surface p-3"
                testID={`task-row-${item.id}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-base font-semibold" style={{ color: colors.ink }}>
                    {item.title}
                  </Text>
                  <StatusChip
                    label={STATUS_LABELS[item.status]}
                    tone={STATUS_TONES[item.status]}
                  />
                </View>
                <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
                  fällig am {item.dueDate}
                </Text>
              </View>
            )}
          />
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
