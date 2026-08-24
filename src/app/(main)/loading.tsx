import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function HomeLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-48 mt-1" />
      </header>

      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full space-y-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 px-4">
            <Skeleton className="h-14 w-full rounded-md" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-3 px-2 flex flex-col items-center gap-1">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-14" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>

        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
