"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  className?: string;
}

export function FloatingActionButton({
  actions,
  className,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className={cn("fixed bottom-6 right-6 z-50 lg:hidden", className)}>
        {/* Action Buttons (shown when open) */}
        <div
          className={cn(
            "flex flex-col gap-3 mb-3 transition-all duration-200",
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {actions.map((action, index) => (
            <Button
              key={index}
              asChild
              variant={action.variant || "default"}
              size="lg"
              className="shadow-lg min-w-[200px] justify-start gap-3"
              onClick={() => setIsOpen(false)}
            >
              <Link href={action.href}>
                {action.icon}
                {action.label}
              </Link>
            </Button>
          ))}
        </div>

        {/* Main FAB Button */}
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-transform",
            isOpen && "rotate-45"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    </>
  );
}
