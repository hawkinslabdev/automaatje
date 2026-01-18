# Plan: Add "woon-werk" Trip Type and Fix Odometer Bug

## Overview

Add "woon-werk" (commute) as a third trip type alongside "zakelijk" and "privé", and fix the odometer display bug showing "0 → 25 km".

---

## Issue 1: Add "woon-werk" as Third Trip Type

### 1.1 Schema & Validation Updates

**File: `lib/db/schema.ts`** (line ~287)
- Change: `tripType: "zakelijk" | "privé"` → `tripType: "zakelijk" | "privé" | "woon-werk"`

**File: `lib/validations/registration.ts`**
- Update all `z.enum(["zakelijk", "privé"])` to `z.enum(["zakelijk", "privé", "woon-werk"])`
- Lines ~49-51 (createRegistrationSchema)
- Lines ~127 (simpleReimbursementSchema) - change default from "zakelijk" to "woon-werk"

### 1.2 Form Updates

**File: `components/registrations/trip-registration-form.tsx`**
- Line ~110: Update state type to include "woon-werk"
- Lines ~476-487: Add third SelectItem for "Woon-werk"

**File: `components/registrations/edit-trip-form.tsx`**
- Line ~82: Update state type to include "woon-werk"
- Add "Woon-werk" option to the select dropdown

### 1.3 Server Action Updates

**File: `lib/actions/registrations.ts`**
- `createSimpleReimbursementRegistration()` (~line 357): Default placeholder text stays "Woon-werk kilometers"
- Update any hardcoded "zakelijk" | "privé" type annotations

### 1.4 Live Trips Mapping

**File: `lib/actions/live-trips.ts`** (lines 313-321)
- Change COMMUTE mapping from "privé" to "woon-werk":
```typescript
if (data.tripType === "BUSINESS") {
  tripTypeNL = "zakelijk";
} else if (data.tripType === "COMMUTE") {
  tripTypeNL = "woon-werk";  // Was: privé
} else {
  tripTypeNL = "privé";
}
```

---

## Issue 2: Add "woon-werk" Filter to Reports

### 2.1 Odometer Report Filter

**File: `components/rapporten/odometer-report.tsx`** (lines ~396-401)
- Add fourth SelectItem: `<SelectItem value="woon-werk">Woon-werk</SelectItem>`

### 2.2 PDF Export

**File: `lib/actions/pdf-export.ts`**
- Update trip type filtering to handle "woon-werk"
- Update summary statistics to show three categories (if needed)

### 2.3 Report Statistics

**File: `lib/actions/registrations.ts`** (getOdometerReadingsReport ~line 1839)
- Update tripType filter to accept "woon-werk"
- Update statistics calculations to track woon-werk kilometers separately

---

## Issue 3: Fix Odometer Display Bug

### 3.1 Root Cause

**File: `lib/actions/registrations.ts`** (line ~368)
```typescript
// CURRENT (buggy):
startOdometerKm: validated.startOdometerKm || 0,

// FIX:
startOdometerKm: validated.startOdometerKm ?? undefined,
```

This causes "0 → 25 km" when no start odometer is provided.

### 3.2 Display Fix

Views already handle undefined/null correctly with "-" display. The fix is in the server action only.

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `lib/db/schema.ts` | Add "woon-werk" to tripType union |
| `lib/validations/registration.ts` | Update z.enum, change default |
| `components/registrations/trip-registration-form.tsx` | Add woon-werk option |
| `components/registrations/edit-trip-form.tsx` | Add woon-werk option |
| `lib/actions/registrations.ts` | Fix odometer bug, update types |
| `lib/actions/live-trips.ts` | Map COMMUTE to woon-werk |
| `components/rapporten/odometer-report.tsx` | Add woon-werk filter |
| `lib/actions/pdf-export.ts` | Handle woon-werk in export |

---

## Dutch Labels

- "zakelijk" = Zakelijk (Business)
- "privé" = Privé (Private)
- "woon-werk" = Woon-werk (Commute)

---

## Testing Checklist

- [ ] New simple_reimbursement trips default to "woon-werk"
- [ ] Existing trips remain unchanged (zakelijk/privé)
- [ ] Trip form shows 3 options
- [ ] Edit form shows 3 options
- [ ] Report filter shows 4 options (alle, zakelijk, privé, woon-werk)
- [ ] PDF export handles all 3 types
- [ ] Live trip COMMUTE maps to "woon-werk"
- [ ] Odometer displays "-" when not provided (not "0 km")
