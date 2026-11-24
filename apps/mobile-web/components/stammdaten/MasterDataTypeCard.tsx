import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StatusChip } from "../StatusChip";
import { useTRPC } from "../../src/lib/trpc";
import {
  type MasterDataCategoryMeta,
  getMasterDataErrorMessage,
} from "../../src/lib/master-data-ui";
import { colors } from "../../src/theme/tokens";

interface MasterDataTypeCardProps {
  meta: MasterDataCategoryMeta;
}

/**
 * Overview card for one master data type (see stammdaten-app.html). The card
 * carries its own list query to show the active/inactive counter; on errors
 * the counter is replaced by an error state with retry — never silently 0.
 */
export function MasterDataTypeCard({ meta }: MasterDataTypeCardProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: meta.category, includeInactive: true }),
  );

  const entries = listQuery.data ?? [];
  const activeCount = entries.filter((entry) => entry.isActive).length;
  const inactiveCount = entries.length - activeCount;

  let countChip: string;
  if (listQuery.isPending) {
    countChip = "Wird geladen…";
  } else if (listQuery.isError) {
    countChip = "Fehler";
  } else if (entries.length === 0) {
    countChip = "Noch leer";
  } else if (meta.category === "holiday") {
    // Feiertage are counted per year (mockup: "18 · 2026").
    const year = String(new Date().getFullYear());
    const inYear = entries.filter(
      (entry) => entry.isActive && (entry.date ?? "").startsWith(year),
    ).length;
    countChip = `${inYear} in ${year}`;
  } else if (inactiveCount === 0) {
    countChip = `${activeCount} aktiv`;
  } else {
    countChip = `${activeCount} aktiv · ${inactiveCount} inaktiv`;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(meta.editorRoute)}
      className="mb-3 rounded-mudlg border border-divider bg-surface p-4"
      testID={`stammdaten-card-${meta.category}`}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View
          className="items-center justify-center"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: colors.primary.soft,
          }}
        >
          <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary.dark} />
        </View>
        <StatusChip
          label={countChip}
          tone={listQuery.isError ? "error" : listQuery.isPending ? "warning" : "primary"}
        />
      </View>
      <Text className="text-lg font-bold" style={{ color: colors.ink }}>
        {meta.title}
      </Text>
      <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
        {meta.description}
      </Text>
      <View
        className="mt-3 flex-row items-center justify-between border-t border-divider pt-3"
      >
        {listQuery.isError ? (
          <Pressable onPress={() => listQuery.refetch()} testID={`stammdaten-card-retry-${meta.category}`}>
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>
              {getMasterDataErrorMessage(listQuery.error)} — Erneut versuchen
            </Text>
          </Pressable>
        ) : (
          <>
            <Text className="text-sm font-semibold" style={{ color: colors.primary.dark }}>
              {entries.length === 0 ? "Ersten Eintrag anlegen" : meta.manageLabel}
            </Text>
            <Text style={{ color: colors.primary.dark }}>→</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
