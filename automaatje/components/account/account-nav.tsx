
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Shield,
  User,
  Bell,
  Car,
  MapPin,
  Euro,
  Calendar,
  Tag,
  Share2,
  Heart,
  HelpCircle,
  Mail,
  Code,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SettingsNavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
  onItemClick?: () => void;
}

function SettingsNavItem({ href, label, icon: Icon, external, onItemClick }: SettingsNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      href={href}
      {...linkProps}
      onClick={onItemClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {external && <ExternalLink className="h-4 w-4 ml-2 text-muted-foreground" />} {/* Conditionally render external link icon */}
    </Link>
  );
}

interface SettingsSectionProps {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    external?: boolean;
  }[];
  onItemClick?: () => void;
}

function SettingsSection({ title, items, onItemClick }: SettingsSectionProps) {
  return (
    <div className="space-y-1">
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {items.map((item) => (
        <SettingsNavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          external={item.external}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}

interface AccountNavProps {
  onItemClick?: () => void;
}

export function AccountNav({ onItemClick }: AccountNavProps = {}) {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => setVersion(data.version))
      .catch(() => setVersion("1.0.0"));
  }, []);

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          href: "/account",
          label: "Je account",
          icon: User,
        },
        {
          href: "/account/notificaties",
          label: "Meldingen",
          icon: Bell,
        },
        {
          href: "/account/gedeelde-voertuigen",
          label: "Gedeelde voertuigen",
          icon: Share2,
        },
      ],
    },
    {
      title: "Registratie",
      items: [
        {
          href: "/account/integriteitscontrole",
          label: "Integriteitscontrole",
          icon: Shield,
        },
        {
          href: "/account/kilometerlezingen",
          label: "Kilometerlezingen",
          icon: MapPin,
        },
      ],
    },
    {
      title: "Rapportage",
      items: [
        {
          href: "/account/voertuigen",
          label: "Voertuigen",
          icon: Car,
        },
        {
          href: "/account/locaties",
          label: "Locaties",
          icon: MapPin,
        },
        {
          href: "/account/kilometertarieven",
          label: "Kilometertarieven",
          icon: Euro,
        },
        {
          href: "/account/rapportageperioden",
          label: "Rapportageperioden",
          icon: Calendar,
        },
        {
          href: "/account/rapportagegegevens",
          label: "Rapportagegegevens",
          icon: FileText,
        },
        {
          href: "/account/organisaties",
          label: "Organisaties",
          icon: Tag,
        },
        {
          href: "/account/labels",
          label: "Labels",
          icon: Tag,
        },
      ],
    },
    {
      title: "Ondersteuning",
      items: [
        {
          href: "/account/help",
          label: "Helpcentrum",
          icon: HelpCircle,
        },
        {
          href: "https://github.com/hawkinslabdev/automaatje",
          label: "Broncode",
          icon: Code,
          external: true,
        },
      ],
    },
  ];

  return (
    <>
      <div>
        <h2 className="mb-2 text-lg font-semibold">Instellingen</h2>
        <p className="text-sm text-muted-foreground">
          Beheer je voorkeuren en instellingen
        </p>
      </div>

      <Separator />

      <nav className="space-y-6">
        {settingsSections.map((section) => (
          <SettingsSection
            key={section.title}
            title={section.title}
            items={section.items}
            onItemClick={onItemClick}
          />
        ))}
      </nav>

      <Separator />

      {/* Footer */}
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex gap-2">
          <Link href="/voorwaarden" className="hover:underline">
            Voorwaarden
          </Link>
          <span>en</span>
          <Link href="/privacybeleid" className="hover:underline">
            Privacybeleid
          </Link>
        </div>
        <div>v{version || "1.0.0"}</div>
      </div>
    </>
  );
}
