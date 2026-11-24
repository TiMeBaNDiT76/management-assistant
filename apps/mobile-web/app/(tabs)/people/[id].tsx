import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { PersonFormDialog } from "../../../components/people/PersonFormDialog";
import { RelationshipFormDialog } from "../../../components/people/RelationshipFormDialog";
import { StatusChip } from "../../../components/StatusChip";
import { AppButton } from "../../../components/stammdaten/AppButton";
import { EditorHeader } from "../../../components/stammdaten/EditorHeader";
import { EmptyState, ErrorState } from "../../../components/stammdaten/EmptyState";
import { initialsForName } from "../../../src/lib/initials";
import { formatIsoDate } from "../../../src/lib/master-data-ui";
import {
  PEOPLE_MAX_ROWS,
  getEmployeeErrorMessage,
  resolveMasterDataLabel,
} from "../../../src/lib/people-ui";
import { useTRPC } from "../../../src/lib/trpc";
import { colors } from "../../../src/theme/tokens";

function SectionCard({
  title,
  subtitle,
  action,
  testID,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  testID?: string;
  children: ReactNode;
}) {
  return (
    <View
      className="rounded-mudlg border border-divider bg-surface p-4"
      style={{ gap: 12 }}
      testID={testID}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold" style={{ color: colors.ink }}>
            {title}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: colors.inkSecondary }}>
            {subtitle}
          </Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

/**
 * Person detail / "Character Sheet" (see /mockups/050-people/character-sheet.html):
 * profile head, relationships from the `employee_relationships` module, the
 * current deployment location and notes. "Bearbeiten" opens the shared profile
 * form. Attribute & Skills and the relationship graph are later stages (no
 * data model yet).
 */
