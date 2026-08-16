"use client";

import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { NotificationsButton } from "@/components/layout/notifications-button";
import { SearchTrigger } from "@/components/layout/search-trigger";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { HeaderTimer } from "@/components/time/header-timer";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader({
  name,
  email,
  unreadNotifications = 0,
  timeZone = "UTC",
}: {
  name: string;
  email: string;
  unreadNotifications?: number;
  timeZone?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1.5 border-b bg-background/80 px-2 backdrop-blur-md sm:gap-2 sm:px-3 md:px-4">
      <SidebarTrigger className="-ml-0.5" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <AppBreadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <HeaderTimer />
        <SearchTrigger />
        <NotificationsButton initialUnread={unreadNotifications} timeZone={timeZone} />
        <ThemeToggle />
        <UserMenu compact name={name} email={email} />
      </div>
    </header>
  );
}
