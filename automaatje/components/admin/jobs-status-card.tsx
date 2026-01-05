"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface JobStats {
  pending: number;
  failed: number;
  total: number;
  lastProcessed: string | null;
}

export function JobsStatusCard() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  async function fetchStats() {
    try {
      const response = await fetch("/api/admin/jobs/stats");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch job stats:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function processNow() {
    setIsProcessing(true);
    try {
      await fetch("/api/jobs/process", { method: "POST" });
      await fetchStats();
    } catch (err) {
      console.error("Failed to process jobs:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Background jobs
        </CardTitle>
        <CardDescription className="text-xs">
          Automatische verwerking van voertuiggegevens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Wachtrij</p>
              <p className="text-lg font-semibold">{stats.pending}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mislukt</p>
              <p className="text-lg font-semibold">{stats.failed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Totaal</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
          </div>
        )}

        {stats?.lastProcessed && (
          <p className="text-xs text-muted-foreground text-center">
            Laatst verwerkt: {format(new Date(stats.lastProcessed), "dd-MM HH:mm")}
          </p>
        )}

        {stats && stats.pending > 0 && (
          <div className="rounded-md bg-yellow-500/15 p-2 text-xs text-yellow-700 dark:text-yellow-400">
            <p className="font-medium">Er staan jobs in de wachtrij</p>
            <p className="text-xs mt-1">
              Deze worden automatisch verwerkt via externe cron. Of klik op "Nu verwerken".
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={processNow}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Bezig...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Nu verwerken
            </>
          )}
        </Button>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Hoe werkt dit?
          </summary>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <p>• Jobs worden automatisch aangemaakt bij voertuigacties</p>
            <p>• Externe cron service verwerkt deze regelmatig</p>
            <p>• RDW gegevens worden asynchroon opgehaald</p>
            <p>• Zie documentatie voor Docker/cron setup</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
