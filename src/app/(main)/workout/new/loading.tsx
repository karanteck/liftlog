import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function NewWorkoutLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Start Workout</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-52" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
