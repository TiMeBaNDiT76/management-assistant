import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusChip } from "../../components/StatusChip";
import { ResponsiveGrid } from "../../components/ResponsiveGrid";
import { ScreenContainer } from "../../components/ScreenContainer";
import { sampleConversations } from "../../src/fixtures/sample-data";
import { colors } from "../../src/theme/tokens";
import { isWideLayout } from "../../src/lib/responsive";

const TYPE_LABELS: Record<string, string> = {
  one_on_one: "1:1",
  feedback: "Feedback",
  career: "Karriere",
  adhoc: "Ad-hoc",
};

/**
 * Gesprächsliste (see /mockups/060-conversations/gespraechsliste.html).
 * Wide desktop windows (≥1050px) show the cards in two columns.
 * TODO(backend-wiring): replace fixtures with `trpc.conversations.list.useQuery({})`.
 */
export default function ConversationsScreen() {
  const { width } = useWindowDimensions();
  const columns = isWideLayout(width) ? 2 : 1;

  return (
    <View className="flex-1 bg-canvas">
      <ScreenContainer>
        <View className="px-6 pt-12 pb-2">
          <ScreenHeader title="Gespräche" subtitle="1:1s, Feedback- und Karrieregespräche." />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          <ResponsiveGrid
            items={sampleConversations}
            columns={columns}
            keyOf={(conversation) => conversation.id}
            gap={8}
            renderItem={(conversation) => (
              <View
                className="rounded-mudlg border border-divider bg-surface p-3"
                testID={`conversation-row-${conversation.id}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                    {conversation.employeeName}
                  </Text>
                  <StatusChip
                    label={TYPE_LABELS[conversation.type] ?? conversation.type}
                    tone="info"
                  />
                </View>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="text-sm" style={{ color: colors.inkSecondary }}>
                    {conversation.scheduledAt}
                  </Text>
                  <StatusChip
                    label={`Stimmung ${conversation.mood}/5`}
                    tone={conversation.mood >= 4 ? "success" : "warning"}
                  />
                </View>
              </View>
            )}
          />
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
