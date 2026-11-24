import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EditorHeader } from "../../../components/stammdaten/EditorHeader";
import { StatusChip } from "../../../components/StatusChip";
import { ConfirmDialog } from "../../../components/stammdaten/ConfirmDialog";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { FormDialog } from "../../../components/stammdaten/FormDialog";
import { NoticeBanner } from "../../../components/stammdaten/NoticeBanner";
import { OptionSelect } from "../../../components/stammdaten/OptionSelect";
import { RowActionsMenu, type RowAction } from "../../../components/stammdaten/RowActionsMenu";
import { TextField } from "../../../components/stammdaten/TextField";
import { useTRPC } from "../../../src/lib/trpc";
import { useMasterDataActions } from "../../../src/hooks/useMasterDataActions";
import { formatIsoDate, getMasterDataErrorMessage } from "../../../src/lib/master-data-ui";
import { MASTER_DATA_HOLIDAY_SCOPE_NATIONAL, type MasterDataEntryWithUsage } from "@mgmt/shared";
import { colors } from "../../../src/theme/tokens";

const SCOPE_NATIONAL = MASTER_DATA_HOLIDAY_SCOPE_NATIONAL;
/** Site scope stores the location's stable `key` in the `scope` column. */
const SCOPE_SITE_PREFIX = "site:";

type ConfirmState = {
  entry: MasterDataEntryWithUsage;
  action: "deactivate" | "activate" | "remove";
} | null;

interface HolidayFormState {
  mode: "create" | "edit";
  entry: MasterDataEntryWithUsage | null;
}

/**
 * Feiertage-Editor (see /mockups/070-stammdaten/stammdaten-feiertage.html):
 * Jahr-Filter, Landes- und Standort-Scope, sortiert nach Datum. Scope ist
 * entweder landesweit für ein explizites Land oder für einen Standort.
 */
