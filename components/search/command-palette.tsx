"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Bug, FileText, LayoutGrid, ListTodo, Users } from "lucide-react";

import { searchWorkspaceAction } from "@/lib/actions/search";
import type { SearchEntity, SearchHit } from "@/lib/services/search";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

const groupLabels: Record<SearchEntity, string> = {
  client: "Clients",
  project: "Projects",
  task: "Tasks",
  bug: "Bugs",
  invoice: "Invoices",
};

const groupIcons = {
  client: Users,
  project: LayoutGrid,
  task: ListTodo,
  bug: Bug,
  invoice: FileText,
} as const;

function groupHits(hits: SearchHit[]) {
  const order: SearchEntity[] = ["client", "project", "task", "bug", "invoice"];
  return order
    .map((type) => ({
      type,
      items: hits.filter((hit) => hit.type === type),
    }))
    .filter((group) => group.items.length > 0);
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.key ?? "").toLowerCase() !== "k") {
        return;
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      setOpen((current) => !current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      <GlobalSearchDialog />
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }

  return context;
}

function GlobalSearchDialog() {
  const router = useRouter();
  const { open, setOpen } = useSearch();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef(0);

  const runSearch = useEffectEvent((value: string) => {
    const trimmed = value.trim();
    const requestId = ++requestIdRef.current;

    if (!trimmed) {
      setHits([]);
      return;
    }

    startTransition(async () => {
      const next = await searchWorkspaceAction(trimmed);
      if (requestId === requestIdRef.current) {
        setHits(next);
      }
    });
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const handle = window.setTimeout(() => {
      runSearch(query);
    }, 200);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);

      if (!next) {
        setQuery("");
        setHits([]);
      }
    },
    [setOpen],
  );

  const groups = groupHits(hits);
  const emptyMessage =
    query.trim().length === 0
      ? "Type to search clients, projects, tasks, and invoices."
      : pending
        ? "Searching…"
        : "No matches.";

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false} className="rounded-xl border-0">
        <CommandInput
          placeholder="Search clients, projects, tasks, invoices…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {groups.length === 0 ? <CommandEmpty>{emptyMessage}</CommandEmpty> : null}
          {groups.map((group) => {
            const Icon = groupIcons[group.type];

            return (
              <CommandGroup key={group.type} heading={groupLabels[group.type]}>
                {group.items.map((hit) => (
                  <CommandItem
                    key={`${hit.type}-${hit.id}`}
                    value={`${hit.type}-${hit.id}-${hit.title}`}
                    onSelect={() => {
                      onOpenChange(false);
                      router.push(hit.href);
                    }}
                  >
                    <Icon className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {hit.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
