/**
 * Clearly fictional sample data used by the scaffold screens until they are
 * wired to the tRPC API (see AGENTS.md — never use real employee names).
 */

export interface SampleEmployee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  location: string;
}

export interface SampleConversation {
  id: string;
  employeeName: string;
  type: "one_on_one" | "feedback" | "career" | "adhoc";
  scheduledAt: string; // display string on purpose (scaffold)
  mood: number; // 1..5
  status: "planned" | "completed" | "cancelled";
}

export interface SampleActionItem {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done" | "cancelled";
  dueDate: string; // display string on purpose (scaffold)
}

export const sampleEmployees: SampleEmployee[] = [
  {
    id: "1",
    firstName: "Lena",
    lastName: "Fischer",
    role: "Senior Consultant",
    location: "Berlin",
  },
  {
    id: "2",
    firstName: "Tom",
    lastName: "Weber",
    role: "Junior Analyst",
    location: "Remote",
  },
  {
    id: "3",
    firstName: "Mara",
    lastName: "Santos",
    role: "Team Lead",
    location: "Kundenstandort",
  },
];

export const sampleConversations: SampleConversation[] = [
  {
    id: "c1",
    employeeName: "Lena Fischer",
    type: "one_on_one",
    scheduledAt: "Mo, 10:00",
    mood: 4,
    status: "planned",
  },
  {
    id: "c2",
    employeeName: "Tom Weber",
    type: "feedback",
    scheduledAt: "Di, 14:30",
    mood: 3,
    status: "planned",
  },
  {
    id: "c3",
    employeeName: "Mara Santos",
    type: "career",
    scheduledAt: "Fr, 09:00",
    mood: 5,
    status: "completed",
  },
];

export const sampleActionItems: SampleActionItem[] = [
  { id: "a1", title: "Vorbereitung Jahresgespräch Lena", status: "open", dueDate: "01.12." },
  { id: "a2", title: "Feedback zu Onboarding-Plan senden", status: "in_progress", dueDate: "27.11." },
  { id: "a3", title: "Team-Retros abstimmen", status: "done", dueDate: "20.11." },
];
