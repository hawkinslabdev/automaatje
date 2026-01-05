"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Car,
  ChevronRight,
  Route,
  Gauge,
  Inbox,
  List,
  Home,
  Settings2,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";

interface SubItem {
  title: string;
  url: string;
}

interface NavItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: SubItem[];
}

const sidebarData = {
  general: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Meldingen", url: "/inbox", icon: Inbox },
  ] as NavItem[],
  administration: [
    {
      title: "Ritten",
      url: "/registraties/overzicht",
      icon: List,
      items: [
        { title: "Overzicht", url: "/registraties/overzicht" },
        { title: "Nieuwe rit", url: "/registraties/nieuw" },
        { title: "Kilometerstand opslaan", url: "/registraties/meterstand" },
      ],
    },
    { title: "Voertuigen", url: "/garage", icon: Car },
  ] as NavItem[],
  reports: [
    { title: "Kilometeroverzicht", url: "/rapporten/kilometers", icon: Route },
    { title: "Meterstandrapport", url: "/rapporten/meterstand", icon: Gauge },
  ] as NavItem[],
  system: [
    { title: "Instellingen", url: "/instellingen", icon: Settings2 },
  ] as NavItem[],
};

export function AppSidebar({
  user,
  version,
  unreadCount = 0,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    role: string;
    avatarSeed?: string;
  };
  version?: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/50 pb-4 mb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/">
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg text-white shadow-sm"
                  style={{ backgroundColor: '#5b8596' }}
                >
                  <Car className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold text-base text-sidebar-foreground">Automaatje</span>
                  <span className="truncate text-xs text-sidebar-foreground/50">
                    v{version || "1.0.0"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/40 mb-2 px-4">
            Overzicht
          </SidebarGroupLabel>
          <SidebarMenu>
            {sidebarData.general.map((item) => (
              <CollapsibleMenuItem
                key={item.title}
                item={item}
                pathname={pathname}
                badge={item.title === "Meldingen" && unreadCount > 0 ? unreadCount : undefined}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/40 mb-2 px-4">
            Administratie
          </SidebarGroupLabel>
          <SidebarMenu>
            {sidebarData.administration.map((item) => (
              <CollapsibleMenuItem key={item.title} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/40 mb-2 px-4">
            Rapportage
          </SidebarGroupLabel>
          <SidebarMenu>
            {sidebarData.reports.map((item) => (
              <CollapsibleMenuItem key={item.title} item={item} pathname={pathname} />
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton 
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
                asChild
              >
                <Link href="/rapporten">
                  <MoreHorizontal className="size-4" />
                  <span className="text-sm">Alle rapporten</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            {sidebarData.system.map((item) => (
              <CollapsibleMenuItem key={item.title} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 pt-2">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function CollapsibleMenuItem({
  item,
  pathname,
  badge,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
}) {
  const router = useRouter();
  const hasSubItems = !!item.items?.length;
  
  // Strict active check: Does the current path exactly match this item?
  const isDirectActive = pathname === item.url;
  // Hierarchical check: Is any child active?
  const isChildActive = hasSubItems ? item.items?.some((sub) => pathname === sub.url) : false;

  // PARENT STYLE LOGIC:
  // 1. Direct active (no children): Solid background highlight.
  // 2. Child active: No background, only primary text color (ghost state).
  // 3. Inactive: Dimmed text.
  const getParentClasses = () => {
    if (isDirectActive && !hasSubItems) {
      return "bg-sidebar-primary/10 text-sidebar-primary font-semibold shadow-sm";
    }
    if (isChildActive) {
      return "text-sidebar-primary font-semibold bg-transparent";
    }
    return "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground";
  };

  if (!hasSubItems) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={isDirectActive}
          className={`transition-all duration-200 ${getParentClasses()}`}
          asChild
        >
          <Link href={item.url}>
            {item.icon && <item.icon className="size-4 shrink-0" />}
            <span className="text-sm">{item.title}</span>
            {badge !== undefined && (
              <Badge className="ml-auto h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                {badge > 99 ? "99+" : badge}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={isChildActive || isDirectActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className={`transition-all duration-200 ${getParentClasses()}`}
            onClick={() => router.push(item.url)}
          >
            {item.icon && <item.icon className="size-4 shrink-0" />}
            <span className="text-sm">{item.title}</span>
            <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-4 mt-1 border-l border-sidebar-border/50 px-0 py-0 gap-0">
            {item.items?.map((subItem) => {
              const isSubActive = pathname === subItem.url;
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    className={`group relative flex h-9 items-center rounded-none border-l-2 border-transparent px-4 transition-all hover:bg-sidebar-accent/50 ${
                      isSubActive 
                        ? "border-l-sidebar-primary bg-sidebar-primary/5 text-sidebar-primary font-bold" 
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Link href={subItem.url}>
                      <span className="text-xs">{subItem.title}</span>
                      {isSubActive && (
                        <div className="absolute right-2 size-1 rounded-full bg-sidebar-primary animate-pulse" />
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}