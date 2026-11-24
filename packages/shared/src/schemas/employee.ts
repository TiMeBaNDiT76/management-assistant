import { z } from "zod";
import { paginationSchema } from "./common";

export const employeeCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email().max(320).optional(),
  role: z.string().max(120).optional(),
  department: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  hireDate: z.iso.date().optional(), // YYYY-MM-DD
  notes: z.string().max(10_000).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export const listEmployeesSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type ListEmployeesInput = z.infer<typeof listEmployeesSchema>;
