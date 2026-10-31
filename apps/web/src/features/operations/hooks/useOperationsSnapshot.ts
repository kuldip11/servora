import { useQuery } from "@tanstack/react-query";
import { operationsSnapshotQuery } from "@/features/operations/query-options";

export const useOperationsSnapshot = () => useQuery(operationsSnapshotQuery());
