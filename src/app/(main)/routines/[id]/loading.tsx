import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EditRoutineLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-9 w-16 rounded-md" />
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
