"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { StatusBadge, type StatusMap } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  formatBoolean,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhone,
  formatText,
} from "@/lib/formatters";

import type { DetailField } from "./detail-view";

/**
 * Field builders for the common detail shapes.
 *
 * Same principle as the column helpers: these produce ordinary `DetailField`
 * objects, so a generated field and a hand-written one are interchangeable and
 * mixing them in one section is normal.
 */

export function textField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | number | null | undefined,
  options: { fullWidth?: boolean } = {},
): DetailField<TEntity> {
  return { label, value: (entity) => formatText(value(entity)), ...options };
}

export function dateField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | Date | null | undefined,
  options: { pattern?: string } = {},
): DetailField<TEntity> {
  return { label, value: (entity) => formatDate(value(entity), { pattern: options.pattern }) };
}

export function dateTimeField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | Date | null | undefined,
): DetailField<TEntity> {
  return { label, value: (entity) => formatDateTime(value(entity)) };
}

export function booleanField<TEntity>(
  label: string,
  value: (entity: TEntity) => boolean | null | undefined,
  options: { yes?: string; no?: string } = {},
): DetailField<TEntity> {
  return { label, value: (entity) => formatBoolean(value(entity), options) };
}

export function numberField<TEntity>(
  label: string,
  value: (entity: TEntity) => number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): DetailField<TEntity> {
  return { label, value: (entity) => formatNumber(value(entity), options) };
}

export function currencyField<TEntity>(
  label: string,
  value: (entity: TEntity) => number | null | undefined,
  options: { currency?: string } = {},
): DetailField<TEntity> {
  return { label, value: (entity) => formatCurrency(value(entity), options) };
}

export function phoneField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | null | undefined,
): DetailField<TEntity> {
  return {
    label,
    render: (entity) => {
      const phone = value(entity);
      if (!phone) return null;

      return (
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">
          {formatPhone(phone)}
        </a>
      );
    },
  };
}

export function emailField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | null | undefined,
): DetailField<TEntity> {
  return {
    label,
    render: (entity) => {
      const email = value(entity);
      if (!email) return null;

      return (
        <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
          {email}
        </a>
      );
    },
  };
}

export function statusField<TEntity, TStatus extends string>(
  label: string,
  value: (entity: TEntity) => TStatus | null | undefined,
  map: StatusMap<TStatus>,
): DetailField<TEntity> {
  return {
    label,
    render: (entity) => {
      const status = value(entity);
      return status ? <StatusBadge status={status} map={map} /> : null;
    },
  };
}

/** Internal link to another resource's detail page. */
export function linkField<TEntity>(
  label: string,
  value: (entity: TEntity) => { label: string; href: string } | null | undefined,
): DetailField<TEntity> {
  return {
    label,
    render: (entity) => {
      const link = value(entity);
      if (!link) return null;

      return (
        <Link href={link.href} className="font-medium underline-offset-4 hover:underline">
          {link.label}
        </Link>
      );
    },
  };
}

/** External URL, opened in a new tab with the usual safety attributes. */
export function urlField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | null | undefined,
): DetailField<TEntity> {
  return {
    label,
    render: (entity) => {
      const url = value(entity);
      if (!url) return null;

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {url}
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      );
    },
  };
}

/** Renders an array as badges. */
export function badgeListField<TEntity>(
  label: string,
  value: (entity: TEntity) => readonly string[] | null | undefined,
  options: { fullWidth?: boolean } = {},
): DetailField<TEntity> {
  return {
    label,
    ...options,
    render: (entity) => {
      const items = value(entity);
      if (!items || items.length === 0) return null;

      return (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="font-normal">
              {item}
            </Badge>
          ))}
        </div>
      );
    },
  };
}

/** Multi-line text, preserving line breaks. */
export function multilineField<TEntity>(
  label: string,
  value: (entity: TEntity) => string | null | undefined,
): DetailField<TEntity> {
  return {
    label,
    fullWidth: true,
    render: (entity): ReactNode => {
      const text = value(entity);
      if (!text) return null;

      return <p className="whitespace-pre-wrap">{text}</p>;
    },
  };
}
