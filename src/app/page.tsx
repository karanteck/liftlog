import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-lg mx-auto mt-12 px-6">
        <div className="overflow-hidden rounded-2xl">
          <Image
            src="/hero.jpeg"
            alt="LiftLog"
            width={600}
            height={800}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      </div>

      <div className="mt-8 text-center px-6">
        <h1 className="text-3xl font-bold tracking-tight">LiftLog</h1>
        <p className="mt-2 text-muted-foreground">Track your lifts — coming soon.</p>
      </div>
    </div>
  );
}
