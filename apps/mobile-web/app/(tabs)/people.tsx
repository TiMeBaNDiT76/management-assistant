import { FlatList, View } from "react-native";
import { EmployeeRow } from "../../components/EmployeeRow";
import { ScreenHeader } from "../../components/ScreenHeader";
import { sampleEmployees } from "../../src/fixtures/sample-data";

/**
 * Mitarbeiter-Liste (see /mockups/050-people/mitarbeiter-liste.html).
 * TODO(backend-wiring): replace fixtures with `trpc.employees.list.useQuery({})`.
 */
export default function PeopleScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <View className="px-6 pt-12 pb-2">
        <ScreenHeader
          title="Menschen"
          subtitle="Dein Team und deine Stakeholder."
        />
      </View>
      <FlatList
        data={sampleEmployees}
        keyExtractor={(employee) => employee.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) => <EmployeeRow employee={item} />}
      />
    </View>
  );
}
