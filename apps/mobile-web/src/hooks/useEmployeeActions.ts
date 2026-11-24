import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

/**
 * Pre-wired employee mutations with cache invalidation. `employees` is a
 * router — `pathFilter()` invalidates list/get queries *and* the nested
 * `employees.relationships` queries, so the directory, the profile and the
 * relation panel refresh together.
 */
export function useEmployeeActions() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries(trpc.employees.pathFilter());
  }, [queryClient, trpc]);

  const create = useMutation(
    trpc.employees.create.mutationOptions({ onSuccess: invalidate }),
  );
  const update = useMutation(
    trpc.employees.update.mutationOptions({ onSuccess: invalidate }),
  );
  const remove = useMutation(
    trpc.employees.remove.mutationOptions({ onSuccess: invalidate }),
  );
  const createRelationship = useMutation(
    trpc.employees.relationships.create.mutationOptions({ onSuccess: invalidate }),
  );

  return { create, update, remove, createRelationship, invalidate };
}
