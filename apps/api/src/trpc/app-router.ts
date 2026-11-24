import { router } from "./trpc";
import { actionItemRouter } from "../modules/action-items/router";
import { assistantRouter } from "../modules/assistant/router";
import { conversationRouter } from "../modules/conversations/router";
import { employeeRouter } from "../modules/employees/router";

/**
 * Root tRPC router. Extend with new domain routers (OKRs, calendar, ...) —
 * keep each domain in `modules/<domain>/` with router/service/repository.
 */
export const appRouter = router({
  employees: employeeRouter,
  conversations: conversationRouter,
  actionItems: actionItemRouter,
  assistant: assistantRouter,
});

export type AppRouter = typeof appRouter;
