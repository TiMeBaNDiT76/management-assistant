import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from "react-native";
import { EditorHeader } from "../../../components/stammdaten/EditorHeader";
import { StatusChip } from "../../../components/StatusChip";
import { AppButton } from "../../../components/stammdaten/AppButton";
import { ColorField } from "../../../components/stammdaten/ColorField";
import { ConfirmDialog } from "../../../components/stammdaten/ConfirmDialog";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { FormDialog, FormRow } from "../../../components/stammdaten/FormDialog";
import { NoticeBanner } from "../../../components/stammdaten/NoticeBanner";
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
import { showColorLabel, showUsageColumn } from "../../../src/lib/responsive";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; entry: MasterDataEntryWithUsage }
  | null;

type ConfirmState = {
  entry: MasterDataEntryWithUsage;
  action: "deactivate" | "activate" | "remove";
} | null;

/**
 * Task-Status-Editor (see /mockups/070-stammdaten/stammdaten-taskstatus.html):
 * sortierbare Statusliste (Reihenfolge aus `sortOrder`, explizit speichern),
 * isDone-Markierung (mindestens ein aktiver Erledigt-Status), Farben mit
 * Kanban-Vorschau. Deaktivieren ist gesperrt, solange Tasks verweisen.
 */
export default function TaskStatusScreen() {
  const trpc = useTRPC();
  const actions = useMasterDataActions();
  const { width } = useWindowDimensions();
  // Responsive status row (mockup stammdaten-taskstatus.html): the usage
  // column hides at ≤900px, the color label at ≤620px.
  const withUsage = showUsageColumn(width);
  const withColorLabel = showColorLabel(width);
  const listQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "task_status", includeInactive: true }),
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [displayName, setDisplayName] = useState("");
  const [colorHex, setColorHex] = useState("#94A3B8");
  const [description, setDescription] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Local column order — persisted only via "Änderungen speichern".
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const entries = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  // Sync the local order whenever fresh data arrives (and no unsaved changes exist).
  useEffect(() => {
    if (listQuery.data) {
      setOrderIds(listQuery.data.map((entry) => entry.id));
    }
  }, [listQuery.data]);

  const orderedEntries = useMemo(() => {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const ordered = orderIds
      .map((id) => byId.get(id))
      .filter((entry): entry is MasterDataEntryWithUsage => entry !== undefined);
    // Entries not yet in the local order (newly created) are appended.
    for (const entry of entries) {
      if (!orderIds.includes(entry.id)) ordered.push(entry);
    }
    return ordered;
  }, [entries, orderIds]);

  const orderDirty = useMemo(() => {
    const activeIds = orderedEntries.map((entry) => entry.id);
    if (activeIds.length !== orderIds.length) return true;
    return activeIds.some((id, index) => entries[index]?.id !== id);
  }, [orderedEntries, orderIds, entries]);

  const doneCount = entries.filter((entry) => entry.isActive && entry.isDone).length;

  function move(id: string, direction: -1 | 1) {
    setOrderIds((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSaveOrder() {
    setBannerError(null);
    setSavingOrder(true);
    try {
      // Persist the new order with stable, gap-based sortOrder values (10, 20, 30, …).
      for (const [index, entry] of orderedEntries.entries()) {
        const sortOrder = (index + 1) * 10;
        if (entry.sortOrder !== sortOrder) {
          // `displayName` is required by the update contract; omitted optional
          // fields are left untouched server-side.
          await actions.update.mutateAsync({
            id: entry.id,
            data: { displayName: entry.displayName, sortOrder },
          });
        }
      }
      await actions.invalidate();
    } catch (error) {
      setBannerError(getMasterDataErrorMessage(error));
    } finally {
      setSavingOrder(false);
    }
  }

  function openCreate() {
    setDisplayName("");
    setColorHex("#94A3B8");
    setDescription("");
    setIsDone(false);
    setNameError(null);
    setColorError(null);
    setFormError(null);
    setDialog({ mode: "create" });
  }

  function openEdit(entry: MasterDataEntryWithUsage) {
    setDisplayName(entry.displayName);
    setColorHex(entry.colorHex ?? "#94A3B8");
    setDescription(entry.description ?? "");
    setIsDone(entry.isDone);
    setNameError(null);
    setColorError(null);
    setFormError(null);
    setDialog({ mode: "edit", entry });
  }

  async function handleSave() {
    if (!dialog) return;
    const name = displayName.trim();
    setNameError(null);
    setColorError(null);
    setFormError(null);
    if (!name) {
      setNameError("Bitte einen Statusnamen angeben.");
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
          category: "task_status",
          displayName: name,
          colorHex: colorHex.trim(),
          description: descriptionValue,
          isDone,
        });
      } else {
        await actions.update.mutateAsync({
          id: dialog.entry.id,
          data: {
            displayName: name,
            colorHex: colorHex.trim(),
            description: descriptionValue,
          },
        });
        if (isDone !== dialog.entry.isDone) {
          await actions.update.mutateAsync({
            id: dialog.entry.id,
            data: { displayName: dialog.entry.displayName, isDone },
          });
        }
      }
      setDialog(null);
    } catch (error) {
      setFormError(getMasterDataErrorMessage(error));
    }
  }

  async function toggleIsDone(entry: MasterDataEntryWithUsage, next: boolean) {
    setBannerError(null);
    if (!next && entry.isDone && doneCount <= 1) {
      setBannerError(
        "Mindestens ein Status muss als Erledigt (isDone) markiert bleiben.",
      );
      return;
    }
    try {
      await actions.update.mutateAsync({
        id: entry.id,
        data: { displayName: entry.displayName, isDone: next },
      });
    } catch (error) {
      setBannerError(getMasterDataErrorMessage(error));
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
    const inUse = entry.usageCount > 0;
    return [
      { key: "edit", label: "Bearbeiten", onPress: () => openEdit(entry) },
      entry.isActive
        ? {
            key: "deactivate",
            label: "Deaktivieren",
            disabled: inUse,
            hint: inUse
              ? "Deaktivieren ist gesperrt, solange Tasks auf diesen Status verweisen."
              : undefined,
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
        disabled: inUse,
        hint: inUse
          ? `Wird von ${entry.usageCount} Tasks verwendet — bitte stattdessen deaktivieren.`
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

  const activeOrdered = orderedEntries.filter((entry) => entry.isActive);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-4 pt-12 pb-2">
        <EditorHeader
          eyebrow="Stammdaten · Tasks"
          title="Task-Status"
          subtitle="Reihenfolge der Statuskarten steuert die dynamischen Kanban-Spalten."
          countChip={`${entries.filter((entry) => entry.isActive).length} Status`}
          createLabel="＋ Status hinzufügen"
          onCreate={openCreate}
        />
      </View>

      <View className="px-4" style={{ gap: 12 }}>
        <NoticeBanner>
          <Text style={{ fontWeight: "600" }}>Reihenfolge ändern.</Text> Verschiebe Statuskarten mit
          den Pfeilen und speichere anschließend. Mindestens ein Status muss als{" "}
          <Text style={{ fontWeight: "600" }}>Erledigt (isDone)</Text> markiert bleiben.
          Deaktivieren ist gesperrt, solange Tasks auf diesen Status verweisen.
        </NoticeBanner>

        {bannerError ? (
          <View className="rounded-mud px-3 py-2" style={{ backgroundColor: "#FDECEA" }}>
            <Text style={{ color: colors.error }}>{bannerError}</Text>
          </View>
        ) : null}

        {listQuery.isPending ? (
          <Text className="p-4 text-sm" style={{ color: colors.inkSecondary }}>
            Status werden geladen…
          </Text>
        ) : listQuery.isError ? (
          <ErrorState
            message={getMasterDataErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Noch keine Status angelegt."
            description="Lege den ersten Status an — er wird als Kanban-Spalte im Aufgabenboard erscheinen."
            actionLabel="Ersten Status anlegen"
            onPress={openCreate}
          />
        ) : (
          <>
            {orderedEntries.map((entry, index) => (
              <View
                key={entry.id}
                className="rounded-mudlg border border-divider p-3"
                style={{ backgroundColor: entry.isActive ? colors.surface : "#FAFAFA" }}
                testID={`entry-row-${entry.key}`}
              >
                {/* flex-wrap keeps switch/chip/actions usable on very narrow windows. */}
                <View className="flex-row flex-wrap items-start justify-between">
                  <View className="flex-row items-start" style={{ gap: 10 }}>
                    <View className="items-center" style={{ gap: 2 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${entry.displayName} nach oben verschieben`}
                        disabled={index === 0}
                        onPress={() => move(entry.id, -1)}
                        hitSlop={4}
                        testID={`move-up-${entry.key}`}
                      >
                        <Ionicons
                          name="chevron-up"
                          size={18}
                          color={index === 0 ? colors.inkDisabled : colors.inkSecondary}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${entry.displayName} nach unten verschieben`}
                        disabled={index === orderedEntries.length - 1}
                        onPress={() => move(entry.id, 1)}
                        hitSlop={4}
                        testID={`move-down-${entry.key}`}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={
                            index === orderedEntries.length - 1
                              ? colors.inkDisabled
                              : colors.inkSecondary
                          }
                        />
                      </Pressable>
                    </View>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "rgba(15, 23, 42, 0.07)",
                        backgroundColor: entry.colorHex ?? colors.inkDisabled,
                      }}
                    />
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
                        {entry.key}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View
                      className="flex-row items-center"
                      style={{ gap: 6 }}
                      testID={`is-done-${entry.key}`}
                    >
                      <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                        isDone
                      </Text>
                      <Switch
                        value={entry.isDone}
                        onValueChange={(next) => toggleIsDone(entry, next)}
                        disabled={busy}
                        style={{ transform: [{ scale: 0.8 }] }}
                        trackColor={{ false: "#CBD5E1", true: colors.success }}
                        thumbColor="#FFFFFF"
                        testID={`switch-is-done-${entry.key}`}
                      />
                    </View>
                    <StatusChip
                      label={entry.isActive ? "● Aktiv" : "○ Inaktiv"}
                      tone={entry.isActive ? "success" : "warning"}
                    />
                    <RowActionsMenu actions={rowActions(entry)} />
                  </View>
                </View>
                <Text className="mt-1 text-xs" style={{ color: colors.inkSecondary }} testID={`entry-meta-${entry.key}`}>
                  {withColorLabel ? `Position ${index + 1} · ${entry.colorHex ?? "—"}` : `Position ${index + 1}`}
                  {withUsage
                    ? ` · ${formatUsageCount(entry.usageCount, { singular: "Task", plural: "Tasks" })}`
                    : null}
                </Text>
              </View>
            ))}

            <View className="flex-row items-center justify-between">
              <Text
                className="flex-1 text-xs"
                style={{ color: orderDirty ? "#92400E" : colors.inkSecondary }}
              >
                {orderDirty
                  ? "Ungespeicherte Reihenfolge — Änderungen wirken erst nach dem Speichern."
                  : "Reihenfolge ist gespeichert."}
              </Text>
              <AppButton
                label="Änderungen speichern"
                onPress={handleSaveOrder}
                disabled={!orderDirty}
                busy={savingOrder}
              />
            </View>
          </>
        )}

        {/* Kanban-Vorschau: Spalten, Farben und Reihenfolge aus den aktiven Status. */}
        {activeOrdered.length > 0 ? (
          <View className="rounded-mudlg border border-divider bg-surface p-4" testID="kanban-preview">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                Kanban-Vorschau
              </Text>
              <StatusChip
                label={`${doneCount} Erledigt-Status`}
                tone={doneCount >= 1 ? "success" : "error"}
              />
            </View>
            <Text className="mb-3 text-xs" style={{ color: colors.inkSecondary }}>
              Spalten folgen dieser Reihenfolge · Farbänderungen aktualisieren die Vorschau
            </Text>
            {/* Horizontal scroll like the mockup `.columns { overflow: auto }` — columns keep a
                minimum width instead of squeezing on narrow windows. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ gap: 12 }}
              testID="kanban-columns-scroll"
            >
              {activeOrdered.map((entry) => (
                <View
                  key={entry.id}
                  className="rounded-lg bg-surface"
                  style={{
                    minWidth: 150,
                    borderTopWidth: 4,
                    borderTopColor: entry.colorHex ?? colors.inkDisabled,
                    backgroundColor: "#F1F5F9",
                    padding: 10,
                  }}
                  testID={`kanban-column-${entry.key}`}
                >
                  <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
                    <Text className="text-xs font-bold" style={{ color: colors.ink }}>
                      {entry.displayName}
                    </Text>
                    <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                      {entry.usageCount}
                    </Text>
                  </View>
                  {entry.isDone ? (
                    <Text className="mt-1 text-xs" style={{ color: colors.success }}>
                      Erledigt-Status
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <FormDialog
        visible={dialog !== null}
        title={dialog?.mode === "edit" ? "Status bearbeiten" : "Status hinzufügen"}
        onClose={() => setDialog(null)}
        onSave={handleSave}
        saving={actions.create.isPending || actions.update.isPending}
        error={formError}
      >
        <FormRow>
          <TextField
            label="Statusname"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="z. B. In Bearbeitung"
            required
            error={nameError}
            testID="field-display-name"
          />
          <ColorField value={colorHex} onChange={setColorHex} error={colorError} testID="field-color" />
        </FormRow>
        <TextField
          label="Beschreibung"
          value={description}
          onChangeText={setDescription}
          placeholder="Optionale Beschreibung"
          multiline
          testID="field-description"
        />
        <SwitchField
          label="Erledigt (isDone)"
          value={isDone}
          onValueChange={setIsDone}
          caption="Nur Erledigt-Status beenden eine Aufgabe. Mindestens ein aktiver Status muss isDone bleiben."
          testID="field-is-done"
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
              ? "Der Status wird endgültig entfernt. Dies ist nur möglich, solange keine Tasks ihn verwenden."
              : confirm.action === "deactivate"
                ? "Der Status verschwindet als Kanban-Spalte; bestehende Tasks behalten ihn."
                : "Der Status wird wieder als Kanban-Spalte angezeigt."
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

