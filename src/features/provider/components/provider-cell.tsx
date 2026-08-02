"use client";

import { CheckCircle2Icon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { formatSpecialty, providerFullName, type Provider } from "../provider.types";

/**
 * The identity cell: initials, name, credentials and specialty in one column.
 *
 * This is exactly the kind of presentation a generic `{ field: "name" }` column
 * generator cannot express, and the reason the table engine accepts ordinary
 * TanStack column definitions rather than a restricted config format.
 */
export function ProviderCell({ provider }: { provider: Provider }) {
  const name = providerFullName(provider);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="text-xs">
          {`${provider.firstName[0] ?? ""}${provider.lastName[0] ?? ""}`.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{name}</span>

          {provider.credentials.length > 0 ? (
            <span className="text-muted-foreground shrink-0 text-xs">
              {provider.credentials.join(", ")}
            </span>
          ) : null}

          {provider.acceptingNewPatients ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2Icon
                  className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-label="Accepting new patients"
                />
              </TooltipTrigger>
              <TooltipContent>Accepting new patients</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <p className="text-muted-foreground truncate text-xs">
          {formatSpecialty(provider.specialty)}
        </p>
      </div>
    </div>
  );
}

/** Card renderer for narrow screens, where a six-column table is unusable. */
export function ProviderMobileCard({ provider }: { provider: Provider }) {
  return (
    <div className="rounded-lg border p-4">
      <ProviderCell provider={provider} />

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">NPI</dt>
          <dd className="font-mono">{provider.npi}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Facility</dt>
          <dd className="truncate">{provider.facilityName ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
