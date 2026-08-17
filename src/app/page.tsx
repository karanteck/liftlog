import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">LiftLog</h1>
      <p className="mt-2 text-muted-foreground">Workout tracker — coming soon.</p>
    </div>
  );
}
