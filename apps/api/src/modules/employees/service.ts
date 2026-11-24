import { TRPCError } from "@trpc/server";
import type {
  Employee,
  EmployeeRelationship,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  ListEmployeesInput,
  ListRelationshipsInput,
  RelationshipCreateInput,
} from "@mgmt/shared";
import type { EmployeeRepository } from "./repository";

/**
 * Employee domain service: business rules on top of the repository.
 * Throws tRPC errors that the router surfaces to the client as-is.
 */
export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository) {}

  async list(ownerUserId: string, input: ListEmployeesInput): Promise<Employee[]> {
    return this.repo.list(ownerUserId, input);
  }

  async get(ownerUserId: string, id: string): Promise<Employee> {
    const employee = await this.repo.findById(ownerUserId, id);
    if (!employee) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Employee ${id} not found` });
    }
    return employee;
  }

  async create(ownerUserId: string, input: EmployeeCreateInput): Promise<Employee> {
    if (input.email) {
      const existing = await this.repo.findByEmail(ownerUserId, input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An employee with this email already exists",
        });
      }
    }
    return this.repo.create({
      id: crypto.randomUUID(),
      ownerUserId,
      ...input,
    });
  }

  async update(
    ownerUserId: string,
    id: string,
    input: EmployeeUpdateInput,
  ): Promise<Employee> {
    const employee = await this.repo.findById(ownerUserId, id);
    if (!employee) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Employee ${id} not found` });
    }
    const updated = await this.repo.update(ownerUserId, id, input);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const removed = await this.repo.remove(ownerUserId, id);
    if (!removed) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Employee ${id} not found` });
    }
    return removed;
  }

  // --- Relationships ---------------------------------------------------------

  async createRelationship(
    ownerUserId: string,
    input: RelationshipCreateInput,
  ): Promise<EmployeeRelationship> {
    const [from, to] = await Promise.all([
      this.repo.findById(ownerUserId, input.fromEmployeeId),
      this.repo.findById(ownerUserId, input.toEmployeeId),
    ]);
    if (!from || !to) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Both employees must exist in your workspace",
      });
    }
    return this.repo.createRelationship({
      ...input,
      ownerUserId,
      id: crypto.randomUUID(),
    });
  }

  async listRelationships(
    ownerUserId: string,
    input: ListRelationshipsInput,
  ): Promise<EmployeeRelationship[]> {
    return this.repo.listRelationships(ownerUserId, input);
  }
}
