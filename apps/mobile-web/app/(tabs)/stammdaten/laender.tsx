import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { EditorHeader } from "../../../components/stammdaten/EditorHeader";
import { StatusChip } from "../../../components/StatusChip";
import { ConfirmDialog } from "../../../components/stammdaten/ConfirmDialog";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { FormDialog } from "../../../components/stammdaten/FormDialog";
import { NoticeBanner } from "../../../components/stammdaten/NoticeBanner";
import { RowActionsMenu, type RowAction } from "../../../components/stammdaten/RowActionsMenu";
import { TextField } from "../../../components/stammdaten/TextField";
import { useTRPC } from "../../../src/lib/trpc";
import { useMasterDataActions } from "../../../src/hooks/useMasterDataActions";
import { getMasterDataErrorMessage } from "../../../src/lib/master-data-ui";
import type { MasterDataEntryWithUsage } from "@mgmt/shared";
import { colors } from "../../../src/theme/tokens";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; entry: MasterDataEntryWithUsage }
  | null;

type ConfirmState = {
  entry: MasterDataEntryWithUsage;
  action: "deactivate" | "activate" | "remove";
} | null;

/**
 * Länder-Editor (see /mockups/070-stammdaten/stammdaten-land.html): ISO
 * 3166-1 Alpha-2 Ländercodes mit expliziter Standort-Abhängigkeitsanzeige.
 * Ein Land wird nie aus dem Namen eines Standorts abgeleitet.
 */
export default function LaenderScreen() {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "country", includeInactive: true }),
  );
  const locationsQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "location", includeInactive: true }),
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [displayName, setDisplayName] = useState("");
  const [countryIso, setCountryIso] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isoError, setIsoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const entries = listQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const activeCount = entries.filter((entry) => entry.isActive).length;

  const locationsByIso = (iso: string | null | undefined): MasterDataEntryWithUsage[] =>
    locations.filter((location) => location.countryIso === iso);

  function openCreate() {
    setDisplayName("");
    setCountryIso("");
    setNameError(null);
    setIsoError(null);
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setDisplayName(entry.displayName);
    setCountryIso(entry.countryIso ?? "");
    setNameError(null);
    setIsoError(null);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    const iso = countryIso.trim().toUpperCase();
    setNameError(null);
    setIsoError(null);
    setFormError(null);
    if (!name) {
      setNameError("Bitte einen Ländernamen angeben.");
      return;
    }
    if (!/^[A-Z]{2}$/.test(iso)) {
      setIsoError("Bitte einen zweistelligen ISO 3166-1 Alpha-2 Code angeben (z. B. DE).");
      return;
    }
    try {
      if (dialog.mode === "create") {
        await actions.create.mutateAsync({
          category: "country",
          displayName: name,
          countryIso: iso,
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry.id,
          data: { displayName: name, countryIso: iso },
        });
      }
      setDialog(null);
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

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-4 pt-12 pb-2">
        <EditorHeader
          eyebrow="Stammdaten · Organisation"
          title="Länder"
          subtitle="Länder ordnen Standorte zu und ermöglichen landesspezifische Kalender."
          countChip={`${activeCount} aktiv`}
          createLabel="＋ Land hinzufügen"
          onCreate={openCreate}
        />
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        <NoticeBanner>
          Ländercodes sind ISO 3166-1 Alpha-2. Ein Land wird nicht aus dem Namen eines Standorts
          abgeleitet; die Zuordnung ist ausdrücklich gepflegt.
        </NoticeBanner>

        {bannerError ? (
          <View className="rounded-mud px-3 py-2" style={{ backgroundColor: "#FDECEA" }}>
            <Text style={{ color: colors.error }}>{bannerError}</Text>
          </View>
        ) : null}

        {listQuery.isPending ? (
          <Text className="p-4 text-sm" style={{ color: colors.inkSecondary }}>
            Länder werden geladen…
          </Text>
        ) : listQuery.isError ? (
          <ErrorState
            message={getMasterDataErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Noch keine Länder angelegt."
            description="Lege das erste Land an — es kann anschließend Standorten und Feiertagen zugeordnet werden."
            actionLabel="Erstes Land anlegen"
            onPress={openCreate}
          />
        ) : (
          entries.map((entry) => {
            const countryLocations = locationsByIso(entry.countryIso);
            const activeLocations = countryLocations.filter((location) => location.isActive);
            return (
              <View
                key={entry.id}
                className="rounded-mudlg border border-divider p-3"
                style={{ backgroundColor: entry.isActive ? colors.surface : "#FAFAFA" }}
                testID={`entry-row-${entry.key}`}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center" style={{ gap: 10 }}>
                      <View
                        className="items-center justify-center"
                        style={{
                          width: 44,
                          height: 30,
                          borderRadius: 4,
                          backgroundColor: entry.isActive ? colors.primary.soft : "#F1F5F9",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: entry.isActive ? colors.primary.dark : colors.inkSecondary }}
                        >
                          {entry.countryIso ?? "—"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-base font-semibold"
                          style={{ color: entry.isActive ? colors.ink : colors.inkSecondary }}
                        >
                          {entry.displayName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: colors.inkSecondary, fontFamily: "monospace" }}
                        >
                          {entry.countryIso ?? "—"} · ISO 3166-1
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-2 text-xs" style={{ color: colors.inkSecondary }}>
                      {countryLocations.length} Standorte · {activeLocations.length} aktiv
                    </Text>
                    {countryLocations.length > 0 ? (
                      <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }} numberOfLines={2}>
                        {countryLocations.map((location) => location.displayName).join(" · ")}
                      </Text>
                    ) : (
                      <Text className="mt-0.5 text-xs" style={{ color: colors.inkDisabled }}>
                        Noch kein Standort zugeordnet
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <StatusChip
                      label={entry.isActive ? "● Aktiv" : "○ Inaktiv"}
                      tone={entry.isActive ? "success" : "warning"}
                    />
                    <RowActionsMenu actions={rowActions(entry)} />
                  </View>
                </View>
              </View>
            );
          })
        )}

        {entries.length > 0 ? (
          <Text className="px-1 text-xs" style={{ color: colors.inkSecondary }}>
            {entries.length} Einträge · {activeCount} aktiv · Standortzuordnung wird im
            Standorte-Editor gepflegt
          </Text>
        ) : null}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? "Land bearbeiten" : "Land hinzufügen"}
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        <TextField
          label="Ländername"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="z. B. Deutschland"
          required
          error={nameError}
          testID="field-display-name"
        />
        <TextField
          label="ISO-Code"
          value={countryIso}
          onChangeText={(value) => setCountryIso(value.toUpperCase())}
          placeholder="DE"
          caption="ISO 3166-1 Alpha-2, zweistellig (z. B. DE, AT, PL)."
          error={isoError}
          autoCapitalize="characters"
          testID="field-country-iso"
        />
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
              ? "Das Land wird endgültig entfernt. Zugeordnete Standorte behalten ihren ISO-Code."
              : confirm.action === "deactivate"
                ? "Das Land wird ausgeblendet und kann später wieder aktiviert werden."
                : "Das Land wird wieder angezeigt."
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
