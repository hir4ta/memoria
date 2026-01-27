import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type DecisionsQueryParams,
  getDecisions,
  getDecisionsPaginated,
} from "@/lib/api";

export function useDecisions(params: DecisionsQueryParams = {}) {
  const { page = 1, limit = 20, tag, search, paginate = true } = params;

  return useQuery({
    queryKey: ["decisions", { page, limit, tag, search, paginate }],
    queryFn: () =>
      paginate
        ? getDecisionsPaginated({ page, limit, tag, search })
        : getDecisions().then((data) => ({
            data,
            pagination: {
              page: 1,
              limit: data.length,
              total: data.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          })),
  });
}

export function useInvalidateDecisions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["decisions"] });
}
