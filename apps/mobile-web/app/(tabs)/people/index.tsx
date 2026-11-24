import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Employee } from "@mgmt/shared";
import { EmployeeRow } from "../../../components/EmployeeRow";
import { PersonFormDialog } from "../../../components/people/PersonFormDialog";
import { ScreenHeader } from "../../../components/ScreenHeader";
import { StatusChip } from "../../../components/StatusChip";
import { AppButton } from "../../../components/stammdaten/AppButton";
import { ConfirmDialog } from "../../../components/stammdaten/ConfirmDialog";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { OptionSelect } from "../../../components/stammdaten/OptionSelect";
import { RowActionsMenu } from "../../../components/stammdaten/RowActionsMenu";
import { TextField } from "../../../components/stammdaten/TextField";
import { useEmployeeActions } from "../../../src/hooks/useEmployeeActions";
import { useTRPC } from "../../../src/lib/trpc";
import {
  NO_SELECTION,
  PEOPLE_MAX_ROWS,
  PEOPLE_PAGE_SIZE,
  formatPersonRange,
  getEmployeeErrorMessage,
  pageWindow,
  resolveMasterDataLabel,
  toSelectOptions,
} from "../../../src/lib/people-ui";
import { colors } from "../../../src/theme/tokens";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; employee: Employee }
  | null;

interface PageButtonProps {
  label: string;
  current?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
}

