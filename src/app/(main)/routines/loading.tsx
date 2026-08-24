import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function RoutinesLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Routines</h1>
        <Skeleton className="h-9 w-28 rounded-md" />
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-5" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
