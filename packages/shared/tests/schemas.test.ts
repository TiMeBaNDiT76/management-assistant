import { describe, expect, it } from "vitest";
import {
  actionItemCreateSchema,
  conversationCreateSchema,
  employeeCreateSchema,
  listEmployeesSchema,
  relationshipCreateSchema,
} from "../src/schemas";

describe("employeeCreateSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = employeeCreateSchema.safeParse({
      firstName: "Alex",
      lastName: "Muster",
      email: "alex@example.com",
      hireDate: "2024-04-01",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const parsed = employeeCreateSchema.safeParse({
      firstName: "Alex",
      lastName: "Muster",
      email: "not-an-email",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing firstName", () => {
    const parsed = employeeCreateSchema.safeParse({ lastName: "Muster" });
    expect(parsed.success).toBe(false);
  });
});

describe("listEmployeesSchema", () => {
  it("applies pagination defaults", () => {
    const parsed = listEmployeesSchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });
});

describe("conversationCreateSchema", () => {
  it("applies type and status defaults", () => {
    const parsed = conversationCreateSchema.parse({
      employeeId: crypto.randomUUID(),
      scheduledAt: "2026-02-02T09:00:00Z",
    });
    expect(parsed.type).toBe("one_on_one");
    expect(parsed.status).toBe("planned");
  });

  it("rejects mood outside 1..5", () => {
    const parsed = conversationCreateSchema.safeParse({
      employeeId: crypto.randomUUID(),
      scheduledAt: "2026-02-02T09:00:00Z",
      mood: 6,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid datetime", () => {
    const parsed = conversationCreateSchema.safeParse({
      employeeId: crypto.randomUUID(),
      scheduledAt: "tomorrow",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("relationshipCreateSchema", () => {
  it("rejects self-relationships", () => {
    const id = crypto.randomUUID();
    const parsed = relationshipCreateSchema.safeParse({
      fromEmployeeId: id,
      toEmployeeId: id,
      type: "peer",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a reports_to relationship", () => {
    const parsed = relationshipCreateSchema.safeParse({
      fromEmployeeId: crypto.randomUUID(),
      toEmployeeId: crypto.randomUUID(),
      type: "reports_to",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("actionItemCreateSchema", () => {
  it("keeps status optional on create", () => {
    const parsed = actionItemCreateSchema.parse({ title: "Prepare feedback talk" });
    expect(parsed.status).toBeUndefined();
  });

  it("rejects unknown status values", () => {
    const parsed = actionItemCreateSchema.safeParse({
      title: "Prepare feedback talk",
      status: "archived",
    });
    expect(parsed.success).toBe(false);
  });
});
