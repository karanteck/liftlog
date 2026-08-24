import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ExerciseHistoryLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-5 w-40" />
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>

        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
