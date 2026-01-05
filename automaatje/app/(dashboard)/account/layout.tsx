"use client";

import { ReactNode, useState } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden w-64 border-r bg-muted/10 lg:block">
        <div className="sticky top-0 space-y-6 p-6">
          <AccountNav />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8">
        {/* Mobile Menu Button */}
        <div className="mb-4 lg:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Menu className="mr-2 h-4 w-4" />
                Meer instellingen bekijken
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Instellingen</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <AccountNav onItemClick={() => setIsOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
