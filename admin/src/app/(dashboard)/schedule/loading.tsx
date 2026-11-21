import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Загрузка">
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-56" />
      <Skeleton className="mb-4 h-8 w-96 max-w-full" />
      <Skeleton className="h-[32rem] w-full rounded-xl" />
    </div>
  );
}
