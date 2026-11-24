import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { initialsForName } from "../src/lib/initials";
import { colors } from "../src/theme/tokens";
import { StatusChip } from "./StatusChip";

export interface EmployeeRowData {
  id: string;
  firstName: string;
  lastName: string;
  /** E-mail as stored (mockup column "Mitarbeiter"). */
  email?: string;
  role?: string;
  /** Already resolved to a display name (master-data key → displayName). */
  department?: string;
  location?: string;
}

interface EmployeeRowProps {
  employee: EmployeeRowData;
  /** Opens the person detail page. */
  onPress?: () => void;
  /** Trailing controls, e.g. the mockup's "•••" row menu. */
  actions?: ReactNode;
  /** Render flush inside a table card (no own border/background). */
  embedded?: boolean;
  /** Master-data color of the location chip (`#RRGGBB`). */
  locationColor?: string;
}

/**
 * List row for the employee directory (see /mockups/050-people/mitarbeiter-liste.html):
 * avatar with initials, name + e-mail, role/department and the deployment
 * location chip.
 */
export function EmployeeRow({
  employee,
  onPress,
  actions,
  embedded = false,
  locationColor,
}: EmployeeRowProps) {
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const containerClass = embedded
    ? "flex-row items-center gap-3 px-4 py-3"
    : "flex-row items-center gap-3 rounded-mudlg border border-divider bg-surface p-3";

  const content = (
    <>
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary.soft }}
      >
        <Text className="text-sm font-bold" style={{ color: colors.primary.dark }}>
          {initialsForName(employee.firstName, employee.lastName)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold" style={{ color: colors.ink }}>
          {fullName}
        </Text>
        {employee.email ? (
          <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
            {employee.email}
          </Text>
        ) : null}
        {employee.role ? (
          <Text className="mt-1 text-sm" style={{ color: colors.ink }}>
            {employee.role}
          </Text>
        ) : null}
        {employee.department ? (
          <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
            {employee.department}
          </Text>
        ) : null}
      </View>
      {employee.location || actions ? (
        <View className="flex-row items-center gap-2">
          {employee.location ? (
            <StatusChip label={employee.location} color={locationColor} />
          ) : null}
          {actions}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${fullName} öffnen`}
        onPress={onPress}
        className={containerClass}
        testID={`employee-row-${employee.id}`}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className={containerClass} testID={`employee-row-${employee.id}`}>
      {content}
    </View>
  );
}
