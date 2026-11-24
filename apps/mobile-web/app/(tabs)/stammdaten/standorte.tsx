import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { EditorHeader } from "../../../components/stammdaten/EditorHeader";
import { StatusChip } from "../../../components/StatusChip";
import { ColorField } from "../../../components/stammdaten/ColorField";
import { ConfirmDialog } from "../../../components/stammdaten/ConfirmDialog";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { FormDialog, FormRow } from "../../../components/stammdaten/FormDialog";
import { NoticeBanner } from "../../../components/stammdaten/NoticeBanner";
import { OptionSelect } from "../../../components/stammdaten/OptionSelect";
import { RowActionsMenu, type RowAction } from "../../../components/stammdaten/RowActionsMenu";
import { SwitchField } from "../../../components/stammdaten/SwitchField";
import { TextField } from "../../../components/stammdaten/TextField";
import { useTRPC } from "../../../src/lib/trpc";
import { useMasterDataActions } from "../../../src/hooks/useMasterDataActions";
import {
  formatUsageCount,
  getMasterDataErrorMessage,
  isHexColor,
} from "../../../src/lib/master-data-ui";
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

/** Options value for "kein Land zugeordnet" (explicitly unassigned, mockup: "— nicht zugeordnet —"). */
const NO_COUNTRY = "";

/**
 * Standorte-Editor (see /mockups/070-stammdaten/stammdaten-standorte.html):
 * unveränderlicher Schlüssel, Anzeigename, explizite Land-Auswahl, Farbe mit
 * Live-Preview und Aktivstatus. Das Land wird nie aus dem Namen abgeleitet.
 */
