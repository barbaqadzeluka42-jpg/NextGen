"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" aria-label={dark ? "ღია თემა" : "მუქი თემა"} onClick={() => setTheme(dark ? "light" : "dark")}>
      {mounted ? dark ? <Sun /> : <Moon /> : <span className="size-4" />}
    </Button>
  );
}
