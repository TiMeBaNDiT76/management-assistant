import { FlatList, Text, View } from "react-native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusChip } from "../../components/StatusChip";
import { sampleConversations } from "../../src/fixtures/sample-data";
import { colors } from "../../src/theme/tokens";

const TYPE_LABELS: Record<string, string> = {
  one_on_one: "1:1",
  feedback: "Feedback",
  career: "Karriere",
  adhoc: "Ad-hoc",
};

/**
 * Gesprächsliste (see /mockups/060-conversations/gespraechsliste.html).
 * TODO(backend-wiring): replace fixtures with `trpc.conversations.list.useQuery({})`.
 */
export default function ConversationsScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <View className="px-6 pt-12 pb-2">
        <ScreenHeader title="Gespräche" subtitle="1:1s, Feedback- und Karrieregespräche." />
      </View>
      <FlatList
        data={sampleConversations}
        keyExtractor={(conversation) => conversation.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) => (
          <View
            className="rounded-mudlg border border-divider bg-surface p-3"
            testID={`conversation-row-${item.id}`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                {item.employeeName}
              </Text>
              <StatusChip label={TYPE_LABELS[item.type] ?? item.type} tone="info" />
            </View>
            <View className="mt-1 flex-row items-center gap-2">
              <Text className="text-sm" style={{ color: colors.inkSecondary }}>
                {item.scheduledAt}
              </Text>
              <StatusChip label={`Stimmung ${item.mood}/5`} tone={item.mood >= 4 ? "success" : "warning"} />
            </View>
          </View>
        )}
      />
    </View>
  );
}
