import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { StatCard } from "../../components/StatCard";
import { useGreeting } from "../../src/hooks/useGreeting";
import { useAuth } from "../../src/auth/auth-context";
import { sampleActionItems } from "../../src/fixtures/sample-data";
import { colors } from "../../src/theme/tokens";
import { isWideLayout } from "../../src/lib/responsive";

/** Signed-in identity without real names in source: email local-part or a neutral fallback. */
export function displayNameForGreeting(email: string | null | undefined): string {
  const localPart = email?.split("@")[0]?.trim();
  return localPart ? localPart : "Admin";
}

/**
 * Dashboard — greeting and key numbers.
 * Wide desktop windows (≥1050px) show the KPI column and the AI briefing
 * side by side; below, everything stacks (see /mockups palette).
 * TODO(backend-wiring): replace fixture stats with `trpc.actionItems.list` etc.
 */
export default function DashboardScreen() {
  const greeting = useGreeting();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const wide = isWideLayout(width);
  const openTasks = sampleActionItems.filter((item) => item.status !== "done").length;

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 16,
          alignSelf: "center",
          width: "100%",
          maxWidth: 1100,
        }}
      >
        <View>
          <Text className="text-xs font-semibold uppercase" style={{ color: colors.inkSecondary }}>
            Mein Team
          </Text>
          <Text className="text-3xl font-bold" style={{ color: colors.ink }}>
            {greeting}, {displayNameForGreeting(user?.email)}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
            Deine Woche im Überblick.
          </Text>
        </View>

        <View
          style={wide ? { flexDirection: "row", gap: 16, alignItems: "flex-start" } : { gap: 16 }}
        >
          <View style={wide ? { flex: 1, gap: 12 } : { flexDirection: "row", gap: 12 }}>
            <StatCard value="3" label="Teammitglieder" />
            <StatCard value={String(openTasks)} label="Offene Aufgaben" />
            <StatCard value="2" label="1:1s diese Woche" />
          </View>

          <View
            className="rounded-mudlg border border-divider bg-surface p-4"
            style={wide ? { flex: 1 } : undefined}
          >
            <Text className="text-base font-semibold" style={{ color: colors.ink }}>
              KI-Briefing
            </Text>
            <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
              Bereitet dich automatisch auf jedes 1:1 vor — basierend auf früheren Notizen und
              offenen Aufgaben.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