export default function FeiertageScreen() {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "holiday", includeInactive: true }),
  );
  const countriesQuery = useQuery(trpc.masterData.list.queryOptions({ category: "country" }));
  const locationsQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "location", includeInactive: true }),
  );

  const currentYear = String(new Date().getFullYear());
  const [yearFilter, setYearFilter] = useState<string>(currentYear);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");

  const [dialog, setDialog] = useState<HolidayFormState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [date, setDate] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scopeMode, setScopeMode] = useState<"national" | "site">("national");
  const [countryIso, setCountryIso] = useState<string>("DE");
  const [locationKey, setLocationKey] = useState<string>("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const countries = countriesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const countryOptions = [
    { value: "all", label: "Alle Länder" },
    ...countries.map((country) => ({
      value: country.countryIso ?? country.key,
      label: country.displayName,
    })),
  ];

  const entries = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const years = useMemo(() => {
    const fromEntries = entries
      .map((entry) => entry.date?.slice(0, 4) ?? "")
      .filter((y) => y !== "");
    return Array.from(new Set([currentYear, ...fromEntries])).sort((a, b) => a.localeCompare(b));
  }, [entries, currentYear]);

  const filtered = useMemo(
    () =>
      entries
        .filter((entry) => {
          const entryYear = entry.date?.slice(0, 4) ?? "";
          if (yearFilter !== "all" && entryYear !== yearFilter) return false;
          if (countryFilter !== "all" && (entry.countryIso ?? "") !== countryFilter) return false;
          if (scopeFilter === SCOPE_NATIONAL && entry.scope !== SCOPE_NATIONAL) return false;
          if (scopeFilter === "site" && entry.scope === SCOPE_NATIONAL) return false;
          return true;
        })
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [entries, yearFilter, countryFilter, scopeFilter],
  );

  const countryNameByIso = (iso: string | null | undefined): string =>
    countries.find((country) => country.countryIso === iso)?.displayName ?? iso ?? "—";

  /** Scope chip text, e.g. "Landesweit DE" / "Aschaffenburg" (mockup scope chips). */
  function scopeLabel(entry: MasterDataEntryWithUsage): string {
    if (entry.scope === SCOPE_NATIONAL) return `Landesweit ${entry.countryIso ?? ""}`.trim();
    if (entry.scope?.startsWith(SCOPE_SITE_PREFIX)) {
      const key = entry.scope.slice(SCOPE_SITE_PREFIX.length);
      return locations.find((location) => location.key === key)?.displayName ?? key;
    }
    // Legacy/fallback: the scope column holds the location key directly.
    return locations.find((location) => location.key === entry.scope)?.displayName ?? entry.scope ?? "—";
  }

  function openCreate() {
    setDate("");
    setDisplayName("");
    setScopeMode("national");
    setCountryIso(countries[0]?.countryIso ?? "DE");
    setLocationKey("");
    setDateError(null);
    setNameError(null);
    setScopeError(null);
    setFormError(null);
    setDialog({ mode: "create", entry: null });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setDate(entry.date ?? "");
    setDisplayName(entry.displayName);
    setScopeMode(entry.scope === SCOPE_NATIONAL ? "national" : "site");
    setCountryIso(entry.countryIso ?? countries[0]?.countryIso ?? "DE");
    setLocationKey(
      entry.scope === SCOPE_NATIONAL
        ? ""
        : entry.scope?.startsWith(SCOPE_SITE_PREFIX)
          ? entry.scope.slice(SCOPE_SITE_PREFIX.length)
          : (entry.scope ?? ""),
    );
    setDateError(null);
    setNameError(null);
    setScopeError(null);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    setDateError(null);
    setNameError(null);
    setScopeError(null);
    setFormError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setDateError("Bitte ein Datum im Format JJJJ-MM-TT angeben.");
      return;
    }
    if (!name) {
      setNameError("Bitte einen Namen angeben.");
      return;
    }
    let scopeValue: string | null;
    if (scopeMode === "national") {
      scopeValue = SCOPE_NATIONAL;
    } else if (locationKey) {
      scopeValue = `${SCOPE_SITE_PREFIX}${locationKey}`;
    } else {
      setScopeError("Bitte einen Standort wählen.");
      return;
    }
    try {
      if (dialog.mode === "create") {
        await actions.create.mutateAsync({
          category: "holiday",
          displayName: name,
          date: date.trim(),
          countryIso: countryIso,
          scope: scopeValue,
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry?.id ?? "",
          data: {
            displayName: name,
            date: date.trim(),
            countryIso: countryIso,
            scope: scopeValue,
          },
        });
      }
      setDialog(null);
      setYearFilter(date.trim().slice(0, 4));
    } catch (error) {
      setFormError(getMasterDataErrorMessage(error));
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { entry, action } = confirm;
    setConfirm(null);
    setBannerError(null);
    try {
      if (action === "deactivate") await actions.deactivate.mutateAsync(entry.id);
      if (action === "activate") await actions.activate.mutateAsync(entry.id);
      if (action === "remove") await actions.remove.mutateAsync(entry.id);
    } catch (error) {
      setBannerError(getMasterDataErrorMessage(error));
    }
  }

  function rowActions(entry: MasterDataEntryWithUsage): RowAction[] {
    return [
      { key: "edit", label: "Bearbeiten", onPress: () => openEdit(entry) },
      entry.isActive
        ? {
            key: "deactivate",
            label: "Deaktivieren",
            onPress: () => setConfirm({ entry, action: "deactivate" }),
          }
        : {
            key: "activate",
            label: "Aktivieren",
            onPress: () => setConfirm({ entry, action: "activate" }),
          },
      {
        key: "remove",
        label: "Löschen",
        destructive: true,
        onPress: () => setConfirm({ entry, action: "remove" }),
      },
    ];
  }

  const busy =
    actions.create.isPending ||
    actions.update.isPending ||
    actions.deactivate.isPending ||
    actions.activate.isPending ||
    actions.remove.isPending;

  const scopeFilterOptions = [
    { value: "all", label: "Alle Scopes" },
    { value: SCOPE_NATIONAL, label: "Landesweit" },
    { value: "site", label: "Einzelner Standort" },
  ];

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-4 pt-12 pb-2">
        <EditorHeader
          eyebrow="Stammdaten · Kalender"
          title="Feiertage"
          subtitle="Feiertage werden nach Jahr und Geltungsbereich gepflegt."
          createLabel="＋ Feiertag anlegen"
          onCreate={openCreate}
        />
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        {bannerError ? (
          <View className="rounded-mud px-3 py-2" style={{ backgroundColor: "#FDECEA" }}>
            <Text style={{ color: colors.error }}>{bannerError}</Text>
          </View>
        ) : null}

        {listQuery.isPending ? (
          <Text className="p-4 text-sm" style={{ color: colors.inkSecondary }}>
            Feiertage werden geladen…
          </Text>
        ) : listQuery.isError ? (
          <ErrorState
            message={getMasterDataErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : (
          <>
            <View
              className="rounded-mudlg border border-divider bg-surface p-3"
              testID="holiday-filters"
            >
              <View className="flex-row flex-wrap items-end" style={{ gap: 8 }}>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <OptionSelect
                    label="Jahr"
                    value={yearFilter}
                    onChange={setYearFilter}
                    options={years.map((y) => ({ value: y, label: y }))}
                    testID="filter-year"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <OptionSelect
                    label="Land"
                    value={countryFilter}
                    onChange={setCountryFilter}
                    options={countryOptions}
                    testID="filter-country"
                  />
                </View>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <View style={{ flex: 1, minWidth: 120 }}>
                  <OptionSelect
                    label="Geltungsbereich"
                    value={scopeFilter}
                    onChange={setScopeFilter}
                    options={scopeFilterOptions}
                    testID="filter-scope"
                  />
                </View>
                <StatusChip label={`${filtered.length} Einträge`} />
              </View>
            </View>

            {filtered.length === 0 ? (
              <EmptyState
                title={`Keine Feiertage für ${yearFilter}.`}
                description="Lege einen Feiertag an oder wähle ein anderes Jahr / Land."
                actionLabel="Feiertag anlegen"
                onPress={openCreate}
              />
            ) : (
              filtered.map((entry) => (
                <View
                  key={entry.id}
                  className="rounded-mudlg border border-divider p-3"
                  style={{ backgroundColor: entry.isActive ? colors.surface : "#FAFAFA" }}
                  testID={`entry-row-${entry.key}`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text
                        className="text-base font-semibold"
                        style={{ color: entry.isActive ? colors.ink : colors.inkSecondary }}
                      >
                        {entry.displayName}
                      </Text>
                      <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
                        {formatIsoDate(entry.date)} · {countryNameByIso(entry.countryIso)}
                      </Text>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <StatusChip
                        label={scopeLabel(entry)}
                        tone={entry.scope === SCOPE_NATIONAL ? "info" : "success"}
                      />
                      <StatusChip
                        label={entry.isActive ? "● Aktiv" : "○ Inaktiv"}
                        tone={entry.isActive ? "success" : "warning"}
                      />
                      <RowActionsMenu actions={rowActions(entry)} />
                    </View>
                  </View>
                </View>
              ))
            )}

            <Text className="px-1 text-xs" style={{ color: colors.inkSecondary }}>
              Sortiert nach Datum · Landesweite und Standort-Einträge · Bewegliche Feiertage
              jährlich prüfen
            </Text>
          </>
        )}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? "Feiertag bearbeiten" : "Feiertag anlegen"}
        subtitle="Wähle Datum, Name und Geltungsbereich."
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saveLabel="Feiertag speichern"
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        <TextField
          label="Datum"
          value={date}
          onChangeText={setDate}
          placeholder="JJJJ-MM-TT"
          error={dateError}
          autoCapitalize="none"
          testID="field-date"
        />
        <TextField
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="z. B. Neujahr"
          required
          error={nameError}
          testID="field-display-name"
        />
        <View>
          <Text className="text-xs font-semibold" style={{ color: colors.inkSecondary }}>
            Scope
          </Text>
          <View className="mt-1" style={{ gap: 6 }} testID="field-scope">
            <PressableRow
              selected={scopeMode === "national"}
              label="Landesweit für ein Land"
              onPress={() => setScopeMode("national")}
              testID="scope-national"
            />
            <PressableRow
              selected={scopeMode === "site"}
              label="Einzelner Standort"
              onPress={() => setScopeMode("site")}
              testID="scope-site"
            />
          </View>
        </View>
        {scopeMode === "national" ? (
          <OptionSelect
            label="Land"
            value={countryIso}
            onChange={setCountryIso}
            options={countries.map((country) => ({
              value: country.countryIso ?? country.key,
              label: country.displayName,
            }))}
            testID="field-country"
          />
        ) : (
          <OptionSelect
            label="Standort (nur bei Standort-Scope)"
            value={locationKey}
            onChange={setLocationKey}
            placeholder="Standort wählen"
            options={locations
              .filter((location) => location.isActive)
              .map((location) => ({ value: location.key, label: location.displayName }))}
            error={scopeError}
            testID="field-location"
          />
        )}
        <NoticeBanner>
          <Text style={{ fontWeight: "600" }}>Import-Hinweis:</Text> Feiertage werden durch den
          Seed für Länder/Jahre vorbefüllt. Prüfe bewegliche Feiertage jährlich; manuelle
          Ergänzungen bleiben möglich.
        </NoticeBanner>
      </FormDialog>

      {confirm ? (
        <ConfirmDialog
          visible
          title={
            confirm.action === "remove"
              ? `${confirm.entry.displayName} endgültig löschen?`
              : `${confirm.entry.displayName} ${confirm.action === "deactivate" ? "deaktivieren" : "aktivieren"}?`
          }
          message={
            confirm.action === "remove"
              ? "Der Feiertag wird endgültig aus dem Kalender entfernt."
              : confirm.action === "deactivate"
                ? "Der Feiertag wird ausgeblendet und kann später wieder aktiviert werden."
                : "Der Feiertag wird wieder im Kalender angezeigt."
          }
          confirmLabel={
            confirm.action === "remove"
              ? "Endgültig löschen"
              : confirm.action === "deactivate"
                ? "Deaktivieren"
                : "Aktivieren"
          }
          destructive={confirm.action === "remove"}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </ScrollView>
  );
}

function PressableRow({
  selected,
  label,
  onPress,
  testID,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="flex-row items-center rounded-mud border px-3 py-2"
      style={{
        borderColor: selected ? colors.primary.DEFAULT : colors.divider,
        backgroundColor: selected ? colors.primary.soft : colors.surface,
      }}
      testID={testID}
    >
      <Text style={{ color: colors.primary.DEFAULT, marginRight: 8 }}>
        {selected ? "◉" : "○"}
      </Text>
      <Text className="text-sm" style={{ color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
