import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Analytics</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