export default function PersonDetailScreen() {
  const trpc = useTRPC();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const hasId = id !== "";

  const [editOpen, setEditOpen] = useState(false);
  const [relationshipOpen, setRelationshipOpen] = useState(false);

  const employeeQuery = useQuery({
    ...trpc.employees.getById.queryOptions(id),
    enabled: hasId,
  });
  const directoryQuery = useQuery(
    trpc.employees.list.queryOptions({ limit: PEOPLE_MAX_ROWS }),
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
  const relationshipTypesQuery = useQuery(
    trpc.masterData.list.queryOptions({ category: "relationship_type", includeInactive: true }),
  );
  const relationshipsQuery = useQuery({
    ...trpc.employees.relationships.list.queryOptions({
      employeeId: id,
      limit: PEOPLE_MAX_ROWS,
    }),
    enabled: hasId,
  });

  const directory = useMemo(() => directoryQuery.data ?? [], [directoryQuery.data]);
  const roles = rolesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const relationshipTypes = relationshipTypesQuery.data ?? [];

  const employee = employeeQuery.data;

  const relationRows = useMemo(() => {
    const partnerById = new Map(directory.map((person) => [person.id, person]));
    return (relationshipsQuery.data ?? []).flatMap((relation) => {
      const partnerId =
        relation.fromEmployeeId === id ? relation.toEmployeeId : relation.fromEmployeeId;
      const partner = partnerById.get(partnerId);
      return partner ? [{ relation, partner }] : [];
    });
  }, [relationshipsQuery.data, directory, id]);

  if (!hasId) {
    return (
      <View className="flex-1 bg-canvas px-4 pt-12">
        <EmptyState
          title="Person nicht gefunden."
          description="Die Person wurde möglicherweise gelöscht oder der Link ist ungültig."
          actionLabel="Zurück zur Mitarbeiterliste"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  if (employeeQuery.isError) {
    return (
      <View className="flex-1 bg-canvas px-4 pt-12">
        <ErrorState
          message={getEmployeeErrorMessage(employeeQuery.error)}
          onRetry={() => employeeQuery.refetch()}
        />
      </View>
    );
  }

  if (!employee) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="text-sm" style={{ color: colors.inkSecondary }}>
          Mitarbeiter wird geladen…
        </Text>
      </View>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const roleLabel = resolveMasterDataLabel(roles, employee.role);
  const departmentLabel = resolveMasterDataLabel(departments, employee.department);
  const locationLabel = resolveMasterDataLabel(locations, employee.location);
  const locationEntry = locations.find((entry) => entry.key === employee.location);
  const metaLine = [departmentLabel, roleLabel].filter(Boolean).join(" · ");
  const subtitle = metaLine || employee.email || "Persönliches Profil, Beziehungen und Einsatz";
  const candidates = directory.filter((person) => person.id !== id);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <EditorHeader
        eyebrow="People · Mitarbeiterprofil"
        title={fullName}
        subtitle={subtitle}
        actionLabel="Bearbeiten"
        onAction={() => setEditOpen(true)}
        actionTestID="person-edit"
      />

      <View className="px-4" style={{ gap: 12 }}>
        <View
          className="flex-row items-center gap-4 rounded-mudlg border border-divider bg-surface p-4"
          testID="person-profile"
        >
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: colors.primary.soft,
              borderWidth: 1,
              borderColor: colors.divider,
            }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.primary.dark }}>
              {initialsForName(employee.firstName, employee.lastName)}
            </Text>
          </View>
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className="text-sm" style={{ color: colors.ink }}>
              {employee.email ?? "Keine E-Mail hinterlegt"}
            </Text>
            <Text className="text-xs" style={{ color: colors.inkSecondary }}>
              {metaLine || "Keine Rolle oder Abteilung hinterlegt"}
            </Text>
            {employee.hireDate ? (
              <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                Eintrittsdatum {formatIsoDate(employee.hireDate)}
              </Text>
            ) : null}
          </View>
          {locationLabel ? (
            <View className="shrink">
              <StatusChip label={locationLabel} color={locationEntry?.colorHex ?? undefined} />
            </View>
          ) : null}
        </View>

        <SectionCard
          title="Beziehungen"
          subtitle="Verknüpfungen im Mitarbeiterstamm"
          testID="person-relationships"
          action={
            <AppButton
              label="＋ Beziehung hinzufügen"
              variant="outlined"
              onPress={() => setRelationshipOpen(true)}
            />
          }
        >
          {relationshipsQuery.isPending ? (
            <Text className="text-sm" style={{ color: colors.inkSecondary }}>
              Beziehungen werden geladen…
            </Text>
          ) : relationshipsQuery.isError ? (
            <ErrorState
              message="Beziehungen konnten nicht geladen werden."
              onRetry={() => relationshipsQuery.refetch()}
            />
          ) : relationRows.length === 0 ? (
            <EmptyState
              title="Noch keine Beziehungen hinterlegt."
              description="Verknüpfe Kolleg:innen, Stakeholder oder Mentor:innen — die Typen kommen aus den Stammdaten."
              actionLabel="Beziehung hinzufügen"
              onPress={() => setRelationshipOpen(true)}
            />
          ) : (
            relationRows.map(({ relation, partner }) => (
              <View
                key={relation.id}
                className="flex-row items-center gap-3 rounded-mud border border-divider p-2.5"
                testID={`relation-row-${relation.id}`}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.primary.soft }}
                >
                  <Text className="text-xs font-bold" style={{ color: colors.primary.dark }}>
                    {initialsForName(partner.firstName, partner.lastName)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: colors.ink }}>
                    {`${partner.firstName} ${partner.lastName}`}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                    {resolveMasterDataLabel(roles, partner.role) ?? "Keine Rolle hinterlegt"}
                  </Text>
                </View>
                <Text className="text-xs font-semibold" style={{ color: colors.primary.DEFAULT }}>
                  {resolveMasterDataLabel(relationshipTypes, relation.type) ?? relation.type}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Einsatz"
          subtitle="Aktueller Einsatzstandort"
          testID="person-deployment"
        >
          {locationLabel ? (
            <View className="flex-row items-center gap-3">
              <View className="flex-1" style={{ gap: 4 }}>
                <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                  {locationLabel}
                </Text>
                {locationEntry?.description ? (
                  <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                    {locationEntry.description}
                  </Text>
                ) : null}
                <Text className="text-xs" style={{ color: colors.inkSecondary }}>
                  {locationEntry?.countryIso
                    ? `Land: ${locationEntry.countryIso}`
                    : "Kein Land zugeordnet"}
                </Text>
              </View>
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${locationEntry?.colorHex ?? colors.primary.DEFAULT}1F`,
                }}
              >
                <Text style={{ fontSize: 20, color: locationEntry?.colorHex ?? colors.primary.DEFAULT }}>
                  ⌖
                </Text>
              </View>
            </View>
          ) : (
            <EmptyState
              title="Kein Einsatzstandort hinterlegt."
              description="Wähle einen Standort aus den Stammdaten — er erscheint in der Mitarbeiterliste."
              actionLabel="Standort wählen"
              onPress={() => setEditOpen(true)}
            />
          )}
        </SectionCard>

        <SectionCard title="Notizen" subtitle="Persönliche Anmerkungen" testID="person-notes">
          {employee.notes ? (
            <Text className="text-sm" style={{ color: colors.ink, lineHeight: 20 }}>
              {employee.notes}
            </Text>
          ) : (
            <Text className="text-sm" style={{ color: colors.inkSecondary }}>
              Keine Notizen hinterlegt.
            </Text>
          )}
        </SectionCard>
      </View>

      <PersonFormDialog
        visible={editOpen}
        employee={employee}
        onClose={() => setEditOpen(false)}
      />

      <RelationshipFormDialog
        visible={relationshipOpen}
        fromEmployeeId={employee.id}
        fromEmployeeName={fullName}
        candidates={candidates}
        onClose={() => setRelationshipOpen(false)}
      />
    </ScrollView>
  );
}
