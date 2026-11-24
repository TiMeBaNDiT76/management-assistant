import type { actionItems, conversations, employeeRelationships, employees } from "./db/schema";

/** Row types (SELECT shape). */
export type Employee = typeof employees.$inferSelect;
export type EmployeeRelationship = typeof employeeRelationships.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;

/** Insert types (CREATE shape, ids/timestamps optional). */
export type NewEmployee = typeof employees.$inferInsert;
export type NewEmployeeRelationship = typeof employeeRelationships.$inferInsert;
export type NewConversation = typeof conversations.$inferInsert;
export type NewActionItem = typeof actionItems.$inferInsert;
