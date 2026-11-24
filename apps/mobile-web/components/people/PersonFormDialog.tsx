import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Employee } from "@mgmt/shared";
import { FormDialog } from "../stammdaten/FormDialog";
import { OptionSelect } from "../stammdaten/OptionSelect";
import { TextField } from "../stammdaten/TextField";
import { useTRPC } from "../../src/lib/trpc";
import { useEmployeeActions } from "../../src/hooks/useEmployeeActions";
import {
  NO_SELECTION,
  NO_SELECTION_LABEL,
  ensureCurrentOption,
  getEmployeeErrorMessage,
  isEmail,
  isIsoDate,
  toSelectOptions,
} from "../../src/lib/people-ui";

interface PersonFormDialogProps {
  visible: boolean;
  /** Existing person for the edit flow — `null`/`undefined` starts the create flow. */
  employee?: Employee | null;
  onClose: () => void;
}

/**
 * Create/edit dialog for a person (see /mockups/070-stammdaten/dialoge-konsum.html,
 * "Mitarbeiter anlegen"). Rolle, Abteilung and Einsatzstandort are OptionSelects
 * fed from the `masterData` seeds — the stored value is the master-data *key*.
 */
export function PersonFormDialog({ visible, employee = null, onClose }: PersonFormDialogProps) {
  const trpc = useTRPC();
  const actions = useEmployeeActions();

  const rolesQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "role", includeInactive: true }),
  );
  const departmentsQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "department", includeInactive: true }),
  );
  const locationsQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "location", includeInactive: true }),
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState<string>(NO_SELECTION);
  const [departmentKey, setDepartmentKey] = useState<string>(NO_SELECTION);
  const [locationKey, setLocationKey] = useState<string>(NO_SELECTION);
  const [hireDate, setHireDate] = useState("");
  const [notes, setNotes] = useState("");

  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hireDateError, setHireDateError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const roles = rolesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const roleOptions = ensureCurrentOption(
    toSelectOptions(roles, { activeOnly: true, emptyLabel: NO_SELECTION_LABEL }),
    roles,
    roleKey,
  );
  const departmentOptions = ensureCurrentOption(
    toSelectOptions(departments, { activeOnly: true, emptyLabel: NO_SELECTION_LABEL }),
    departments,
    departmentKey,
  );
  const locationOptions = ensureCurrentOption(
    toSelectOptions(locations, { activeOnly: true, emptyLabel: NO_SELECTION_LABEL }),
    locations,
    locationKey,
  );

  useEffect(() => {
    if (!visible) return;
    setFirstName(employee?.firstName ?? "");
    setLastName(employee?.lastName ?? "");
    setEmail(employee?.email ?? "");
    setRoleKey(employee?.role ?? NO_SELECTION);
    setDepartmentKey(employee?.department ?? NO_SELECTION);
    setLocationKey(employee?.location ?? NO_SELECTION);
    setHireDate(employee?.hireDate ?? "");
    setNotes(employee?.notes ?? "");
    setFirstNameError(null);
    setLastNameError(null);
    setEmailError(null);
    setHireDateError(null);
    setNotesError(null);
    setFormError(null);
  }, [visible, employee]);

  function masterDataError(query: { isError: boolean }, label: string): string | null {
    return query.isError ? `${label} konnten nicht geladen werden.` : null;
  }

  async function handleSave() {
    setFormError(null);
    setFirstNameError(null);
    setLastNameError(null);
    setEmailError(null);
    setHireDateError(null);
    setNotesError(null);

    const first = firstName.trim();
    const last = lastName.trim();
    const mail = email.trim();
    const date = hireDate.trim();
    let valid = true;

    if (!first) {
      setFirstNameError("Bitte einen Vornamen eingeben.");
      valid = false;
    }
    if (!last) {
      setLastNameError("Bitte einen Nachnamen eingeben.");
      valid = false;
    }
    if (mail && !isEmail(mail)) {
      setEmailError("Bitte eine gültige E-Mail-Adresse angeben.");
      valid = false;
    }
    if (date && !isIsoDate(date)) {
      setHireDateError("Bitte ein gültiges Datum im Format JJJJ-MM-TT eingeben.");
      valid = false;
    }
    if (notes.length > 10_000) {
      setNotesError("Die Notiz darf maximal 10.000 Zeichen haben.");
      valid = false;
    }
    if (!valid) return;

    const payload = {
      firstName: first,
      lastName: last,
      // The API accepts a string but no null — an empty e-mail/date cannot be
      // cleared, everything else is cleared with an empty string.
      email: mail || undefined,
      role: roleKey,
      department: departmentKey,
      location: locationKey,
      hireDate: date || undefined,
      notes,
    };

    try {
      if (employee) {
        await actions.update.mutateAsync({ id: employee.id, data: payload });
      } else {
        await actions.create.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      setFormError(getEmployeeErrorMessage(error));
    }
  }

  const busy = actions.create.isPending || actions.update.isPending;
  const title = employee
    ? `${employee.firstName} ${employee.lastName} bearbeiten`
    : "Mitarbeiter anlegen";

  return (
    <FormDialog
      visible={visible}
      title={title}
      subtitle={
        employee
          ? "Profil, Rolle und Einsatz der Person anpassen."
          : "Name, Rolle, Abteilung und Einsatzstandort erfassen."
      }
      onClose={onClose}
      onSave={handleSave}
      saveLabel={employee ? "Änderungen speichern" : "Mitarbeiter anlegen"}
      saving={busy}
      error={formError}
    >
      <TextField
        label="Vorname"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="z. B. Mila"
        required
        autoCapitalize="words"
        error={firstNameError}
        testID="field-first-name"
      />
      <TextField
        label="Nachname"
        value={lastName}
        onChangeText={setLastName}
        placeholder="z. B. Nowak"
        required
        autoCapitalize="words"
        error={lastNameError}
        testID="field-last-name"
      />
      <TextField
        label="E-Mail"
        value={email}
        onChangeText={setEmail}
        placeholder="name@beispiel.de"
        caption="Optional — dient der eindeutigen Zuordnung."
        autoCapitalize="none"
        keyboardType="email-address"
        error={emailError}
        testID="field-email"
      />
      <OptionSelect
        label="Rolle"
        value={roleKey}
        options={roleOptions}
        onChange={setRoleKey}
        caption={rolesQuery.isPending ? "Rollen werden geladen…" : "Aktive Rollen aus den Stammdaten."}
        error={masterDataError(rolesQuery, "Rollen")}
        testID="field-role"
      />
      <OptionSelect
        label="Abteilung"
        value={departmentKey}
        options={departmentOptions}
        onChange={setDepartmentKey}
        caption={
          departmentsQuery.isPending
            ? "Abteilungen werden geladen…"
            : "Aktive Abteilungen aus den Stammdaten."
        }
        error={masterDataError(departmentsQuery, "Abteilungen")}
        testID="field-department"
      />
      <OptionSelect
        label="Einsatzstandort"
        value={locationKey}
        options={locationOptions}
        onChange={setLocationKey}
        caption={
          locationsQuery.isPending
            ? "Standorte werden geladen…"
            : "Aktive Standorte aus den Stammdaten."
        }
        error={masterDataError(locationsQuery, "Standorte")}
        testID="field-location"
      />
      <TextField
        label="Eintrittsdatum"
        value={hireDate}
        onChangeText={setHireDate}
        placeholder="JJJJ-MM-TT"
        caption="Format: JJJJ-MM-TT, z. B. 2026-04-01."
        error={hireDateError}
        testID="field-hire-date"
      />
      <TextField
        label="Notizen"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optionale Anmerkungen zur Person"
        caption="Max. 10.000 Zeichen."
        multiline
        autoCapitalize="sentences"
        error={notesError}
        testID="field-notes"
      />
    </FormDialog>
  );
}
