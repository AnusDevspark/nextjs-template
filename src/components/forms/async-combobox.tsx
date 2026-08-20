"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronsUpDownIcon, Loader2Icon, XIcon } from "lucide-react";

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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary line, e.g. an address under an organisation name. */
  description?: string;
  disabled?: boolean;
}

export interface ComboboxPage {
  items: ComboboxOption[];
  hasMore: boolean;
}

export interface AsyncComboboxProps {
  value: string | null | undefined;
  onChange: (value: string | null, option: ComboboxOption | null) => void;
  /**
   * Fetches one page of options. Called with the debounced search term.
   * Implementations should ask the backend to filter — the point of this
   * component is to avoid downloading every row of a large table to populate a dropdown.
   */
  loadOptions: (params: {
    search: string;
    page: number;
    signal?: AbortSignal;
  }) => Promise<ComboboxPage>;
  /**
   * Resolves the label for an already-selected id. Needed on an edit form,
   * where the stored value is not in the first page of results.
   */
  loadSelected?: (value: string, signal?: AbortSignal) => Promise<ComboboxOption | null>;
  /** Namespaces the query cache. Use the resource key. */
  queryKey: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onBlur?: () => void;
  className?: string;
}

/**
 * A searchable, paginated, API-backed select.
 *
 * Every API-backed lookup in the app (a "pick an owner" field, say) is a thin
 * wrapper around this, so debouncing, infinite scroll, the selected-label
 * round trip and the keyboard/ARIA behaviour are implemented exactly once.
 */
export function AsyncCombobox({
  value,
  onChange,
  loadOptions,
  loadSelected,
  queryKey,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  clearable = true,
  id,
  onBlur,
  className,
  ...aria
}: AsyncComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  /**
   * Label for a value that is not in the loaded page — an edit form opens with
   * an id but no options fetched yet. Only the *fetched* label is state; the
   * selected option itself is derived below.
   */
  const [fetchedOption, setFetchedOption] = useState<ComboboxOption | null>(null);

  const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useInfiniteQuery({
      queryKey: ["combobox", queryKey, debouncedSearch],
      queryFn: ({ pageParam, signal }) =>
        loadOptions({ search: debouncedSearch, page: pageParam, signal }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined),
      // Only fetch once the popover is open — a form with eight lookups should
      // not fire eight requests on mount.
      enabled: open,
      staleTime: 60_000,
    });

  const options = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  /**
   * Derived, not stored: prefer an option from the loaded list, and fall back
   * to the separately-fetched one. Deriving during render means the trigger
   * never briefly shows a stale label after `value` changes.
   */
  const selectedOption = useMemo<ComboboxOption | null>(() => {
    if (!value) return null;

    return (
      options.find((option) => option.value === value) ??
      (fetchedOption?.value === value ? fetchedOption : null)
    );
  }, [value, options, fetchedOption]);

  // Fetches the label for a value the loaded pages do not contain.
  useEffect(() => {
    if (!value || !loadSelected) return;
    if (options.some((option) => option.value === value)) return;
    if (fetchedOption?.value === value) return;

    const controller = new AbortController();

    void loadSelected(value, controller.signal)
      .then((option) => {
        if (!controller.signal.aborted && option) setFetchedOption(option);
      })
      .catch(() => {
        // A lookup that cannot resolve its label still shows the raw id, which
        // is more useful than an empty trigger.
      });

    return () => controller.abort();
  }, [value, options, loadSelected, fetchedOption]);

  const listRef = useRef<HTMLDivElement>(null);

  /** Loads the next page when the list is scrolled near the bottom. */
  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (!hasNextPage || isFetchingNextPage) return;

    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 80) {
      void fetchNextPage();
    }
  }

  const triggerLabel = selectedOption?.label ?? (value ? value : placeholder);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSearch("");
          onBlur?.();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={aria["aria-invalid"]}
          aria-describedby={aria["aria-describedby"]}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>

          <span className="flex shrink-0 items-center gap-1">
            {clearable && value && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                className="hover:text-foreground text-muted-foreground rounded-sm p-0.5"
                onClick={(event) => {
                  event.stopPropagation();
                  setFetchedOption(null);
                  onChange(null, null);
                }}
              >
                <XIcon className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        {/* Filtering happens on the server, so Command must not also filter. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />

          <CommandList ref={listRef} onScroll={handleScroll}>
            {isPending ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <Loader2Icon className="size-4 animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="text-destructive px-3 py-6 text-center text-sm">
                {getErrorMessage(error)}
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => {
                      setFetchedOption(option);
                      onChange(option.value, option);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn("size-4", value === option.value ? "opacity-100" : "opacity-0")}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{option.label}</span>
                      {option.description ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                ))}

                {isFetchingNextPage ? (
                  <div className="text-muted-foreground flex items-center justify-center gap-2 py-3 text-xs">
                    <Loader2Icon className="size-3 animate-spin" />
                    Loading more…
                  </div>
                ) : null}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
