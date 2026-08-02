"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPinIcon } from "lucide-react";

import type { CustomFilterProps } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";

import { fetchFacilityStates } from "../facility.api";

/**
 * A custom filter: the state list comes from the API, not a hard-coded array.
 *
 * This is what `type: "custom"` is for. The filter schema covers select,
 * multi-select, text, boolean and dates; trying to also express "fetch the
 * options from this endpoint, with this cache key" would have pushed the config
 * format towards being a programming language. A component is clearer.
 *
 * It receives the current value and a setter from the table engine, so it still
 * writes to the URL and resets pagination like every other filter.
 */
export function FacilityStateFilter({ value, onChange }: CustomFilterProps) {
  const { data: states = [], isPending } = useQuery({
    queryKey: ["facility", "states"],
    queryFn: ({ signal }) => fetchFacilityStates(clientApi, signal),
    // Reference data — refetching it on every mount would be wasteful.
    staleTime: 30 * 60_000,
  });

  const selected = typeof value === "string" ? value : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-dashed">
          <MapPinIcon className="size-3.5" />
          <span className="text-muted-foreground text-xs">State</span>
          {selected ?? "Any"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[12rem] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search states…" />
          <CommandList>
            <CommandEmpty>{isPending ? "Loading…" : "No states found."}</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => onChange(undefined)}>
                <span className={cn(!selected && "font-medium")}>All states</span>
              </CommandItem>

              {states.map((state) => (
                <CommandItem
                  key={state}
                  value={state}
                  onSelect={() => onChange(state === selected ? undefined : state)}
                >
                  <span className={cn(state === selected && "font-medium")}>{state}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
