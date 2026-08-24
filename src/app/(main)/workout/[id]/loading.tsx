import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkoutLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-11 w-20" />
                    <Skeleton className="h-11 w-16" />
                    <Skeleton className="h-12 w-12 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
