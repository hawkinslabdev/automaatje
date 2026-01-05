import * as React from "react";

export function LightbulbIcon({ className = "w-5 h-5 text-primary font-semibold", ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="11" r="5" />
      <path d="M12 16v4M8 20h8" />
    </svg>
  );
}