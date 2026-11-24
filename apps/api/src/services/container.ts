import type { AppDatabaseHandle } from "@mgmt/shared";
import { ensureEmbeddingsTable } from "@mgmt/shared";
import type { AppConfig } from "../config";
import { ActionItemRepository } from "../modules/action-items/repository";
import { ActionItemService } from "../modules/action-items/service";
import { ConversationRepository } from "../modules/conversations/repository";
import { ConversationService } from "../modules/conversations/service";
import { EmployeeRepository } from "../modules/employees/repository";
import { EmployeeService } from "../modules/employees/service";
import { MasterDataRepository } from "../modules/master-data/repository";
import { MasterDataService } from "../modules/master-data/service";
import { AIService } from "./ai.service";
import { AssistantService } from "./assistant.service";

export interface Services {
  employees: EmployeeService;
  conversations: ConversationService;
  actionItems: ActionItemService;
  assistant: AssistantService;
  masterData: MasterDataService;
}

/** Dependency container: wires repositories, services, and the AI co-pilot. */
export function createServices(handle: AppDatabaseHandle, config: AppConfig): Services {
  const employeeRepo = new EmployeeRepository(handle.db);
  const conversationRepo = new ConversationRepository(handle.db);
  const actionItemRepo = new ActionItemRepository(handle.db);

  if (handle.vectorAvailable) {
    ensureEmbeddingsTable(handle.sqlite);
  }

  const ai = AIService.isConfigured(config.ai) ? new AIService(config.ai) : null;
  const assistant = new AssistantService({
    employeeRepo,
    conversationRepo,
    actionItemRepo,
    ai,
    sqlite: handle.sqlite,
    vectorAvailable: handle.vectorAvailable,
  });

  return {
    employees: new EmployeeService(employeeRepo),
    conversations: new ConversationService(conversationRepo, employeeRepo),
    actionItems: new ActionItemService(actionItemRepo, employeeRepo, conversationRepo),
    assistant,
    masterData: new MasterDataService(new MasterDataRepository(handle.db)),
  };
}
