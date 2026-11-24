import type {
  actionItems,
  conversations,
  employeeRelationships,
  employees,
  masterDataEntries,
} from "./db/schema";

/** Row types (SELECT shape). */
export type Employee = typeof employees.$inferSelect;
export type EmployeeRelationship = typeof employeeRelationships.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type MasterDataEntry = typeof masterDataEntries.$inferSelect;

/** Insert types (CREATE shape, ids/timestamps optional). */
export type NewEmployee = typeof employees.$inferInsert;
export type NewEmployeeRelationship = typeof employeeRelationships.$inferInsert;
export type NewConversation = typeof conversations.$inferInsert;
export type NewActionItem = typeof actionItems.$inferInsert;
export type NewMasterDataEntry = typeof masterDataEntries.$inferInsert;

/**
 * Master data entry enriched with a cross-table usage count ("Verwendet von"):
 * how many rows in the referencing table (employees, employee_relationships,
 * conversations, action_items) point at this entry.
 */
export interface MasterDataEntryWithUsage extends MasterDataEntry {
  usageCount: number;
}
