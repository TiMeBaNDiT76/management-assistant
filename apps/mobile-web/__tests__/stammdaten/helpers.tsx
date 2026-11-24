/**
 * Shared test helpers for the Stammdaten screens.
 *
 * Mock strategy: only `useTRPC` is replaced — every test file installs a
 * stub whose `queryOptions`/`mutationOptions` produce real React Query
 * options. Queries and mutations then run through a genuine QueryClient
 * (retry disabled), so pending/success/error states, invalidation and
 * `mutateAsync` rejections behave exactly like in production.
 */
import { afterEach } from "@jest/globals";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  type RenderResult,
} from "@testing-library/react-native";
import type { TestInstance } from "test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import type { MasterDataCategory, MasterDataEntryWithUsage } from "@mgmt/shared";

export type MasterDataEntryOverrides = Partial<MasterDataEntryWithUsage>;

let entryCounter = 0;

/** Builds a MasterDataEntryWithUsage with placeholder data (no real names). */
export function makeEntry(
  overrides: MasterDataEntryOverrides = {},
): MasterDataEntryWithUsage {
  entryCounter += 1;
  const key = overrides.key ?? `test-entry-${entryCounter}`;
  return {
    id: overrides.id ?? `${key}-id`,
    ownerUserId: "test-owner",
    category: "role",
    key,
    displayName: `Testeintrag ${entryCounter}`,
    pluralLabel: null,
    description: null,
    colorHex: null,
    frequency: null,
    isDone: false,
    isActive: true,
    sortOrder: 0,
    countryIso: null,
    scope: null,
    date: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 0,
    ...overrides,
  };
}

/** A tRPC client error shape as thrown by `mutateAsync` on the client. */
export function trpcClientError(
  code: string,
  message: string,
): Error & { data: { code: string } } {
  return Object.assign(new Error(message), { data: { code } });
}

export interface ListInput {
  category: MasterDataCategory;
  includeInactive?: boolean;
}

type MutationHandler = (input: unknown) => Promise<MasterDataEntryWithUsage>;

export interface MasterDataTrpcStub {
  masterData: {
    list: {
      queryOptions: (input: ListInput) => {
        queryKey: unknown[];
        queryFn: () => Promise<MasterDataEntryWithUsage[]>;
      };
    };
    create: { mutationOptions: (options?: object) => object };
    update: { mutationOptions: (options?: object) => object };
    deactivate: { mutationOptions: (options?: object) => object };
    activate: { mutationOptions: (options?: object) => object };
    remove: { mutationOptions: (options?: object) => object };
    pathFilter: () => { queryKey: string[] };
  };
  setListData: (
    data: Partial<Record<MasterDataCategory, MasterDataEntryWithUsage[]>>,
  ) => void;
  setListError: (error: unknown) => void;
  listCalls: ListInput[];
  list: jest.Mock<Promise<MasterDataEntryWithUsage[]>, [ListInput]>;
  create: jest.Mock<Promise<MasterDataEntryWithUsage>, [unknown]>;
  update: jest.Mock<Promise<MasterDataEntryWithUsage>, [unknown]>;
  deactivate: jest.Mock<Promise<MasterDataEntryWithUsage>, [string]>;
  activate: jest.Mock<Promise<MasterDataEntryWithUsage>, [string]>;
  remove: jest.Mock<Promise<MasterDataEntryWithUsage>, [string]>;
}

/**
 * Builds the object returned by the mocked `useTRPC()`. Test files assign it
 * to a `mock`-prefixed binding so the jest.mock factory may reference it.
 */
export function makeTrpcStub(): MasterDataTrpcStub {
  const listData = new Map<MasterDataCategory, MasterDataEntryWithUsage[]>();
  const stub = {
    listCalls: [] as ListInput[],
    listError: null as unknown,
    setListData(data: Partial<Record<MasterDataCategory, MasterDataEntryWithUsage[]>>) {
      for (const [category, entries] of Object.entries(data)) {
        listData.set(category as MasterDataCategory, entries ?? []);
      }
    },
    setListError(error: unknown) {
      stub.listError = error;
    },
    list: jest.fn<Promise<MasterDataEntryWithUsage[]>, [ListInput]>(async (input) => {
      stub.listCalls.push({
        category: input.category,
        includeInactive: input.includeInactive,
      });
      if (stub.listError) throw stub.listError;
      return listData.get(input.category) ?? [];
    }),
    create: jest.fn<Promise<MasterDataEntryWithUsage>, [unknown]>(async () => makeEntry()),
    update: jest.fn<Promise<MasterDataEntryWithUsage>, [unknown]>(async () => makeEntry()),
    deactivate: jest.fn<Promise<MasterDataEntryWithUsage>, [string]>(async () => makeEntry()),
    activate: jest.fn<Promise<MasterDataEntryWithUsage>, [string]>(async () => makeEntry()),
    remove: jest.fn<Promise<MasterDataEntryWithUsage>, [string]>(async () => makeEntry()),
  };
  const mutationOptions = (handler: MutationHandler) =>
    (userOptions: object = {}): object => ({
      ...userOptions,
      mutationFn: (input: unknown) => handler(input),
    });
  const trpcStub: MasterDataTrpcStub = {
    masterData: {
      list: {
        queryOptions: (input: ListInput) => ({
          queryKey: ["masterData", "list", input.category, input.includeInactive ?? false],
          queryFn: () => stub.list(input),
        }),
      },
      create: { mutationOptions: mutationOptions((input) => stub.create(input)) },
      update: { mutationOptions: mutationOptions((input) => stub.update(input)) },
      deactivate: {
        mutationOptions: mutationOptions((id) =>
          stub.deactivate(id as string),
        ),
      },
      activate: {
        mutationOptions: mutationOptions((id) => stub.activate(id as string)),
      },
      remove: {
        mutationOptions: mutationOptions((id) => stub.remove(id as string)),
      },
      pathFilter: () => ({ queryKey: ["masterData"] }),
    },
    setListData: stub.setListData,
    setListError: stub.setListError,
    listCalls: stub.listCalls,
    list: stub.list,
    create: stub.create,
    update: stub.update,
    deactivate: stub.deactivate,
    activate: stub.activate,
    remove: stub.remove,
  };
  return trpcStub;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** Renders a screen inside a real QueryClientProvider backed by the stub. */
const activeQueryClients = new Set<QueryClient>();

export async function renderWithClient(
  ui: ReactElement,
  queryClient: QueryClient = createQueryClient(),
): Promise<RenderResult> {
  activeQueryClients.add(queryClient);
  return await render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

// Drop every cached query (and its gc timers) after each test so Jest can
// exit without forceExit.
afterEach(() => {
  for (const queryClient of activeQueryClients) {
    queryClient.clear();
  }
  activeQueryClients.clear();
  cleanup();
});

/**
 * Opens an OptionSelect and picks the option with the given label.
 * (Option items share one testID, so they are matched by label text.)
 */
export async function selectOption(testID: string, label: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
  let target: TestInstance | undefined;
  // Options can arrive late when they come from a list query.
  await waitFor(() => {
    const options = screen.getAllByTestId(`${testID}-option`);
    target = options.find((option) => within(option).queryByText(label));
    if (!target) {
      throw new Error(`Option "${label}" not found in "${testID}"`);
    }
  });
  await fireEvent.press(target as TestInstance);
}

export { fireEvent, screen, within };
