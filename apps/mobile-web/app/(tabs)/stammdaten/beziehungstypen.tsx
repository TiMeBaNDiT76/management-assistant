import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { EditorHeader } from "../../../components/stammdaten/EditorHeader";
import { StatusChip } from "../../../components/StatusChip";
import { ConfirmDialog } from "../../../components/stammdaten/ConfirmDialog";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { FormDialog } from "../../../components/stammdaten/FormDialog";
import { RowActionsMenu, type RowAction } from "../../../components/stammdaten/RowActionsMenu";
import { SwitchField } from "../../../components/stammdaten/SwitchField";
import { TextField } from "../../../components/stammdaten/TextField";
import { useTRPC } from "../../../src/lib/trpc";
import { useMasterDataActions } from "../../../src/hooks/useMasterDataActions";
import { formatUsageCount, getMasterDataErrorMessage } from "../../../src/lib/master-data-ui";
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
 * Beziehungstypen-Editor (see /mockups/070-stammdaten/stammdaten-beziehungstypen.html):
 * Singular/Anzeigename, Pflichtfeld pluralLabel, optionale Beschreibung, keine
 * Farbe; Zähler bezieht sich auf Beziehungen.
 */
export default function BeziehungstypenScreen() {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "relationship_type", includeInactive: true }),
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [displayName, setDisplayName] = useState("");
  const [pluralLabel, setPluralLabel] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pluralError, setPluralError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const entries = listQuery.data ?? [];
  const activeCount = entries.filter((entry) => entry.isActive).length;

  function openCreate() {
    setDisplayName("");
    setPluralLabel("");
    setDescription("");
    setIsActive(true);
    setNameError(null);
    setPluralError(null);
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setDisplayName(entry.displayName);
    setPluralLabel(entry.pluralLabel ?? "");
    setDescription(entry.description ?? "");
    setIsActive(entry.isActive);
    setNameError(null);
    setPluralError(null);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    const plural = pluralLabel.trim();
    setNameError(null);
    setPluralError(null);
    setFormError(null);
    if (!name) {
      setNameError("Bitte einen Anzeigenamen (Singular) angeben.");
      return;
    }
    if (!plural) {
      setPluralError("Bitte eine Plural-Form angeben.");
      return;
    }
    const descriptionValue = description.trim() === "" ? null : description.trim();
    try {
      if (dialog.mode === "create") {
        await actions.create.mutateAsync({
          category: "relationship_type",
          displayName: name,
          pluralLabel: plural,
          description: descriptionValue,
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry.id,
          data: {
            displayName: name,
            pluralLabel: plural,
            description: descriptionValue,
          },
        });
        // The Aktiv switch maps to the dedicated activate/deactivate procedures.
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
            ? `Wird von ${entry.usageCount} Beziehungen verwendet — bitte stattdessen deaktivieren.`
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
          eyebrow="Stammdaten · People-Beziehungen"
          title="Beziehungstypen"
          subtitle="Singular und Plural werden in Beziehungseinträgen, Filtern und Chips passend zum Kontext verwendet."
          countChip={`${activeCount} aktiv`}
          createLabel="＋ Beziehungstyp anlegen"
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
            Einträge werden geladen…
          </Text>
        ) : listQuery.isError ? (
          <ErrorState
            message={getMasterDataErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Noch keine Beziehungstypen angelegt."
            description="Lege den ersten Typ an — er steht danach in People-Beziehungen und Filtern zur Auswahl."
            actionLabel="Ersten Beziehungstyp anlegen"
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
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: entry.isActive ? colors.ink : colors.inkSecondary }}
                    >
                      {entry.displayName}
                    </Text>
                    <Text style={{ color: colors.inkDisabled }}>→</Text>
                    <Text
                      className="text-base"
                      style={{ color: entry.isActive ? colors.inkSecondary : colors.inkDisabled }}
                    >
                      {entry.pluralLabel ?? "—"}
                    </Text>
                  </View>
                  {entry.description ? (
                    <Text
                      className="mt-0.5 text-sm"
                      style={{ color: entry.isActive ? colors.inkSecondary : colors.inkDisabled }}
                      numberOfLines={2}
                    >
                      {entry.description}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-xs" style={{ color: colors.inkSecondary }}>
                    Verwendet von{" "}
                    {formatUsageCount(entry.usageCount, { singular: "Beziehung", plural: "Beziehungen" })}
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
            {entries.length} Einträge · {activeCount} aktiv · Zähler bezieht sich auf Beziehungen ·
            keine Farbcodierung
          </Text>
        ) : null}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? "Beziehungstyp bearbeiten" : "Beziehungstyp anlegen"}
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        <TextField
          label="Singular / Anzeigename"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="z. B. Kind"
          required
          error={nameError}
          testID="field-display-name"
        />
        <TextField
          label="Plural-Form (pluralLabel)"
          value={pluralLabel}
          onChangeText={setPluralLabel}
          placeholder="z. B. Kinder"
          caption="Für Filter und Mehrzahl-Chips"
          required
          error={pluralError}
          testID="field-plural-label"
        />
        <TextField
          label="Beschreibung"
          value={description}
          onChangeText={setDescription}
          placeholder="Optionale Beschreibung"
          multiline
          testID="field-description"
        />
        {dialog?.mode === "edit" ? (
          <SwitchField
            label="Aktiv"
            value={isActive}
            onValueChange={setIsActive}
            testID="field-is-active"
          />
        ) : (
          <Text className="text-xs" style={{ color: colors.inkSecondary }}>
            Neue Einträge sind sofort aktiv.
          </Text>
        )}
        <Text className="text-xs" style={{ color: "#B45309" }}>
          Hinweis: Singular- und Plural-Form müssen jeweils innerhalb ihres Feldes eindeutig sein
          (case-insensitive).
        </Text>
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
              ? "Der Eintrag wird endgültig entfernt. Dies ist nur möglich, solange keine Beziehungen ihn verwenden."
              : confirm.action === "deactivate"
                ? "Bestehende Beziehungen bleiben lesbar. Der Typ kann danach nicht mehr neu ausgewählt werden."
                : "Der Typ wird wieder für neue Beziehungen angeboten."
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
