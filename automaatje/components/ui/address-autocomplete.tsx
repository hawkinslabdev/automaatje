"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, MapPin, Search, Navigation, Home, Star, Clock, AlertCircle } from "lucide-react";
import { cn, formatDutchAddress } from "@/lib/utils";

export interface AddressSuggestion {
  id: number;
  displayName: string;
  lat: number;
  lon: number;
  address: {
    road?: string;
    houseNumber?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

export interface Location {
  id: string;
  text: string;
  lat?: number;
  lon?: number;
  isFavorite?: boolean;
  addedAt?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion | Location) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  onlyOpenDropdownOnUserInput?: boolean;
  // New props for enhanced functionality
  showCurrentLocation?: boolean;
  homeAddress?: Location;
  favoriteLocations?: Location[];
  previousLocations?: Location[];
  maxPreviousLocations?: number;
}

// GPS Geolocation hook
function useGeolocation() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback(() => {
    // Check browser support
    if (!navigator.geolocation) {
      setError('Geolocatie wordt niet ondersteund door je browser');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('success');
      },
      (err) => {
        // Map error codes to Dutch messages
        const messages: Record<number, string> = {
          [GeolocationPositionError.PERMISSION_DENIED]:
            'Locatietoegang geweigerd. Controleer je browser instellingen.',
          [GeolocationPositionError.POSITION_UNAVAILABLE]:
            'Positie niet beschikbaar. Controleer of GPS is ingeschakeld.',
          [GeolocationPositionError.TIMEOUT]:
            'Locatie kon niet worden bepaald. Probeer het opnieuw.',
        };
        setError(messages[err.code] || 'Er is een fout opgetreden');
        setStatus('error');
        setPosition(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setPosition(null);
    setError(null);
  }, []);

  return { status, position, error, getCurrentPosition, reset };
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Begin met typen om adressen te zoeken...",
  disabled = false,
  className,
  id,
  autoFocus = false,
  onlyOpenDropdownOnUserInput = false,
  showCurrentLocation = false,
  homeAddress,
  favoriteLocations = [],
  previousLocations = [],
  maxPreviousLocations = 5,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userInteracted, setUserInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const { status: gpsStatus, position: gpsPosition, error: gpsError, getCurrentPosition, reset: resetGps } = useGeolocation();
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Debounced search function
  const searchAddresses = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/address-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSuggestions(result.data);
        // Only auto-open dropdown if user has interacted OR onlyOpenDropdownOnUserInput is false
        if (!onlyOpenDropdownOnUserInput || userInteracted) {
          setIsOpen(result.data.length > 0);
        }
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [onlyOpenDropdownOnUserInput, userInteracted]);

  // Handle input change with debouncing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length >= 3) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        searchAddresses(value);
      }, 500); // 500ms debounce
    } else {
      setSuggestions([]);
      // Don't auto-open dropdown - let onFocus handle it
      setIsLoading(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, searchAddresses]);

  // Handle GPS position success -> reverse geocode
  useEffect(() => {
    if (gpsStatus === 'success' && gpsPosition && !isReverseGeocoding) {
      setIsReverseGeocoding(true);

      // Call reverse geocode API
      fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: gpsPosition.lat, lon: gpsPosition.lon }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            // Auto-fill with the address
            onChange(result.data.text);
            // Call onSelect with Location format
            onSelect({
              id: 'gps-location',
              text: result.data.text,
              lat: result.data.lat,
              lon: result.data.lon,
            });
            setIsOpen(false);
            resetGps();
          } else {
            // Reverse geocoding failed, but we have coordinates
            console.error('Reverse geocoding failed:', result.error);
          }
        })
        .catch((error) => {
          console.error('Reverse geocode error:', error);
        })
        .finally(() => {
          setIsReverseGeocoding(false);
        });
    }
  }, [gpsStatus, gpsPosition, isReverseGeocoding, onChange, onSelect, resetGps]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build all dropdown items
  const allItems = useCallback(() => {
    const items: Array<{ type: 'gps' | 'home' | 'favorite' | 'previous' | 'search' | 'separator' | 'header', data?: Location | AddressSuggestion, label?: string }> = [];

    // Special options (always shown when dropdown is open and input is empty or < 3 chars)
    const showSpecialOptions = value.trim().length < 3;

    if (showSpecialOptions) {
      // GPS Current Location
      if (showCurrentLocation) {
        items.push({ type: 'gps' });
      }

      // Home Address
      if (homeAddress) {
        items.push({ type: 'home', data: homeAddress });
      }

      // Favorites
      if (favoriteLocations.length > 0) {
        items.push({ type: 'header', label: 'Favorieten' });
        favoriteLocations.forEach((loc) => {
          items.push({ type: 'favorite', data: loc });
        });
      }

      // Previous locations (only when no search is active)
      const limitedPrevious = previousLocations.slice(0, maxPreviousLocations);
      if (limitedPrevious.length > 0) {
        items.push({ type: 'header', label: 'Recent gebruikt' });
        limitedPrevious.forEach((loc) => {
          items.push({ type: 'previous', data: loc });
        });
      }
    }

    // Search results (when typing >= 3 chars)
    if (suggestions.length > 0 && value.trim().length >= 3) {
      if (items.length > 0) {
        items.push({ type: 'separator' });
      }
      items.push({ type: 'header', label: 'Zoekresultaten' });
      suggestions.forEach((suggestion) => {
        items.push({ type: 'search', data: suggestion });
      });
    }

    return items;
  }, [value, showCurrentLocation, homeAddress, favoriteLocations, previousLocations, maxPreviousLocations, suggestions]);

  const dropdownItems = allItems();
  const selectableItems = dropdownItems.filter(item =>
    item.type === 'gps' || item.type === 'home' || item.type === 'favorite' || item.type === 'previous' || item.type === 'search'
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || selectableItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < selectableItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < selectableItems.length) {
          const item = selectableItems[selectedIndex];
          if (item.type === 'gps') {
            handleGpsClick();
          } else if (item.data) {
            handleSelectItem(item.data as AddressSuggestion | Location);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectItem = (item: AddressSuggestion | Location) => {
    if ('displayName' in item) {
      // AddressSuggestion from Nominatim
      onChange(item.displayName);
      onSelect(item);
    } else {
      // Location (home, favorite, previous)
      onChange(item.text);
      onSelect(item);
    }
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleGpsClick = () => {
    getCurrentPosition();
  };

  const getFormattedAddress = (suggestion: AddressSuggestion) => {
    const formatted = formatDutchAddress(suggestion.address);
    return formatted || suggestion.displayName;
  };

  // Render a dropdown item
  const renderItem = (item: typeof dropdownItems[0], index: number) => {
    if (item.type === 'separator') {
      return <Separator key={`separator-${index}`} className="my-1" />;
    }

    if (item.type === 'header') {
      return (
        <div key={`header-${index}`} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {item.label}
        </div>
      );
    }

    const selectableIndex = selectableItems.findIndex(si => {
      const siData = si.data as Location | AddressSuggestion | undefined;
      const itemData = item.data as Location | AddressSuggestion | undefined;

      if (si.type === item.type) {
        if (si.type === 'gps') return true;
        if (!siData || !itemData) return false;
        if ('displayName' in siData && 'displayName' in itemData) {
          return siData.id === itemData.id;
        }
        if ('text' in siData && 'text' in itemData) {
          return siData.id === itemData.id;
        }
      }
      return false;
    });
    const isSelected = selectableIndex === selectedIndex;

    if (item.type === 'gps') {
      const isGpsLoading = gpsStatus === 'loading' || isReverseGeocoding;

      return (
        <button
          key="gps-button"
          type="button"
          onClick={handleGpsClick}
          disabled={isGpsLoading}
          aria-label="Huidige locatie gebruiken"
          aria-busy={isGpsLoading}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-accent text-accent-foreground",
            isGpsLoading && "opacity-70"
          )}
        >
          {isGpsLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1">
            {isGpsLoading
              ? (isReverseGeocoding ? 'Adres ophalen...' : 'Huidige locatie ophalen...')
              : 'Huidige locatie gebruiken'}
          </span>
        </button>
      );
    }

    if (item.type === 'home' && item.data) {
      const loc = item.data as Location;
      return (
        <button
          key="home-button"
          type="button"
          onClick={() => handleSelectItem(loc)}
          className={cn(
            "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-accent text-accent-foreground"
          )}
        >
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{loc.text}</p>
            <p className="text-xs text-muted-foreground">Thuisadres</p>
          </div>
        </button>
      );
    }

    if (item.type === 'favorite' && item.data) {
      const loc = item.data as Location;
      return (
        <button
          key={loc.id}
          type="button"
          onClick={() => handleSelectItem(loc)}
          className={cn(
            "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-accent text-accent-foreground"
          )}
        >
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{loc.text}</p>
          </div>
        </button>
      );
    }

    if (item.type === 'previous' && item.data) {
      const loc = item.data as Location;
      return (
        <button
          key={loc.id}
          type="button"
          onClick={() => handleSelectItem(loc)}
          className={cn(
            "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-accent text-accent-foreground"
          )}
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{loc.text}</p>
          </div>
        </button>
      );
    }

    if (item.type === 'search' && item.data) {
      const suggestion = item.data as AddressSuggestion;
      return (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => handleSelectItem(suggestion)}
          className={cn(
            "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-accent text-accent-foreground"
          )}
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {getFormattedAddress(suggestion)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {suggestion.displayName}
            </p>
          </div>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="relative flex-1">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            setUserInteracted(true);
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (onlyOpenDropdownOnUserInput) {
              // Only open if user has interacted (typed) and there's content to show
              if (userInteracted) {
                const hasContent = suggestions.length > 0 ||
                                   showCurrentLocation ||
                                   homeAddress ||
                                   favoriteLocations.length > 0 ||
                                   previousLocations.length > 0;
                if (hasContent) {
                  setIsOpen(true);
                }
              }
            } else {
              // For fields without the flag, open on focus if there's content
              const hasContent = suggestions.length > 0 ||
                                 showCurrentLocation ||
                                 homeAddress ||
                                 favoriteLocations.length > 0 ||
                                 previousLocations.length > 0;
              if (hasContent) {
                setIsOpen(true);
              }
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-10", className)}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && dropdownItems.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
        >
          <div className="max-h-60 overflow-auto p-1" role="listbox">
            {dropdownItems.map((item, index) => renderItem(item, index))}

            {/* GPS Error */}
            {gpsStatus === 'error' && gpsError && (
              <div className="flex items-start gap-2 rounded-sm bg-destructive/10 px-2 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 text-xs">{gpsError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper text */}
      {!isLoading && value.trim().length > 0 && value.trim().length < 3 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Typ minimaal 3 tekens om adressen te zoeken
        </p>
      )}
    </div>
  );
}
