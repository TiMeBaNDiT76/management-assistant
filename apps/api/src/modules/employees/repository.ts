import { and, asc, eq, like, or } from "drizzle-orm";
import type { AppDatabase } from "@mgmt/shared";
import { employeeRelationships, employees } from "@mgmt/shared";
import type {
  Employee,
  EmployeeRelationship,
  EmployeeUpdateInput,
  ListEmployeesInput,
  ListRelationshipsInput,
  NewEmployee,
  RelationshipCreateInput,
} from "@mgmt/shared";

export interface EmployeePatch extends EmployeeUpdateInput {
  updatedAt: string;
}

export interface RelationshipPatch {
  type?: RelationshipCreateInput["type"];
  notes?: string;
}

/**
 * Employee + relationship repository. Every method takes the tenant id
 * (`ownerUserId`) explicitly and scopes all queries to it.
 */
export class EmployeeRepository {
  constructor(private readonly db: AppDatabase) {}

  async create(data: NewEmployee & { ownerUserId: string }): Promise<Employee> {
    const [row] = await this.db
      .insert(employees)
      .values({
        ...data,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      })
      .returning();
    if (!row) throw new Error("Employee insert returned no row");
    return row;
  }

  async list(ownerUserId: string, options: ListEmployeesInput): Promise<Employee[]> {
    const conditions = [eq(employees.ownerUserId, ownerUserId)];
    if (options.search) {
      const pattern = `%${options.search}%`;
      const searchCondition = or(
        like(employees.firstName, pattern),
        like(employees.lastName, pattern),
        like(employees.email, pattern),
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    return this.db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(asc(employees.lastName), asc(employees.firstName))
      .limit(options.limit)
      .offset(options.offset);
  }

  async findById(ownerUserId: string, id: string): Promise<Employee | null> {
    const [row] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.ownerUserId, ownerUserId)))
      .limit(1);
    return row ?? null;
  }

  async findByEmail(ownerUserId: string, email: string): Promise<Employee | null> {
    const [row] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.email, email), eq(employees.ownerUserId, ownerUserId)))
      .limit(1);
    return row ?? null;
  }

  async update(
    ownerUserId: string,
    id: string,
    patch: EmployeeUpdateInput,
  ): Promise<Employee | null> {
    const [row] = await this.db
      .update(employees)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(employees.id, id), eq(employees.ownerUserId, ownerUserId)))
      .returning();
    return row ?? null;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const result = await this.db
      .delete(employees)
      .where(and(eq(employees.id, id), eq(employees.ownerUserId, ownerUserId)))
      .run();
    return result.changes > 0;
  }

  // --- Relationships ---------------------------------------------------------

  async createRelationship(
    data: RelationshipCreateInput & { ownerUserId: string; id: string },
  ): Promise<EmployeeRelationship> {
    const [row] = await this.db
      .insert(employeeRelationships)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
      })
      .returning();
    if (!row) throw new Error("Relationship insert returned no row");
    return row;
  }

  async listRelationships(
    ownerUserId: string,
    options: ListRelationshipsInput,
  ): Promise<EmployeeRelationship[]> {
    const conditions = [eq(employeeRelationships.ownerUserId, ownerUserId)];
    if (options.employeeId) {
      const related = or(
        eq(employeeRelationships.fromEmployeeId, options.employeeId),
        eq(employeeRelationships.toEmployeeId, options.employeeId),
      );
      if (related) conditions.push(related);
    }
    return this.db
      .select()
      .from(employeeRelationships)
      .where(and(...conditions))
      .orderBy(asc(employeeRelationships.createdAt))
      .limit(options.limit)
      .offset(options.offset);
  }

  async deleteRelationship(
    ownerUserId: string,
    id: string,
  ): Promise<boolean> {
    const result = await this.db
      .delete(employeeRelationships)
      .where(
        and(eq(employeeRelationships.id, id), eq(employeeRelationships.ownerUserId, ownerUserId)),
      )
      .run();
    return result.changes > 0;
  }
}
