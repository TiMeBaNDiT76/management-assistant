import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

/**
 * Pre-wired master data mutations with cache invalidation. `masterData` is a
 * router — `pathFilter()` invalidates every list/get query underneath, so the
 * overview counters refresh together with the editor data.
 */
export function useMasterDataActions() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries(trpc.masterData.pathFilter());
  }, [queryClient, trpc]);

  const create = useMutation(
    trpc.masterData.create.mutationOptions({ onSuccess: invalidate }),
  );
  const update = useMutation(
    trpc.masterData.update.mutationOptions({ onSuccess: invalidate }),
  );
  const deactivate = useMutation(
    trpc.masterData.deactivate.mutationOptions({ onSuccess: invalidate }),
  );
  const activate = useMutation(
    trpc.masterData.activate.mutationOptions({ onSuccess: invalidate }),
  );
  const remove = useMutation(
    trpc.masterData.remove.mutationOptions({ onSuccess: invalidate }),
  );

  return { create, update, deactivate, activate, remove, invalidate };
}
