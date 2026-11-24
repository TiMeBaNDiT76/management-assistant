import { Text, View } from "react-native";
import { initialsForName } from "../src/lib/initials";
import { colors } from "../src/theme/tokens";
import { StatusChip } from "./StatusChip";

export interface EmployeeRowData {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  location?: string;
}

interface EmployeeRowProps {
  employee: EmployeeRowData;
}

/** List row for the employee directory (see /mockups/050-people/mitarbeiter-liste.html). */
export function EmployeeRow({ employee }: EmployeeRowProps) {
  const fullName = `${employee.firstName} ${employee.lastName}`;
  return (
    <View
      className="flex-row items-center gap-3 rounded-mudlg border border-divider bg-surface p-3"
      testID={`employee-row-${employee.id}`}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary.soft }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: colors.primary.dark }}
        >
          {initialsForName(employee.firstName, employee.lastName)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold" style={{ color: colors.ink }}>
          {fullName}
        </Text>
        {employee.role ? (
          <Text className="text-sm" style={{ color: colors.inkSecondary }}>
            {employee.role}
          </Text>
        ) : null}
      </View>
      {employee.location ? (
        <StatusChip label={employee.location} tone="primary" />
      ) : null}
    </View>
  );
}
