"use client";

import { Search } from "lucide-react";

import { useSearch } from "@/components/search/command-palette";
import { Button } from "@/components/ui/button";

export function SearchTrigger() {
  const { setOpen } = useSearch();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden h-8 w-56 justify-between px-2 text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          <span>Search</span>
        </span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
    </>
  );
}
