"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPTY_PLACEHOLDER } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Declarative detail layout.
 *
 * Removes the Card / grid / label / value markup that would otherwise be
 * retyped on every detail page. A field supplies either a `value` (formatted
 * text) or a `render` (arbitrary JSX) — `render` is the escape hatch, and it
 * takes precedence.
 */

export interface DetailField<TEntity> {
  label: string;
  /** Plain value. Rendered through the standard empty-value handling. */
  value?: (entity: TEntity) => ReactNode;
  /** Full control over the cell. Use for badges, links, nested components. */
  render?: (entity: TEntity) => ReactNode;
  /** Spans the full width of the section grid. */
  fullWidth?: boolean;
  /** Hides the field for records where it does not apply. */
  visible?: (entity: TEntity) => boolean;
  className?: string;
}

export interface DetailSection<TEntity> {
  title?: string;
  description?: string;
  fields: DetailField<TEntity>[];
  columns?: 1 | 2 | 3;
  /** Hides the whole section, e.g. an "Address" block for a remote site. */
  visible?: (entity: TEntity) => boolean;
  /** Replaces the generated field grid for this section only. */
  render?: (entity: TEntity) => ReactNode;
}

export interface DetailViewProps<TEntity> {
  entity: TEntity;
  sections: DetailSection<TEntity>[];
  className?: string;
}

export function DetailView<TEntity>({ entity, sections, className }: DetailViewProps<TEntity>) {
  const visibleSections = sections.filter((section) => section.visible?.(entity) ?? true);

  return (
    <div className={cn("space-y-6", className)}>
      {visibleSections.map((section, index) => (
        <Card key={section.title ?? index}>
          {section.title ? (
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.description ? (
                <p className="text-muted-foreground text-sm">{section.description}</p>
              ) : null}
            </CardHeader>
          ) : null}

          <CardContent>
            {section.render ? (
              section.render(entity)
            ) : (
              <DetailGrid columns={section.columns ?? 2}>
                {section.fields
                  .filter((field) => field.visible?.(entity) ?? true)
                  .map((field) => (
                    <DetailItem
                      key={field.label}
                      label={field.label}
                      fullWidth={field.fullWidth}
                      className={field.className}
                    >
                      {field.render ? field.render(entity) : renderValue(field.value?.(entity))}
                    </DetailItem>
                  ))}
              </DetailGrid>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DetailGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-5",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

/**
 * One label/value pair.
 *
 * Uses `<dt>`/`<dd>` so the relationship is exposed to assistive technology,
 * not just implied by layout.
 */
export function DetailItem({
  label,
  children,
  fullWidth,
  className,
}: {
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", fullWidth && "sm:col-span-2 lg:col-span-3", className)}>
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

/** Renders empty values as a placeholder rather than a blank cell. */
function renderValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">{EMPTY_PLACEHOLDER}</span>;
  }
  return value;
}
