import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function BodyweightLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Bodyweight</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
