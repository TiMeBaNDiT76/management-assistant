import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { ScreenHeader } from "../ScreenHeader";
import { StatusChip } from "../StatusChip";
import { AppButton } from "./AppButton";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState, ErrorState } from "./EmptyState";
import { FormDialog } from "./FormDialog";
import { NoticeBanner } from "./NoticeBanner";
import { RowActionsMenu, type RowAction } from "./RowActionsMenu";
import { SwitchField } from "./SwitchField";
import { TextField } from "./TextField";
import { useTRPC } from "../../src/lib/trpc";
import { useMasterDataActions } from "../../src/hooks/useMasterDataActions";
import { formatUsageCount, getMasterDataErrorMessage } from "../../src/lib/master-data-ui";
import type { MasterDataEntryWithUsage } from "@mgmt/shared";
import { colors } from "../../src/theme/tokens";

interface SimpleTextEditorProps {
  /** `"role"` (Rollen, Multi-Select an der Person) or `"department"` (Abteilungen, Einfachauswahl). */
  category: "role" | "department";
  /** e.g. "Stammdaten · People" */
  eyebrow: string;
  title: string;
  subtitle: string;
  /** e.g. "＋ Rolle anlegen" */
  createLabel: string;
  /** e.g. "Erste Rolle anlegen" (empty-state CTA). */
  emptyActionLabel: string;
  /** Footer note, e.g. "Mehrfachauswahl an der Person". */
  footerNote: string;
  /** Singular form for dialog titles, e.g. "Rolle". */
  singularNoun: string;
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; entry: MasterDataEntryWithUsage }
  | null;

type ConfirmState = {
  entry: MasterDataEntryWithUsage;
  action: "deactivate" | "activate" | "remove";
} | null;

/**
 * Editor for the two mockup-identical text-only categories (Rollen and
 * Abteilungen): Anzeigename + Beschreibung + Aktiv — no color, no visible key
 * ("Schlüssel wird aus dem Namen abgeleitet und hier nicht angezeigt."), with
 * a "Verwendet von N Personen" counter per row.
 */
export function SimpleTextEditor({
  category,
  eyebrow,
  title,
  subtitle,
  createLabel,
  emptyActionLabel,
  footerNote,
  singularNoun,
}: SimpleTextEditorProps) {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category, includeInactive: true }),
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const entries = listQuery.data ?? [];
  const activeCount = entries.filter((entry) => entry.isActive).length;

  function openCreate() {
    setDisplayName("");
    setDescription("");
    setIsActive(true);
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setDisplayName(entry.displayName);
    setDescription(entry.description ?? "");
    setIsActive(entry.isActive);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    if (!name) {
      setFormError("Bitte einen Anzeigenamen angeben.");
      return;
    }
    setFormError(null);
    const descriptionValue = description.trim() === "" ? null : description.trim();
    try {
      if (dialog.mode === "create") {
        await actions.create.mutateAsync({
          category,
          displayName: name,
          description: descriptionValue,
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry.id,
          data: { displayName: name, description: descriptionValue },
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
            ? `Wird von ${entry.usageCount} Einträgen verwendet — bitte stattdessen deaktivieren.`
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
      <View className="px-6 pt-12 pb-2">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.primary.DEFAULT }}>
          {eyebrow}
        </Text>
        {/* page-head stacks below 760px (mockup _palette.css @media rule). */}
        <View className="flex-col items-start justify-between gap-3 ns:flex-row ns:items-start ns:gap-0">
          <ScreenHeader title={title} subtitle={subtitle} />
          <View className="items-start ns:items-end" style={{ gap: 8 }}>
            <StatusChip label={`${activeCount} aktiv`} />
            <AppButton label={createLabel} onPress={openCreate} />
          </View>
        </View>
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        <NoticeBanner>
          <Text style={{ fontWeight: "600" }}>Nur deaktivieren, nicht löschen.</Text>{" "}
          Einträge mit bestehenden Zuordnungen behalten ihren Anzeigenamen; das Löschen ist nur
          möglich, solange nichts auf den Eintrag verweist.
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
            title={`Noch keine ${title} angelegt.`}
            description="Lege den ersten Eintrag an — er steht danach in People zur Auswahl."
            actionLabel={emptyActionLabel}
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
                  <Text
                    className="text-base font-semibold"
                    style={{ color: entry.isActive ? colors.ink : colors.inkSecondary }}
                  >
                    {entry.displayName}
                  </Text>
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
            {entries.length} Einträge · {activeCount} aktiv · {footerNote}
          </Text>
        ) : null}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? `${singularNoun} bearbeiten` : createLabel.replace("＋ ", "")}
        subtitle="Anzeigename und Beschreibung steuern die redaktionelle Darstellung."
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        <TextField
          label="Anzeigename"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="z. B. Teamleitung"
          caption="Pflichtfeld"
          required
          testID="field-display-name"
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
            caption="Inaktive Einträge bleiben für bestehende Datensätze sichtbar."
            testID="field-is-active"
          />
        ) : (
          <Text className="text-xs" style={{ color: colors.inkSecondary }}>
            Neue Einträge sind sofort aktiv.
          </Text>
        )}
        <Text className="text-xs" style={{ color: colors.inkSecondary }}>
          ℹ Schlüssel wird aus dem Namen abgeleitet und hier nicht angezeigt.
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
              ? "Der Eintrag wird endgültig entfernt. Dies ist nur möglich, solange keine Datensätze ihn verwenden."
              : confirm.action === "deactivate"
                ? "Bestehende Zuordnungen bleiben erhalten. Der Eintrag kann danach nicht mehr neu ausgewählt werden."
                : "Der Eintrag wird wieder für neue Zuordnungen angeboten."
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
