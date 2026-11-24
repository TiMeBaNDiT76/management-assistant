import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Employee, RelationshipCreateInput } from "@mgmt/shared";
import { FormDialog } from "../stammdaten/FormDialog";
import { OptionSelect } from "../stammdaten/OptionSelect";
import { TextField } from "../stammdaten/TextField";
import { useTRPC } from "../../src/lib/trpc";
import { useEmployeeActions } from "../../src/hooks/useEmployeeActions";
import {
  NO_SELECTION,
  NO_SELECTION_LABEL,
  getEmployeeErrorMessage,
  toSelectOptions,
} from "../../src/lib/people-ui";

interface RelationshipFormDialogProps {
  visible: boolean;
  /** The person the relationship starts from (the open profile). */
  fromEmployeeId: string;
  fromEmployeeName: string;
  /** All other people of the workspace (the open profile is excluded). */
  candidates: Employee[];
  onClose: () => void;
}

/**
 * "Beziehung hinzufügen" dialog (see /mockups/050-people/beziehungen.html):
 * the type picker is fed from the `relationship_type` master data, the person
 * picker from the employee directory.
 */
export function RelationshipFormDialog({
  visible,
  fromEmployeeId,
  fromEmployeeName,
  candidates,
  onClose,
}: RelationshipFormDialogProps) {
  const trpc = useTRPC();
  const actions = useEmployeeActions();

  const typesQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "relationship_type", includeInactive: true }),
  );

  const [toEmployeeId, setToEmployeeId] = useState<string>(NO_SELECTION);
  const [typeKey, setTypeKey] = useState<string>(NO_SELECTION);
  const [notes, setNotes] = useState("");
  const [personError, setPersonError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const types = typesQuery.data ?? [];
  const typeOptions = toSelectOptions(types, {
    activeOnly: true,
    emptyLabel: NO_SELECTION_LABEL,
  });
  const personOptions = [
    { value: NO_SELECTION, label: "— Person wählen —" },
    ...candidates.map((candidate) => ({
      value: candidate.id,
      label: `${candidate.firstName} ${candidate.lastName}`,
    })),
  ];

  useEffect(() => {
    if (!visible) return;
    setToEmployeeId(NO_SELECTION);
    setTypeKey(NO_SELECTION);
    setNotes("");
    setPersonError(null);
    setTypeError(null);
    setFormError(null);
  }, [visible]);

  async function handleSave() {
    setPersonError(null);
    setTypeError(null);
    setFormError(null);

    let valid = true;
    if (!toEmployeeId) {
      setPersonError("Bitte eine Person auswählen.");
      valid = false;
    }
    if (!typeKey) {
      setTypeError("Bitte einen Beziehungstyp auswählen.");
      valid = false;
    }
    if (notes.length > 2_000) {
      setFormError("Die Notiz darf maximal 2.000 Zeichen haben.");
      valid = false;
    }
    if (!valid) return;

    try {
      await actions.createRelationship.mutateAsync({
        fromEmployeeId,
        toEmployeeId,
        type: typeKey as RelationshipCreateInput["type"],
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setFormError(getEmployeeErrorMessage(error));
    }
  }

  return (
    <FormDialog
      visible={visible}
      title="Beziehung hinzufügen"
      subtitle={`Von ${fromEmployeeName} zur gewählten Person.`}
      onClose={onClose}
      onSave={handleSave}
      saveLabel="Beziehung anlegen"
      saving={actions.createRelationship.isPending}
      error={formError}
    >
      <OptionSelect
        label="Person"
        value={toEmployeeId}
        options={personOptions}
        onChange={setToEmployeeId}
        caption={
          candidates.length === 0
            ? "Es sind noch keine weiteren Personen angelegt."
            : "Die Beziehung wird von dieser Person zur gewählten Person angelegt."
        }
        error={personError}
        testID="field-person"
      />
      <OptionSelect
        label="Beziehungstyp"
        value={typeKey}
        options={typeOptions}
        onChange={setTypeKey}
        caption={
          typesQuery.isPending
            ? "Beziehungstypen werden geladen…"
            : "Typen kommen aus den Stammdaten (Beziehungstypen)."
        }
        error={typeError ?? (typesQuery.isError ? "Beziehungstypen konnten nicht geladen werden." : null)}
        testID="field-relationship-type"
      />
      <TextField
        label="Notiz"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optionaler Kontext zur Verbindung"
        caption="Optional — max. 2.000 Zeichen."
        multiline
        testID="field-relationship-notes"
      />
    </FormDialog>
  );
}