export default function StandorteScreen() {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "location", includeInactive: true }),
  );
  const countriesQuery = useQuery(trpc.masterData.list.queryOptions({ category: "country" }));

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [countryIso, setCountryIso] = useState<string>(NO_COUNTRY);
  const [colorHex, setColorHex] = useState("#3B82F6");
  const [isActive, setIsActive] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const entries = listQuery.data ?? [];
  const activeCount = entries.filter((entry) => entry.isActive).length;
  const inactiveCount = entries.length - activeCount;

  const countries = countriesQuery.data ?? [];
  const countryOptions = [
    { value: NO_COUNTRY, label: "— nicht zugeordnet —" },
    ...countries.map((country) => ({
      value: country.countryIso ?? country.key,
      label: `${country.displayName} · ${country.countryIso ?? country.key.toUpperCase()}`,
    })),
  ];

  function resolveCountryLabel(entry: MasterDataEntryWithUsage): string {
    if (!entry.countryIso) return "— nicht zugeordnet —";
    const country = countries.find((c) => c.countryIso === entry.countryIso);
    return country ? `${country.displayName} · ${country.countryIso}` : entry.countryIso;
  }

  function openCreate() {
    setKey("");
    setDisplayName("");
    setCountryIso(NO_COUNTRY);
    setColorHex("#3B82F6");
    setIsActive(true);
    setNameError(null);
    setKeyError(null);
    setColorError(null);
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setKey(entry.key);
    setDisplayName(entry.displayName);
    setCountryIso(entry.countryIso ?? NO_COUNTRY);
    setColorHex(entry.colorHex ?? "#3B82F6");
    setIsActive(entry.isActive);
    setNameError(null);
    setKeyError(null);
    setColorError(null);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    setNameError(null);
    setKeyError(null);
    setColorError(null);
    setFormError(null);
    if (!name) {
      setNameError("Bitte einen Anzeigenamen angeben.");
      return;
    }
    if (!isHexColor(colorHex)) {
      setColorError("Ungültige Farbe — bitte als #RRGGBB angeben.");
      return;
    }
    const keyValue = key.trim().toLowerCase();
    if (dialog.mode === "create" && keyValue !== "" && !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(keyValue)) {
      setKeyError("Der Schlüssel darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.");
      return;
    }
    const countryValue = countryIso === NO_COUNTRY ? null : countryIso;
    try {
      if (dialog.mode === "create") {
        await actions.create.mutateAsync({
          category: "location",
          displayName: name,
          key: keyValue === "" ? undefined : keyValue,
          countryIso: countryValue,
          colorHex: colorHex.trim(),
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry.id,
          data: {
            displayName: name,
            countryIso: countryValue,
            colorHex: colorHex.trim(),
          },
        });
        if (isActive !== dialog.entry.isActive) {
          await (isActive ? actions.activate : actions.deactivate).mutateAsync(dialog.entry.id);
        }
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
        disabled: entry.usageCount > 0,
        hint:
          entry.usageCount > 0
            ? `Wird von ${entry.usageCount} Personen verwendet — bitte stattdessen deaktivieren.`
            : undefined,
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
          title="Standorte"
          subtitle="Standort-Schlüssel sind stabil; Anzeigename, Land, Farbe und Aktivstatus können angepasst werden."
          countChip={`${activeCount} aktiv · ${inactiveCount} inaktiv`}
          createLabel="＋ Standort anlegen"
          onCreate={openCreate}
        />
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        <NoticeBanner>
          <Text style={{ fontWeight: "600" }}>Nur deaktivieren, nicht löschen.</Text> Einträge mit
          bestehenden People-Zuordnungen behalten ihren Schlüssel. Das Land wird ausdrücklich
          gewählt und nicht aus dem Standortnamen abgeleitet.
        </NoticeBanner>

        {bannerError ? (
          <View className="rounded-mud px-3 py-2" style={{ backgroundColor: "#FDECEA" }}>
            <Text style={{ color: colors.error }}>{bannerError}</Text>
          </View>
        ) : null}

        {listQuery.isPending ? (
          <Text className="p-4 text-sm" style={{ color: colors.inkSecondary }}>
            Standorte werden geladen…
          </Text>
        ) : listQuery.isError ? (
          <ErrorState
            message={getMasterDataErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Noch keine Standorte angelegt."
            description="Lege den ersten Standort an — er steht danach in People-Profilen zur Auswahl."
            actionLabel="Ersten Standort anlegen"
            onPress={openCreate}
          />
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              className="rounded-mudlg border border-divider p-3"
              style={{ backgroundColor: entry.isActive ? colors.surface : "#FAFAFA" }}
              testID={`entry-row-${entry.key}`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 1,
                        borderColor: "rgba(15, 23, 42, 0.1)",
                        backgroundColor: entry.colorHex ?? colors.inkDisabled,
                      }}
                    />
                    <Text
                      className="text-base font-semibold"
                      style={{ color: entry.isActive ? colors.ink : colors.inkSecondary }}
                    >
                      {entry.displayName}
                    </Text>
                  </View>
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: colors.inkSecondary, fontFamily: "monospace" }}
                  >
                    {entry.key}
                  </Text>
                  <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
                    Land: {resolveCountryLabel(entry)} ·{" "}
                    {entry.isActive
                      ? `Verwendet von ${formatUsageCount(entry.usageCount, { singular: "Person", plural: "Personen" })}`
                      : `${entry.usageCount} bestehende Zuordnung${entry.usageCount === 1 ? "" : "en"}`}
                  </Text>
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
          ))
        )}

        {entries.length > 0 ? (
          <Text className="px-1 text-xs" style={{ color: colors.inkSecondary }}>
            {entries.length} Einträge · Schlüssel unveränderlich · Inaktive bleiben im Editor
            sichtbar
          </Text>
        ) : null}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? "Standort bearbeiten" : "Standort anlegen"}
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        {dialog?.mode === "create" ? (
          <TextField
            label="Schlüssel"
            value={key}
            onChangeText={setKey}
            placeholder="leer lassen = automatisch aus dem Namen"
            caption="Nach dem Anlegen unveränderlich. Kleinbuchstaben, Ziffern und Bindestriche."
            error={keyError}
            autoCapitalize="none"
            testID="field-key"
          />
        ) : (
          <TextField
            label="Schlüssel"
            value={key}
            onChangeText={() => undefined}
            caption="Nach dem Anlegen unveränderlich."
            locked
            testID="field-key"
          />
        )}
        <FormRow>
          <TextField
            label="Anzeigename"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="z. B. Berlin"
            required
            error={nameError}
            testID="field-display-name"
          />
          <OptionSelect
            label="Land"
            value={countryIso}
            onChange={setCountryIso}
            options={countryOptions}
            caption="Ausdrücklich wählen — wird nicht aus dem Namen abgeleitet."
            testID="field-country"
          />
        </FormRow>
        <ColorField value={colorHex} onChange={setColorHex} error={colorError} testID="field-color" />
        {dialog?.mode === "edit" ? (
          <SwitchField
            label="Aktiv"
            value={isActive}
            onValueChange={setIsActive}
            caption="Inaktivieren statt löschen — bestehende Zuordnungen bleiben erhalten."
            testID="field-is-active"
          />
        ) : (
          <Text className="text-xs" style={{ color: colors.inkSecondary }}>
            Neue Einträge sind sofort aktiv.
          </Text>
        )}
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
              ? "Der Standort wird endgültig entfernt. Dies ist nur möglich, solange keine Personen ihn verwenden."
              : confirm.action === "deactivate"
                ? "Bestehende Zuordnungen bleiben erhalten. Der Standort kann danach nicht mehr neu ausgewählt werden."
                : "Der Standort wird wieder für neue Zuordnungen angeboten."
          }
          hint={
            confirm.entry.usageCount > 0
              ? `Verwendet von ${formatUsageCount(confirm.entry.usageCount, { singular: "Person", plural: "Personen" })}.`
              : null
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
