"use client";

import Link from "next/link";
import { ArrowRightIcon, BedIcon, NetworkIcon, StethoscopeIcon } from "lucide-react";

import { DetailGrid, DetailItem } from "@/components/detail-view";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatPhone } from "@/lib/formatters";
import type { ResourceDetailViewProps } from "@/framework/resource";

import {
  facilityStatusMap,
  formatAddress,
  formatFacilityType,
  type Facility,
} from "../facility.types";

/**
 * Custom Facility detail view (details Mode 2).
 *
 * The standard `sections` config renders label/value grids, which is right for
 * Provider. Facility wants a statistics row and links into related modules, so
 * it supplies a component instead.
 *
 * The page engine still owns everything around this: permission check, loading,
 * the 404 state, the header, breadcrumbs, the edit button and the actions menu.
 * Only the body changes.
 */
export function FacilityDetails({ entity: facility }: ResourceDetailViewProps<Facility>) {
  const stats = [
    {
      label: "Providers",
      value: facility.providerCount,
      icon: StethoscopeIcon,
      href: `/providers?facilityId=${facility.id}`,
    },
    {
      label: "Departments",
      value: facility.departmentCount,
      icon: NetworkIcon,
      href: `/departments?facilityId=${facility.id}`,
    },
    { label: "Beds", value: facility.bedCount, icon: BedIcon, href: undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          const card = (
            <Card className="h-full">
              <CardContent className="flex items-center gap-4">
                <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tabular-nums">
                    {stat.value === null ? "—" : formatNumber(stat.value)}
                  </p>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </div>
                {stat.href ? (
                  <ArrowRightIcon className="text-muted-foreground ml-auto size-4 shrink-0" />
                ) : null}
              </CardContent>
            </Card>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="group">
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facility information</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid columns={2}>
            <DetailItem label="Name">{facility.name}</DetailItem>
            <DetailItem label="Code">
              <span className="font-mono">{facility.code}</span>
            </DetailItem>
            <DetailItem label="Type">{formatFacilityType(facility.type)}</DetailItem>
            <DetailItem label="Status">
              <StatusBadge status={facility.status} map={facilityStatusMap} />
            </DetailItem>
            <DetailItem label="Opened">{formatDate(facility.openedOn)}</DetailItem>
            <DetailItem label="Phone">
              {facility.phone ? (
                <a href={`tel:${facility.phone}`} className="underline-offset-4 hover:underline">
                  {formatPhone(facility.phone)}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <address className="text-sm not-italic">
            {facility.address.line1}
            {facility.address.line2 ? (
              <>
                <br />
                {facility.address.line2}
              </>
            ) : null}
            <br />
            {facility.address.city}, {facility.address.state} {facility.address.postalCode}
            <br />
            {facility.address.country}
          </address>

          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(formatAddress(facility.address))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Maps
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
