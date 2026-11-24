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

const FREQUENCY_PRESETS = [
  "wöchentlich",
  "monatlich",
  "quartalsweise",
  "jährlich",
  "nach Bedarf",
] as const;

const FREQUENCY_CUSTOM = "__custom__";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; entry: MasterDataEntryWithUsage }
  | null;

type ConfirmState = {
  entry: MasterDataEntryWithUsage;
  action: "deactivate" | "activate" | "remove";
} | null;

/**
 * Terminarten-Editor (see /mockups/070-stammdaten/stammdaten-terminarten.html):
 * Farbdot + Live-Preview, Pflichtfeld Frequenz-Hinweis (redaktionell, keine
 * automatische Serie), optionale Beschreibung, Aktivstatus.
 */
export default function TerminartenScreen() {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "appointment_type", includeInactive: true }),
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [displayName, setDisplayName] = useState("");
  const [frequencyPreset, setFrequencyPreset] = useState<string>(FREQUENCY_CUSTOM);
  const [customFrequency, setCustomFrequency] = useState("");
  const [colorHex, setColorHex] = useState("#3B82F6");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const entries = listQuery.data ?? [];
  const activeCount = entries.filter((entry) => entry.isActive).length;

  function openCreate() {
    setDisplayName("");
    setFrequencyPreset(FREQUENCY_CUSTOM);
    setCustomFrequency("");
    setColorHex("#3B82F6");
    setDescription("");
    setIsActive(true);
    setNameError(null);
    setFrequencyError(null);
    setColorError(null);
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setDisplayName(entry.displayName);
    const preset = (FREQUENCY_PRESETS as readonly string[]).includes(entry.frequency ?? "");
    setFrequencyPreset(preset ? (entry.frequency as string) : FREQUENCY_CUSTOM);
    setCustomFrequency(preset ? "" : (entry.frequency ?? ""));
    setColorHex(entry.colorHex ?? "#3B82F6");
    setDescription(entry.description ?? "");
    setIsActive(entry.isActive);
    setNameError(null);
    setFrequencyError(null);
    setColorError(null);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    const frequencyValue =
      frequencyPreset === FREQUENCY_CUSTOM ? customFrequency.trim() : frequencyPreset;
    setNameError(null);
    setFrequencyError(null);
    setColorError(null);
    setFormError(null);
    if (!name) {
      setNameError("Bitte einen Anzeigenamen angeben.");
      return;
    }
    if (!frequencyValue) {
      setFrequencyError("Bitte einen Frequenz-Hinweis angeben.");
      return;
    }
    if (!isHexColor(colorHex)) {
      setColorError("Ungültige Farbe — bitte als #RRGGBB angeben.");
      return;
    }
    const descriptionValue = description.trim() === "" ? null : description.trim();
    try {
      if (dialog.mode === "create") {
        await actions.create.mutateAsync({
          category: "appointment_type",
          displayName: name,
          frequency: frequencyValue,
          colorHex: colorHex.trim(),
          description: descriptionValue,
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry.id,
          data: {
            displayName: name,
            frequency: frequencyValue,
            colorHex: colorHex.trim(),
            description: descriptionValue,
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
            ? `Wird von ${entry.usageCount} Gesprächen verwendet — bitte stattdessen deaktivieren.`
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

  const previewFrequency =
    frequencyPreset === FREQUENCY_CUSTOM
      ? customFrequency.trim()
      : frequencyPreset;

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-4 pt-12 pb-2">
        <EditorHeader
          eyebrow="Stammdaten · Gespräche"
          title="Terminarten"
          subtitle="Farbe und Frequenz-Hinweis kennzeichnen die Gesprächsart. Frequenz ist redaktioneller Text, keine automatische Serie."
          countChip={`${activeCount} aktiv`}
          createLabel="＋ Terminart anlegen"
          onCreate={openCreate}
        />
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        <NoticeBanner>
          <Text style={{ fontWeight: "600" }}>Redaktioneller Hinweis:</Text> Frequenz ist ein
          Stammdatum-Text zur Orientierung. Sie erzeugt weder automatische Terminserien noch
          Erinnerungen.
        </NoticeBanner>

        {bannerError ? (
          <View className="rounded-mud px-3 py-2" style={{ backgroundColor: "#FDECEA" }}>
            <Text style={{ color: colors.error }}>{bannerError}</Text>
          </View>
        ) : null}

        {listQuery.isPending ? (
          <Text className="p-4 text-sm" style={{ color: colors.inkSecondary }}>
            Einträge werden geladen…
          </Text>
        ) : listQuery.isError ? (
          <ErrorState
            message={getMasterDataErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Noch keine Terminarten angelegt."
            description="Lege die erste Gesprächsart an — sie steht danach in der Gesprächsplanung zur Auswahl."
            actionLabel="Erste Terminart anlegen"
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
                  <Text className="mt-1 text-xs" style={{ color: colors.inkSecondary }}>
                    Frequenz: {entry.frequency ?? "—"}
                    {entry.usageCount > 0
                      ? ` · Verwendet von ${formatUsageCount(entry.usageCount, {
                          singular: "Gespräch",
                          plural: "Gesprächen",
                        })}`
                      : ""}
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
            Frequenz wird als Hinweis beim Gespräch gezeigt — ohne automatische Serie.
          </Text>
        ) : null}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? "Terminart bearbeiten" : "Terminart anlegen"}
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saveLabel="Änderungen speichern"
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        <FormRow>
          <TextField
            label="Anzeigename"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="z. B. Feedback-Gespräch"
            required
            error={nameError}
            testID="field-display-name"
          />
          <ColorField
            value={colorHex}
            onChange={setColorHex}
            error={colorError}
            testID="field-color"
          />
        </FormRow>
        <OptionSelect
          label="Frequenz-Hinweis"
          value={frequencyPreset}
          onChange={setFrequencyPreset}
          placeholder="Bitte wählen"
          caption="Vorschläge: wöchentlich · monatlich · quartalsweise · jährlich · nach Bedarf"
          options={[
            ...FREQUENCY_PRESETS.map((preset) => ({ value: preset, label: preset })),
            { value: FREQUENCY_CUSTOM, label: "Benutzerdefiniert" },
          ]}
          testID="field-frequency"
        />
        {frequencyPreset === FREQUENCY_CUSTOM ? (
          <TextField
            label="Eigener Text bei „Benutzerdefiniert“"
            value={customFrequency}
            onChangeText={setCustomFrequency}
            placeholder="z. B. alle 6 Wochen"
            caption="Freier Stammdatum-Text, keine Terminregel"
            error={frequencyError}
            testID="field-frequency-custom"
          />
        ) : null}
        <TextField
          label="Beschreibung"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional — z. B. Strukturiertes Gespräch zu Entwicklung und Zielen"
          multiline
          testID="field-description"
        />
        {dialog?.mode === "edit" ? (
          <SwitchField
            label="Aktiv"
            value={isActive}
            onValueChange={setIsActive}
            caption="Deaktivierte Terminarten bleiben in historischen Gesprächen sichtbar."
            testID="field-is-active"
          />
        ) : (
          <Text className="text-xs" style={{ color: colors.inkSecondary }}>
            Neue Einträge sind sofort aktiv.
          </Text>
        )}
        <View
          className="rounded-mud px-3 py-2.5"
          style={{
            backgroundColor: "#EEF2FF",
            borderLeftWidth: 3,
            borderLeftColor: colorHex.trim().match(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
              ? colorHex.trim()
              : "#4F46E5",
          }}
        >
          <Text style={{ color: "#3730A3", fontSize: 13 }}>
            <Text style={{ fontWeight: "700" }}>Frequenz-Hinweis:</Text>{" "}
            {previewFrequency ? previewFrequency : "—"} · erscheint als Hinweis beim Gespräch
          </Text>
        </View>
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
              ? "Der Eintrag wird endgültig entfernt. Dies ist nur möglich, solange keine Gespräche ihn verwenden."
              : confirm.action === "deactivate"
                ? "Bestehende Gespräche bleiben sichtbar. Die Terminart kann danach nicht mehr für neue Gespräche ausgewählt werden."
                : "Die Terminart wird wieder für neue Gespräche angeboten."
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