/** Page stepper of the mockup pagination ("‹ 1 2 3 ›"). */
function PageButton({ label, current = false, disabled = false, onPress, testID }: PageButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="h-8 w-8 items-center justify-center rounded-mud border"
      style={{
        borderColor: current ? colors.primary.DEFAULT : colors.divider,
        backgroundColor: current ? colors.primary.DEFAULT : colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
      testID={testID}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: current ? "#FFFFFF" : colors.inkSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Mitarbeiter-Liste (see /mockups/050-people/mitarbeiter-liste.html):
 * Suche (Server-Suche über Name/E-Mail), kombinierbare Filter für Abteilung
 * und Einsatzstandort, Seitensteuerung mit fünf Einträgen je Seite sowie
 * Leer-, Ladefehler- und Mutationsfehlerzustände.
 */
export default function PeopleScreen() {
  const trpc = useTRPC();
  const router = useRouter();
  const actions = useEmployeeActions();

  const [search, setSearch] = useState("");
  const [departmentKey, setDepartmentKey] = useState<string>(NO_SELECTION);
  const [locationKey, setLocationKey] = useState<string>(NO_SELECTION);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<Employee | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const employeesQuery = useQuery(
    trpc.employees.list.queryOptions({
      search: search.trim() || undefined,
      limit: PEOPLE_MAX_ROWS,
    }),
  );
  const rolesQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "role", includeInactive: true }),
  );
  const departmentsQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "department", includeInactive: true }),
  );
  const locationsQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "location", includeInactive: true }),
  );

  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const roles = rolesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const filtered = useMemo(
    () =>
      employees.filter(
        (employee) =>
          (!departmentKey || employee.department === departmentKey) &&
          (!locationKey || employee.location === locationKey),
      ),
    [employees, departmentKey, locationKey],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PEOPLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PEOPLE_PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PEOPLE_PAGE_SIZE);
  const pages = pageWindow(currentPage, totalPages);

  // Any search/filter change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, departmentKey, locationKey]);

  function openCreate() {
    setDialog({ mode: "create" });
  }

  function openEdit(employee: Employee) {
    setDialog({ mode: "edit", employee });
  }

  function resetFilters() {
    setSearch("");
    setDepartmentKey(NO_SELECTION);
    setLocationKey(NO_SELECTION);
  }

  async function handleDelete() {
    if (!confirm) return;
    const target = confirm;
    setConfirm(null);
    setBannerError(null);
    try {
      await actions.remove.mutateAsync(target.id);
    } catch (error) {
      setBannerError(getEmployeeErrorMessage(error));
    }
  }

  function rowActions(employee: Employee) {
    return [
      { key: "open", label: "Profil öffnen", onPress: () => router.push(`/people/${employee.id}`) },
      { key: "edit", label: "Bearbeiten", onPress: () => openEdit(employee) },
      { key: "delete", label: "Löschen", destructive: true, onPress: () => setConfirm(employee) },
    ];
  }

  const filtersActive = search.trim() !== "" || departmentKey !== NO_SELECTION || locationKey !== NO_SELECTION;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-4 pt-12 pb-2">
        <Text
          className="text-xs font-semibold uppercase"
          style={{ color: colors.primary.DEFAULT }}
        >
          People · Mitarbeiter
        </Text>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <ScreenHeader
              title="Mitarbeiter"
              subtitle="Mitarbeiterstamm und aktueller Einsatz auf einen Blick."
            />
          </View>
          <View className="items-end" style={{ gap: 8 }}>
            {employeesQuery.isPending ? null : (
              <StatusChip label={`${employees.length} Mitarbeiter`} />
            )}
            <AppButton label="＋ Mitarbeiter anlegen" onPress={openCreate} />
          </View>
        </View>
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        <View
          className="rounded-mudlg border border-divider bg-surface p-4"
          style={{ gap: 12 }}
          testID="people-filters"
        >
          <TextField
            label="Suche"
            value={search}
            onChangeText={setSearch}
            placeholder="Name oder E-Mail suchen"
            testID="people-search"
          />
          <OptionSelect
            label="Abteilung"
            value={departmentKey}
            options={toSelectOptions(departments, {
              activeOnly: true,
              emptyLabel: "Alle Abteilungen",
            })}
            onChange={setDepartmentKey}
            testID="filter-department"
          />
          <OptionSelect
            label="Einsatzstandort"
            value={locationKey}
            options={toSelectOptions(locations, {
              activeOnly: true,
              emptyLabel: "Alle Standorte",
            })}
            onChange={setLocationKey}
            testID="filter-location"
          />
          <AppButton
            label="Filter zurücksetzen"
            variant="outlined"
            onPress={resetFilters}
            disabled={!filtersActive}
          />
        </View>

        {bannerError ? (
          <View className="rounded-mud px-3 py-2" style={{ backgroundColor: "#FDECEA" }}>
            <Text style={{ color: colors.error }}>{bannerError}</Text>
          </View>
        ) : null}

        <View className="overflow-hidden rounded-mudlg border border-divider bg-surface" testID="people-table">
          <View className="flex-row items-center justify-between border-b border-divider px-4 py-3">
            <Text className="text-sm font-semibold" style={{ color: colors.ink }}>
              Alle Mitarbeiter
            </Text>
            <Text className="text-xs" style={{ color: colors.inkSecondary }}>
              Sortiert nach Name ↑
            </Text>
          </View>

          {employeesQuery.isPending ? (
            <Text className="px-4 py-4 text-sm" style={{ color: colors.inkSecondary }}>
              Mitarbeiter werden geladen…
            </Text>
          ) : employeesQuery.isError ? (
            <View className="p-4">
              <ErrorState
                message="Mitarbeiter konnten nicht geladen werden."
                onRetry={() => employeesQuery.refetch()}
              />
            </View>
          ) : employees.length === 0 ? (
            <View className="p-4">
              <EmptyState
                title="Noch keine Mitarbeiter angelegt."
                description="Lege die erste Person an — sie erscheint sofort in dieser Liste."
                actionLabel="Ersten Mitarbeiter anlegen"
                onPress={openCreate}
              />
            </View>
          ) : filtered.length === 0 ? (
            <View className="p-4">
              <EmptyState
                title="Keine Treffer."
                description="Keine Mitarbeiter entsprechen den gewählten Such- und Filterkriterien. Filter zurücksetzen oder Suche anpassen."
                actionLabel="Filter zurücksetzen"
                onPress={resetFilters}
              />
            </View>
          ) : (
            pageRows.map((employee, rowIndex) => {
              const location = locations.find((entry) => entry.key === employee.location);
              return (
                <View
                  key={employee.id}
                  className={rowIndex < pageRows.length - 1 ? "border-b border-divider" : undefined}
                >
                  <EmployeeRow
                    embedded
                    employee={{
                      id: employee.id,
                      firstName: employee.firstName,
                      lastName: employee.lastName,
                      email: employee.email ?? undefined,
                      role: resolveMasterDataLabel(roles, employee.role) ?? undefined,
                      department:
                        resolveMasterDataLabel(departments, employee.department) ?? undefined,
                      location: resolveMasterDataLabel(locations, employee.location) ?? undefined,
                    }}
                    locationColor={location?.colorHex ?? undefined}
                    onPress={() => router.push(`/people/${employee.id}`)}
                    actions={
                      <RowActionsMenu
                        actions={rowActions(employee)}
                        testID={`person-actions-${employee.id}`}
                      />
                    }
                  />
                </View>
              );
            })
          )}

          {filtered.length > 0 ? (
            <View
              className="flex-row items-center justify-between px-4 py-3"
              testID="people-pagination"
            >
              <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                {formatPersonRange(startIndex + 1, startIndex + pageRows.length, filtered.length)}
              </Text>
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <PageButton
                  label="‹"
                  testID="page-prev"
                  disabled={currentPage <= 1}
                  onPress={() => setPage(currentPage - 1)}
                />
                {pages.map((entry, index) =>
                  entry === "…" ? (
                    <Text
                      key={`gap-${index}`}
                      className="text-xs"
                      style={{ color: colors.inkSecondary }}
                    >
                      …
                    </Text>
                  ) : (
                    <PageButton
                      key={entry}
                      label={String(entry)}
                      current={entry === currentPage}
                      testID={`page-${entry}`}
                      onPress={() => setPage(entry)}
                    />
                  ),
                )}
                <PageButton
                  label="›"
                  testID="page-next"
                  disabled={currentPage >= totalPages}
                  onPress={() => setPage(currentPage + 1)}
                />
              </View>
            </View>
          ) : null}
        </View>

        {employees.length >= PEOPLE_MAX_ROWS ? (
          <Text className="px-1 text-xs" style={{ color: colors.inkSecondary }}>
            Es werden bis zu {PEOPLE_MAX_ROWS} Personen angezeigt.
          </Text>
        ) : null}
      </View>

      <PersonFormDialog
        visible={dialog !== null}
        employee={dialog?.mode === "edit" ? dialog.employee : null}
        onClose={() => setDialog(null)}
      />

      {confirm ? (
        <ConfirmDialog
          visible
          title={`${confirm.firstName} ${confirm.lastName} löschen?`}
          message="Die Person wird endgültig entfernt. Zugehörige Gespräche, Beziehungen und Aufgaben werden mitgelöscht."
          confirmLabel="Endgültig löschen"
          destructive
          busy={actions.remove.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </ScrollView>
  );
}
