import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function MoreLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-4 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-5" />
            </CardContent>
          </Card>
        ))}

        <div className="pt-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </main>
    </div>
  );
}
