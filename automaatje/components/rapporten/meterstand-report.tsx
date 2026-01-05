"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Gauge,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  TrendingUp,
  Car,
  FileText,
  Info,
} from "lucide-react";
import { formatDistance, formatDutchDateTime, formatDutchDate } from "@/lib/utils";
import { PeriodSelector } from "@/components/registrations/period-selector";
import { formatPeriodLabel } from "@/lib/utils/date-helpers";

interface Vehicle {
  id: string;
  licensePlate: string;
  details: {
    naamVoertuig?: string;
    type: string;
    make?: string;
    model?: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

interface MeterstandReportProps {
  data: any[];
  stats: {
    totalReadings: number;
    vehicleStats: Record<string, {
      count: number;
      firstReading?: number;
      lastReading?: number;
      totalDistance?: number;
    }>;
    periodStart?: Date;
    periodEnd?: Date;
  };
  vehicles: Vehicle[];
  organizations: Organization[];
  currentPeriod: string;
  currentVehicle: string;
  availableYears: number[];
  availableMonths: Array<{ year: number; month: number }>;
}

type SortField = "date" | "vehicle" | "odometer";
type SortDirection = "asc" | "desc";

export function MeterstandReport({
  data,
  stats,
  vehicles,
  organizations,
  currentPeriod,
  currentVehicle,
  availableYears,
  availableMonths,
}: MeterstandReportProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("none");

  const hasData = data.length > 0;

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/rapporten/meterstand?${params.toString()}`);
  };

  const handleVehicleChange = (vehicleId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (vehicleId === "all") {
      params.delete("vehicle");
    } else {
      params.set("vehicle", vehicleId);
    }
    router.push(`/rapporten/meterstand?${params.toString()}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  // Sort the data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "date":
        comparison = a.parsedData.timestamp - b.parsedData.timestamp;
        break;
      case "vehicle":
        comparison = a.vehicle.licensePlate.localeCompare(b.vehicle.licensePlate);
        break;
      case "odometer":
        comparison = (a.odometer || 0) - (b.odometer || 0);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleExportCSV = () => {
    // Get selected organization name
    const selectedOrg = organizations.find((org) => org.id === selectedOrganization);
    const organizationName = selectedOrg ? selectedOrg.name : "";

    // Build metadata rows
    const metadataRows = [];
    if (organizationName) {
      metadataRows.push(`"Organisatie","${organizationName}"`);
    }
    metadataRows.push(`"Periode","${formatPeriodLabel(currentPeriod)}"`);
    metadataRows.push(`"Gegenereerd","${formatDutchDateTime(new Date())}"`);
    metadataRows.push(""); // Empty row separator

    const headers = ["Datum", "Tijdstip", "Voertuig", "Kilometerstand", "Notitie"];
    const rows = sortedData.map((item) => {
      const date = new Date(item.parsedData.timestamp);
      const vehicle = item.vehicle;
      const vehicleLabel = vehicle.details.naamVoertuig || vehicle.licensePlate;

      return [
        formatDutchDate(date),
        date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
        vehicleLabel,
        item.odometer ? item.odometer.toString() : "",
        item.parsedData.description || "",
      ];
    });

    const csvContent = [
      ...metadataRows,
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Include organization in filename if selected
    const orgPrefix = organizationName ? `${organizationName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-` : "";
    link.setAttribute("href", url);
    link.setAttribute("download", `${orgPrefix}meterstand-rapport-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVehicleLabel = (vehicle: Vehicle) => {
    const name = vehicle.details.naamVoertuig;
    const makeModel = vehicle.details.make && vehicle.details.model
      ? `${vehicle.details.make} ${vehicle.details.model}`
      : null;

    if (name) {
      return `${name} (${vehicle.licensePlate})`;
    }
    if (makeModel) {
      return `${makeModel} (${vehicle.licensePlate})`;
    }
    return vehicle.licensePlate;
  };

  // Calculate overall stats
  const totalDistance = Object.values(stats.vehicleStats).reduce(
    (sum, v) => sum + (v.totalDistance || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voorkeuren</CardTitle>
          <CardDescription>
            Pas de voorkeuren aan om het rapport te verfijnen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Period Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium mr-2">Periode</label>
              <PeriodSelector
                currentPeriod={currentPeriod}
                availableYears={availableYears}
                availableMonths={availableMonths}
                onPeriodChange={handlePeriodChange}
              />
            </div>

            {/* Vehicle Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Voertuig</label>
              <Select value={currentVehicle} onValueChange={handleVehicleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle voertuigen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle voertuigen</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {getVehicleLabel(vehicle)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Organization Selector (for report generation) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium">Organisatie</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Dit is een rapportinstelling en filtert de gegevens niet.
                        De organisatie wordt toegevoegd aan de export voor
                        administratieve doeleinden.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger>
                  <SelectValue placeholder="Geen organisatie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen organisatie</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Hide on mobile - show on desktop */}
        <Card className="hidden lg:flex lg:flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal meterstanden</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReadings}</div>
            <p className="text-xs text-muted-foreground">
              {formatPeriodLabel(currentPeriod)}
            </p>
          </CardContent>
        </Card>

        {/* Show on mobile full width */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal gereden</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{formatDistance(totalDistance)}</div>
            <p className="text-xs text-muted-foreground">
              Berekend uit kilometerstand
            </p>
          </CardContent>
        </Card>

        {/* Hide on mobile - show on desktop */}
        <Card className="hidden lg:flex lg:flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voertuigen</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.vehicleStats).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Actieve voertuigen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Details - Hide on mobile */}
      {Object.keys(stats.vehicleStats).length > 0 && (
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle className="text-base">Voertuigdetails</CardTitle>
            <CardDescription>
              Kilometerstand per voertuig in de geselecteerde periode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.vehicleStats).map(([vehicleId, vehicleStats]) => {
                const vehicle = vehicles.find((v) => v.id === vehicleId);
                if (!vehicle) return null;

                return (
                  <div
                    key={vehicleId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{getVehicleLabel(vehicle)}</p>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        <span>{vehicleStats.count} registraties</span>
                        {vehicleStats.firstReading && vehicleStats.lastReading && (
                          <>
                            <span>•</span>
                            <span>
                              {vehicleStats.firstReading.toLocaleString("nl-NL")} km →{" "}
                              {vehicleStats.lastReading.toLocaleString("nl-NL")} km
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {vehicleStats.totalDistance !== undefined && vehicleStats.totalDistance > 0 && (
                      <Badge variant="secondary" className="font-mono">
                        +{formatDistance(vehicleStats.totalDistance)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base lg:text-lg">Kilometerstandregistraties</CardTitle>
            <CardDescription className="text-sm">
              Alle opgeslagen kilometerstanden in de geselecteerde periode
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!hasData}
            className="w-full sm:w-auto h-10 lg:h-9 lg:shrink-0"
          >
            <Download className="mr-2 h-4 w-4" />
            Exporteer CSV
          </Button>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Gauge className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Geen registraties gevonden</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Er zijn geen meterstandregistraties in de geselecteerde periode.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("date")}
                      >
                        Datum
                        {getSortIcon("date")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort("vehicle")}
                      >
                        Voertuig
                        {getSortIcon("vehicle")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-mr-3 h-8"
                        onClick={() => handleSort("odometer")}
                      >
                        Kilometerstand
                        {getSortIcon("odometer")}
                      </Button>
                    </TableHead>
                    <TableHead>Notitie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item) => {
                    const date = new Date(item.parsedData.timestamp);
                    const vehicle = item.vehicle;
                    const vehicleLabel = vehicle.details.naamVoertuig || vehicle.licensePlate;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDutchDate(date)}</span>
                            <span className="text-sm text-muted-foreground">
                              {date.toLocaleTimeString("nl-NL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{vehicleLabel}</span>
                            <span className="text-sm text-muted-foreground font-mono">
                              {vehicle.licensePlate}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.odometer ? item.odometer.toLocaleString("nl-NL") : "-"} km
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.parsedData.description || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
