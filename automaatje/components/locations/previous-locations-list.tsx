"use client";

import { useState, useMemo } from "react";
import { LocationCard } from "./location-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";
import type { Location } from "@/lib/actions/locations";

interface PreviousLocationsListProps {
  locations: Location[];
  initialDisplayCount?: number;
  incrementCount?: number;
}

export function PreviousLocationsList({
  locations,
  initialDisplayCount = 20,
  incrementCount = 20,
}: PreviousLocationsListProps) {
  const [displayCount, setDisplayCount] = useState(initialDisplayCount);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return locations;
    }

    const query = searchQuery.toLowerCase().trim();
    return locations.filter((location) =>
      location.text.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  // Get locations to display (with pagination)
  const displayedLocations = filteredLocations.slice(0, displayCount);
  const hasMore = displayCount < filteredLocations.length;
  const remainingCount = filteredLocations.length - displayCount;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + incrementCount);
  };

  // If no locations at all
  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nog geen eerder gebruikte locaties gevonden
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Zoek locatie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(initialDisplayCount); // Reset display count on search
            }}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredLocations.length === locations.length ? (
            <span>{locations.length} locatie{locations.length !== 1 ? 's' : ''}</span>
          ) : (
            <span>
              {filteredLocations.length} van {locations.length} locaties
            </span>
          )}
        </div>
      </div>

      {/* Locations Grid */}
      {filteredLocations.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayedLocations.map((location) => (
              <LocationCard
                key={location.id}
                id={location.id}
                text={location.text}
                lat={location.lat}
                lon={location.lon}
                isFavorite={false}
                addedAt={location.addedAt}
                showActions={true}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                className="w-full sm:w-auto"
              >
                <ChevronDown className="mr-2 h-4 w-4" />
                Toon meer ({remainingCount} {remainingCount === 1 ? 'locatie' : 'locaties'})
              </Button>
              <p className="text-xs text-muted-foreground">
                Toont {displayedLocations.length} van {filteredLocations.length} locaties
              </p>
            </div>
          )}

          {/* All Loaded Message */}
          {!hasMore && filteredLocations.length > initialDisplayCount && (
            <p className="text-center text-sm text-muted-foreground">
              Alle {filteredLocations.length} locaties worden getoond
            </p>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Geen locaties gevonden voor &quot;{searchQuery}&quot;
            </p>
            <Button
              variant="link"
              onClick={() => setSearchQuery("")}
              className="mt-2"
            >
              Wis zoekopdracht
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
