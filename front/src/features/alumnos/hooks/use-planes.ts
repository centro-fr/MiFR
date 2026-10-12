import { useQuery } from "@tanstack/react-query";
import { listarPlanes } from "../api/planes-api";

export const PLANES_QUERY_KEY = ["planes"] as const;

export function usePlanes() {
  return useQuery({
    queryKey: PLANES_QUERY_KEY,
    queryFn: () => listarPlanes(true),
    staleTime: 5 * 60_000,
  });
}
