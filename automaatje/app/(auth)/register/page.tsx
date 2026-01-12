"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WizardStepIndicator } from "@/components/onboarding/wizard-step-indicator";
import { WizardNavigation } from "@/components/onboarding/wizard-navigation";
import { StepAccountSetup } from "@/components/onboarding/step-account-setup";
import { StepLocation } from "@/components/onboarding/step-location";
import { StepVehicle } from "@/components/onboarding/step-vehicle";
import { StepOdometerTracking } from "@/components/onboarding/step-odometer-tracking";
import { StepMileageRates } from "@/components/onboarding/step-mileage-rates";
import { StepConfirmation } from "@/components/onboarding/step-confirmation";
import { completeRegistration } from "@/lib/actions/registration-onboarding";
import { fetchVehicleDetails } from "@/lib/actions/vehicles";
import {
  accountSetupSchema,
  locationSchema,
  vehicleRegistrationSchema,
  odometerTrackingSchema,
  mileageRatesSchema,
} from "@/lib/validations/registration-onboarding";
import type { RegistrationWizardData } from "@/lib/validations/registration-onboarding";

interface WizardState {
  currentStep: number;
  name: string;
  email: string;
  locationText: string;
  locationLat?: number;
  locationLon?: number;
  locationStatus: 'idle' | 'loading' | 'success' | 'error';
  licensePlate: string;
  vehicleType: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
  vehicleName?: string;
  odometerMode: "manual" | "auto_calculate";
  odometerFrequency?: "dagelijks" | "wekelijks" | "maandelijks";
  initialOdometerKm?: number;
  initialOdometerDate?: Date;
  rateType: "standard" | "custom" | "none";
  customRate?: number;
  password: string;
  confirmPassword: string;
  errors: Record<string, string | undefined>;
  isLoading: boolean;
  submitError?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    name: "",
    email: "",
    locationText: "",
    locationStatus: 'idle',
    licensePlate: "",
    vehicleType: "Auto",
    odometerMode: "auto_calculate", // Default to auto-calculate (recommended)
    odometerFrequency: "maandelijks", // Default to monthly
    rateType: "standard",
    password: "",
    confirmPassword: "",
    errors: {},
    isLoading: false,
  });

  const handleFieldChange = (field: string, value: any) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: undefined },
      submitError: undefined,
    }));
  };

  const validateStep = (step: number): boolean => {
    setState((prev) => ({ ...prev, errors: {} }));

    try {
      switch (step) {
        case 1:
          accountSetupSchema.parse({
            name: state.name,
            email: state.email,
            password: state.password,
            confirmPassword: state.confirmPassword,
          });
          break;
        case 2:
          locationSchema.parse({
            locationText: state.locationText,
            locationLat: state.locationLat,
            locationLon: state.locationLon,
          });
          break;
        case 3:
          vehicleRegistrationSchema.parse({
            licensePlate: state.licensePlate,
            vehicleType: state.vehicleType,
            vehicleName: state.vehicleName || undefined,
          });
          break;
        case 4:
          odometerTrackingSchema.parse({
            odometerMode: state.odometerMode,
            odometerFrequency: state.odometerFrequency,
            initialOdometerKm: state.initialOdometerKm,
            initialOdometerDate: state.initialOdometerDate,
          });
          break;
        case 5:
          mileageRatesSchema.parse({
            rateType: state.rateType,
            customRate: state.rateType === "custom" ? state.customRate : undefined,
          });
          break;
      }
      return true;
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          const field = err.path[0];
          fieldErrors[field] = err.message;
        });
        setState((prev) => ({ ...prev, errors: fieldErrors }));
      }
      return false;
    }
  };

  const handleAddressSelect = (suggestion: any) => {
    setState((prev) => ({
      ...prev,
      locationText: suggestion.displayName,
      locationLat: suggestion.lat,
      locationLon: suggestion.lon,
      locationStatus: 'success',
    }));
  };

  const handleVerifyLocation = async () => {
    if (!state.locationText) return;

    setState((prev) => ({ ...prev, locationStatus: 'loading' }));

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: state.locationText }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          locationLat: result.data.lat,
          locationLon: result.data.lon,
          locationStatus: 'success',
        }));
      } else {
        setState((prev) => ({
          ...prev,
          locationStatus: 'error',
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setState((prev) => ({
        ...prev,
        locationStatus: 'error',
      }));
    }
  };

  const handleSkip = () => {
    // Auto-select "none" option and proceed to next step
    setState((prev) => ({
      ...prev,
      rateType: "none",
      customRate: undefined,
      currentStep: prev.currentStep + 1,
    }));
  };

  const handleNext = async () => {
    if (!validateStep(state.currentStep)) {
      return;
    }

    if (state.currentStep < 6) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    } else {
      // Final step - submit
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        errors: {},
        submitError: undefined,
      }));
    }
  };

  const handleEdit = (step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
      errors: {},
      submitError: undefined,
    }));
  };

  const handleSubmit = async () => {
    setState((prev) => ({ ...prev, isLoading: true, submitError: undefined }));

    try {
      const data: RegistrationWizardData = {
        name: state.name,
        email: state.email,
        locationText: state.locationText,
        locationLat: state.locationLat,
        locationLon: state.locationLon,
        licensePlate: state.licensePlate,
        vehicleType: state.vehicleType,
        vehicleName: state.vehicleName,
        odometerMode: state.odometerMode,
        odometerFrequency: state.odometerFrequency,
        initialOdometerKm: state.initialOdometerKm,
        initialOdometerDate: state.initialOdometerDate,
        rateType: state.rateType,
        customRate: state.customRate,
        password: state.password,
        confirmPassword: state.confirmPassword,
      };

      const result = await completeRegistration(data);

      if (result.success) {
        // User is already logged in via server action
        // RDW fetch is triggered automatically in the action

        // Redirect to dashboard
        router.push("/dashboard");
        router.refresh();
      } else {
        setState((prev) => ({
          ...prev,
          submitError: result.error || "Er is een fout opgetreden bij het aanmaken van je account",
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Registration error:', error);
      setState((prev) => ({
        ...prev,
        submitError: "Er is een onverwachte fout opgetreden",
        isLoading: false,
      }));
    }
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 1:
        return !!state.name && !!state.email && !!state.password && !!state.confirmPassword;
      case 2:
        return !!state.locationText;
      case 3:
        return !!state.licensePlate && !!state.vehicleType;
      case 4:
        // Odometer tracking - check if manual or auto-calculate is valid
        if (state.odometerMode === "manual") {
          return true;
        } else {
          // Auto-calculate requires frequency and initial odometer
          return (
            !!state.odometerFrequency &&
            state.initialOdometerKm !== undefined &&
            !!state.initialOdometerDate
          );
        }
      case 5:
        return !!state.rateType && (state.rateType !== "custom" || !!state.customRate);
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEnd className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-bold">Welkom bij Automaatje</h1>
              <p className="text-balance text-sm text-muted-foreground">
                Laten we je account instellen in een paar eenvoudige stappen
              </p>
            </div>
            <WizardStepIndicator currentStep={state.currentStep} totalSteps={6} />
          </CardHeader>

          <CardContent className="space-y-6 px-4 sm:px-6">
            {state.submitError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {state.submitError}
              </div>
            )}

            {state.currentStep === 1 && (
              <StepAccountSetup
                data={{
                  name: state.name,
                  email: state.email,
                  password: state.password,
                  confirmPassword: state.confirmPassword,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
              />
            )}

            {state.currentStep === 2 && (
              <StepLocation
                data={{
                  locationText: state.locationText,
                  locationLat: state.locationLat,
                  locationLon: state.locationLon,
                  locationStatus: state.locationStatus,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
                onVerify={handleVerifyLocation}
                onAddressSelect={handleAddressSelect}
              />
            )}

            {state.currentStep === 3 && (
              <StepVehicle
                data={{
                  licensePlate: state.licensePlate,
                  vehicleType: state.vehicleType,
                  vehicleName: state.vehicleName,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
              />
            )}

            {state.currentStep === 4 && (
              <StepOdometerTracking
                data={{
                  odometerMode: state.odometerMode,
                  odometerFrequency: state.odometerFrequency,
                  initialOdometerKm: state.initialOdometerKm,
                  initialOdometerDate: state.initialOdometerDate,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
              />
            )}

            {state.currentStep === 5 && (
              <StepMileageRates
                data={{
                  rateType: state.rateType,
                  customRate: state.customRate,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
                onSkip={handleSkip}
              />
            )}

            {state.currentStep === 6 && (
              <StepConfirmation
                data={{
                  name: state.name,
                  email: state.email,
                  locationText: state.locationText,
                  locationLat: state.locationLat,
                  locationLon: state.locationLon,
                  licensePlate: state.licensePlate,
                  vehicleType: state.vehicleType,
                  vehicleName: state.vehicleName,
                  odometerMode: state.odometerMode,
                  odometerFrequency: state.odometerFrequency,
                  initialOdometerKm: state.initialOdometerKm,
                  initialOdometerDate: state.initialOdometerDate,
                  rateType: state.rateType,
                  customRate: state.customRate,
                  password: state.password,
                  confirmPassword: state.confirmPassword,
                }}
                onEdit={handleEdit}
              />
            )}
          </CardContent>

          <WizardNavigation
            currentStep={state.currentStep}
            totalSteps={6}
            onBack={handleBack}
            onNext={handleNext}
            isLoading={state.isLoading}
            canProceed={canProceed()}
          />
        </Card>
      </div>
    </div>
  );
}
