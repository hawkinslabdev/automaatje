"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WizardStepIndicator } from "@/components/onboarding/wizard-step-indicator";
import { WizardNavigation } from "@/components/onboarding/wizard-navigation";
import { StepAccountSetup } from "@/components/onboarding/step-account-setup";
import { StepLocation } from "@/components/onboarding/step-location";
import { StepTrackingMode } from "@/components/onboarding/step-tracking-mode";
import { StepVehicle } from "@/components/onboarding/step-vehicle";
import { StepMileageRates } from "@/components/onboarding/step-mileage-rates";
import { StepConfirmation } from "@/components/onboarding/step-confirmation";
import { completeRegistration } from "@/lib/actions/registration-onboarding";
import { fetchVehicleDetails } from "@/lib/actions/vehicles";
import {
  accountSetupSchema,
  locationSchema,
  trackingModeSchema,
  vehicleRegistrationSchema,
  mileageRatesSchema,
} from "@/lib/validations/registration-onboarding";
import type { RegistrationWizardData } from "@/lib/validations/registration-onboarding";

interface WizardState {
  currentStep: number;
  // Step 1: Account
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Location
  locationText: string;
  locationLat?: number;
  locationLon?: number;
  locationStatus: 'idle' | 'loading' | 'success' | 'error';
  // Step 3: Tracking Mode
  trackingMode: "full_registration" | "simple_reimbursement";
  // Step 4: Vehicle + Odometer
  licensePlate: string;
  vehicleType: "Auto" | "Motorfiets" | "Scooter" | "Fiets";
  vehicleName?: string;
  initialOdometerKm?: number;
  initialOdometerDate?: string;
  // Step 5: Mileage Rates
  rateType: "standard" | "custom" | "none";
  customRate?: number;
  // UI State
  errors: Record<string, string | undefined>;
  isLoading: boolean;
  submitError?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    // Step 1: Account
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Step 2: Location
    locationText: "",
    locationStatus: 'idle',
    // Step 3: Tracking Mode
    trackingMode: "full_registration", // Default to full registration
    // Step 4: Vehicle + Odometer
    licensePlate: "",
    vehicleType: "Auto",
    // Step 5: Mileage Rates
    rateType: "standard",
    // UI State
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
          trackingModeSchema.parse({
            trackingMode: state.trackingMode,
          });
          break;
        case 4:
          vehicleRegistrationSchema.parse({
            licensePlate: state.licensePlate,
            vehicleType: state.vehicleType,
            vehicleName: state.vehicleName || undefined,
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
        // Step 1: Account
        name: state.name,
        email: state.email,
        password: state.password,
        confirmPassword: state.confirmPassword,
        // Step 2: Location
        locationText: state.locationText,
        locationLat: state.locationLat,
        locationLon: state.locationLon,
        // Step 3: Tracking Mode
        trackingMode: state.trackingMode,
        // Step 4: Vehicle + Odometer
        licensePlate: state.licensePlate,
        vehicleType: state.vehicleType,
        vehicleName: state.vehicleName,
        initialOdometerKm: state.initialOdometerKm,
        initialOdometerDate: state.initialOdometerDate,
        // Step 5: Mileage Rates
        rateType: state.rateType,
        customRate: state.customRate,
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
        // Account: all fields required
        return !!state.name && !!state.email && !!state.password && !!state.confirmPassword;
      case 2:
        // Location: text required
        return !!state.locationText;
      case 3:
        // Tracking Mode: always valid (has default)
        return !!state.trackingMode;
      case 4:
        // Vehicle: license plate and type required, odometer optional
        return !!state.licensePlate && !!state.vehicleType;
      case 5:
        // Mileage Rates: rate type required, custom rate if custom selected
        return !!state.rateType && (state.rateType !== "custom" || !!state.customRate);
      case 6:
        // Confirmation: always valid
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

            {/* Step 1: Account Setup */}
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

            {/* Step 2: Location */}
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

            {/* Step 3: Tracking Mode */}
            {state.currentStep === 3 && (
              <StepTrackingMode
                data={{
                  trackingMode: state.trackingMode,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
              />
            )}

            {/* Step 4: Vehicle + Odometer */}
            {state.currentStep === 4 && (
              <StepVehicle
                data={{
                  licensePlate: state.licensePlate,
                  vehicleType: state.vehicleType,
                  vehicleName: state.vehicleName,
                  initialOdometerKm: state.initialOdometerKm,
                  initialOdometerDate: state.initialOdometerDate,
                }}
                errors={state.errors}
                onChange={handleFieldChange}
              />
            )}

            {/* Step 5: Mileage Rates */}
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

            {/* Step 6: Confirmation */}
            {state.currentStep === 6 && (
              <StepConfirmation
                data={{
                  name: state.name,
                  email: state.email,
                  locationText: state.locationText,
                  locationLat: state.locationLat,
                  locationLon: state.locationLon,
                  trackingMode: state.trackingMode,
                  licensePlate: state.licensePlate,
                  vehicleType: state.vehicleType,
                  vehicleName: state.vehicleName,
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
