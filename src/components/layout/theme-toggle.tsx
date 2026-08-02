"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The hydration flag never changes after mount, so there is nothing to subscribe to. */
function subscribeToNothing(): () => void {
  return () => {};
}

const OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

/**
 * Light / dark / system switcher.
 *
 * Renders a placeholder until mounted: the resolved theme is unknown during SSR,
 * and rendering the wrong icon then correcting it produces a hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // `useSyncExternalStore` is the supported way to ask "are we hydrated yet?".
  // The server snapshot is `false` and the client snapshot `true`, so React
  // renders the placeholder on the server and swaps after hydration — without
  // the extra render pass a `useEffect` + `setState` would cause.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled />;
  }

  const Active = OPTIONS.find((option) => option.value === theme)?.icon ?? MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Active />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-36">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem key={option.value} onSelect={() => setTheme(option.value)}>
              <Icon />
              {option.label}
              {theme === option.value ? <CheckIcon className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
