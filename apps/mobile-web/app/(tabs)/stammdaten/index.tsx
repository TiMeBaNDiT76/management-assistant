import { Text, View } from "react-native";
import { ScreenHeader } from "../../../components/ScreenHeader";
import { colors } from "../../../src/theme/tokens";
import { StatusChip } from "../../../components/StatusChip";
import { MasterDataTypeCard } from "../../../components/stammdaten/MasterDataTypeCard";
import {
  MASTER_DATA_CATEGORY_META,
  MASTER_DATA_CATEGORY_ORDER,
} from "../../../src/lib/master-data-ui";

/**
 * Stammdaten-Übersicht (see /mockups/070-stammdaten/stammdaten-app.html):
 * one card per data type, each with a live counter of its active entries.
 */
export default function StammdatenScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <View className="px-6 pt-12 pb-2">
        <View className="flex-row items-start justify-between">
          <ScreenHeader
            title="Stammdaten"
            subtitle="Gemeinsam genutzte Werte an einem Ort verwalten."
          />
          <StatusChip label="8 Datentypen" />
        </View>
        <Text className="mb-2 text-sm" style={{ color: colors.inkSecondary }}>
          Wähle einen Datentyp zum Bearbeiten. Deaktivierte Einträge bleiben für vorhandene
          Datensätze erhalten und können bei neuen Zuordnungen ausgeblendet werden.
        </Text>
      </View>
      <View className="flex-1 px-4 pb-6" testID="stammdaten-cards">
        {MASTER_DATA_CATEGORY_ORDER.map((category) => (
          <MasterDataTypeCard
            key={category}
            meta={MASTER_DATA_CATEGORY_META[category]}
          />
        ))}
      </View>
    </View>
  );
}

