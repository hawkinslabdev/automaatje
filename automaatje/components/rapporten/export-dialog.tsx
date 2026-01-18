"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2 } from "lucide-react";

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

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: "csv" | "pdf";
  vehicles: Vehicle[];
  organizations: Organization[];
  currentVehicle: string;
  currentOrganization: string;
  isExporting: boolean;
  onExport: (vehicleId: string, organizationId: string) => void;
}

export function ExportDialog({
  open,
  onOpenChange,
  exportType,
  vehicles,
  organizations,
  currentVehicle,
  currentOrganization,
  isExporting,
  onExport,
}: ExportDialogProps) {
  // Pre-fill with current selections if they exist
  const [selectedVehicle, setSelectedVehicle] = useState(
    currentVehicle !== "all" ? currentVehicle : ""
  );
  const [selectedOrganization, setSelectedOrganization] = useState(
    currentOrganization !== "none" ? currentOrganization : "none"
  );

  const getVehicleLabel = (vehicle: Vehicle) => {
    const name = vehicle.details.naamVoertuig;
    const makeModel =
      vehicle.details.make && vehicle.details.model
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

  // For PDF, a specific vehicle must be selected
  // For CSV, "all" is allowed (adds license plate column)
  const canExport =
    exportType === "csv"
      ? selectedVehicle !== ""  // CSV: any selection including "all"
      : selectedVehicle !== "" && selectedVehicle !== "all";  // PDF: specific vehicle only

  const handleExport = () => {
    onExport(selectedVehicle || "all", selectedOrganization);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {exportType === "pdf" ? "PDF exporteren" : "CSV exporteren"}
          </DialogTitle>
          <DialogDescription>
            {exportType === "pdf"
              ? "Selecteer een voertuig voor je PDF rapport. Het kenteken wordt opgenomen in het rapport."
              : "Selecteer een voertuig of kies 'Alle voertuigen' voor een overzicht met kentekens."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Voertuig *</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Selecteer een voertuig" />
              </SelectTrigger>
              <SelectContent>
                {exportType === "csv" && (
                  <SelectItem value="all">
                    Alle voertuigen (met kenteken kolom)
                  </SelectItem>
                )}
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {getVehicleLabel(vehicle)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {exportType === "pdf" && (
              <p className="text-xs text-muted-foreground">
                Voor PDF export moet je een specifiek voertuig selecteren
              </p>
            )}
          </div>

          {/* Organization Selection */}
          {organizations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="organization">Organisatie (optioneel)</Label>
              <Select
                value={selectedOrganization}
                onValueChange={setSelectedOrganization}
              >
                <SelectTrigger id="organization">
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
              <p className="text-xs text-muted-foreground">
                De organisatie wordt toegevoegd aan het rapport
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Annuleren
          </Button>
          <Button onClick={handleExport} disabled={!canExport || isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporteren...
              </>
            ) : exportType === "pdf" ? (
              <>
                <FileText className="mr-2 h-4 w-4" />
                PDF exporteren
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                CSV exporteren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
