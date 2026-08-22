"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button>;

export function SignOutButton({ children, ...props }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button onClick={handleSignOut} variant="outline" {...props}>
      {children ?? "Sign out"}
    </Button>
  );
}
