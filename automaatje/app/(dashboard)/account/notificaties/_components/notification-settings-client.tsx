"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, Mail, Webhook, Megaphone, Check, X, Loader2, Send } from "lucide-react";
import {
  updateEmailSettings,
  updateWebhookSettings,
  updateAppriseSettings,
  sendTestEmailNotification,
  verifyWebhook,
  sendTestWebhook,
  testAppriseNotification,
  sendTestNotification,
} from "@/lib/actions/notification-settings";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface NotificationSettingsClientProps {
  initialSettings: any;
  userEmail: string;
  isEmailConfigured: boolean;
}

export function NotificationSettingsClient({
  initialSettings,
  userEmail,
  isEmailConfigured,
}: NotificationSettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Email settings
  const [emailEnabled, setEmailEnabled] = useState(
    initialSettings?.channels?.email ?? false
  );
  const [emailAddress, setEmailAddress] = useState(
    initialSettings?.email?.address || userEmail
  );

  // Webhook settings
  const [webhookEnabled, setWebhookEnabled] = useState(
    initialSettings?.channels?.webhook ?? false
  );
  const [webhookUrl, setWebhookUrl] = useState(
    initialSettings?.webhook?.url || ""
  );
  const [webhookSecret, setWebhookSecret] = useState("");

  // Apprise settings
  const [appriseEnabled, setAppriseEnabled] = useState(
    initialSettings?.channels?.apprise ?? false
  );
  const [appriseUrls, setAppriseUrls] = useState<string[]>(
    initialSettings?.apprise?.urls || []
  );
  const [newAppriseUrl, setNewAppriseUrl] = useState("");

  const handleSaveEmail = () => {
    startTransition(async () => {
      const result = await updateEmailSettings({
        enabled: emailEnabled,
        address: emailAddress,
      });

      if (result.success) {
        toast({
          title: "Opgeslagen",
          description: "E-mail instellingen zijn bijgewerkt",
        });
        router.refresh();
      } else {
        toast({
          title: "Fout",
          description: result.error || "Kon instellingen niet opslaan",
          variant: "destructive",
        });
      }
    });
  };

  const handleTestEmail = () => {
    startTransition(async () => {
      const result = await sendTestEmailNotification();

      if (result.success) {
        toast({
          title: "Test verzonden",
          description: "Controleer je inbox voor de test e-mail",
        });
      } else {
        toast({
          title: "Fout",
          description: result.error || "Kon test e-mail niet verzenden",
          variant: "destructive",
        });
      }
    });
  };

  const handleSaveWebhook = () => {
    startTransition(async () => {
      // Save webhook settings
      const result = await updateWebhookSettings({
        enabled: webhookEnabled,
        url: webhookUrl,
        secret: webhookSecret || undefined,
      });

      if (!result.success) {
        toast({
          title: "Fout",
          description: result.error || "Kon instellingen niet opslaan",
          variant: "destructive",
        });
        return;
      }

      // Auto-verify webhook after saving if URL is provided
      if (webhookUrl) {
        const verifyResult = await verifyWebhook();
        if (verifyResult.success) {
          toast({
            title: "Opgeslagen en geverifieerd",
            description: "Webhook instellingen zijn bijgewerkt en geverifieerd",
          });
        } else {
          toast({
            title: "Opgeslagen",
            description: "Webhook instellingen zijn opgeslagen, maar verificatie mislukt. Gebruik 'Test verzenden' om opnieuw te proberen.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Opgeslagen",
          description: "Webhook instellingen zijn bijgewerkt",
        });
      }

      router.refresh();
    });
  };

  const handleTestWebhook = () => {
    startTransition(async () => {
      const result = await sendTestWebhook(webhookUrl, webhookSecret || undefined);

      if (result.success) {
        toast({
          title: "Test verzonden",
          description: "Controleer je webhook endpoint voor de test notificatie",
        });
      } else {
        toast({
          title: "Fout",
          description: result.error || "Kon test webhook niet verzenden",
          variant: "destructive",
        });
      }
    });
  };

  const handleAddAppriseUrl = () => {
    if (newAppriseUrl && !appriseUrls.includes(newAppriseUrl)) {
      setAppriseUrls([...appriseUrls, newAppriseUrl]);
      setNewAppriseUrl("");
    }
  };

  const handleRemoveAppriseUrl = (url: string) => {
    setAppriseUrls(appriseUrls.filter((u) => u !== url));
  };

  const handleSaveApprise = () => {
    startTransition(async () => {
      const result = await updateAppriseSettings({
        enabled: appriseEnabled,
        urls: appriseUrls,
      });

      if (result.success) {
        toast({
          title: "Opgeslagen",
          description: "Apprise instellingen zijn bijgewerkt",
        });
        router.refresh();
      } else {
        toast({
          title: "Fout",
          description: result.error || "Kon instellingen niet opslaan",
          variant: "destructive",
        });
      }
    });
  };

  const handleTestApprise = () => {
    startTransition(async () => {
      const result = await testAppriseNotification();

      if (result.success) {
        toast({
          title: "Test verzonden",
          description: "Controleer je Apprise services voor de test notificatie",
        });
      } else {
        toast({
          title: "Fout",
          description: result.error || "Kon test notificatie niet verzenden",
          variant: "destructive",
        });
      }
    });
  };

  const handleSendTestNotification = () => {
    startTransition(async () => {
      const result = await sendTestNotification();

      if (result.success) {
        toast({
          title: "Test notificatie verzonden",
          description: "Controleer je inbox en andere kanalen",
        });
        router.refresh();
      } else {
        toast({
          title: "Fout",
          description: result.error || "Kon test notificatie niet verzenden",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test notificatie
          </CardTitle>
          <CardDescription>
            Verstuur een test notificatie naar alle ingeschakelde kanalen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSendTestNotification} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test notificatie verzenden
          </Button>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-mail notificaties
          </CardTitle>
          <CardDescription>
            Ontvang meldingen via e-mail (vereist Resend configuratie)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="email-enabled" className="text-sm">E-mail notificaties inschakelen</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <Switch
                      id="email-enabled"
                      checked={emailEnabled}
                      onCheckedChange={setEmailEnabled}
                      disabled={!isEmailConfigured}
                    />
                  </div>
                </TooltipTrigger>
                {!isEmailConfigured && (
                  <TooltipContent>
                    <p>
                      E-mail notificaties zijn nog niet geconfigureerd door de beheerder (zie Resend-variabelen)
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {emailEnabled && isEmailConfigured && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="email-address">E-mailadres</Label>
                <Input
                  id="email-address"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder={userEmail}
                />
                <p className="text-sm text-muted-foreground">
                  Laat leeg om je account e-mail te gebruiken
                </p>
              </div>

              {initialSettings?.email?.verificationStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  {initialSettings.email.verificationStatus === "verified" ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Geverifieerd
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <X className="h-3 w-3" />
                      Niet geverifieerd
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleSaveEmail} disabled={isPending} className="w-full sm:w-auto">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Opslaan
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  Test e-mail verzenden
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Webhook Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook notificaties
          </CardTitle>
          <CardDescription>
            Verstuur notificaties naar een custom HTTP endpoint (Home Assistant, Zapier, Make.com, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="webhook-enabled" className="text-sm">Webhook notificaties inschakelen</Label>
            <Switch
              id="webhook-enabled"
              checked={webhookEnabled}
              onCheckedChange={setWebhookEnabled}
              className="shrink-0"
            />
          </div>

          {webhookEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-endpoint.com/webhook"
                />
                <p className="text-sm text-muted-foreground">
                  Het endpoint waar notificaties naartoe worden verzonden. Gebruik bij voorkeur een HTTPS URL.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Secret (optioneel)</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Voor HMAC signature verificatie"
                />
                <p className="text-sm text-muted-foreground">
                  Voor beveiligde webhook verificatie via HMAC-SHA256
                </p>
              </div>

              {initialSettings?.webhook?.verificationStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  {initialSettings.webhook.verificationStatus === "verified" ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Geverifieerd
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <X className="h-3 w-3" />
                      Niet geverifieerd
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleSaveWebhook} disabled={isPending} className="w-full sm:w-auto">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Opslaan
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={isPending || !webhookUrl}
                  className="w-full sm:w-auto"
                >
                  Test verzenden
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Apprise Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Apprise notificaties
          </CardTitle>
          <CardDescription>
            Verstuur notificaties naar 100+ services (Discord, Slack, Telegram, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="apprise-enabled" className="text-sm">Apprise notificaties inschakelen</Label>
            <Switch
              id="apprise-enabled"
              checked={appriseEnabled}
              onCheckedChange={setAppriseEnabled}
              className="shrink-0"
            />
          </div>

          {appriseEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="apprise-url">Service URL toevoegen</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="apprise-url"
                    type="text"
                    value={newAppriseUrl}
                    onChange={(e) => setNewAppriseUrl(e.target.value)}
                    placeholder="discord://webhook_id/token"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddAppriseUrl}
                    disabled={!newAppriseUrl}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Toevoegen
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bijvoorbeeld: discord://, slack://, telegram://, mailto://
                </p>
              </div>

              {appriseUrls.length > 0 && (
                <div className="space-y-2">
                  <Label>Geconfigureerde services ({appriseUrls.length})</Label>
                  <div className="space-y-2">
                    {appriseUrls.map((url) => (
                      <div
                        key={url}
                        className="flex items-center justify-between gap-2 rounded-md border p-2"
                      >
                        <code className="min-w-0 flex-1 truncate text-sm">{url}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAppriseUrl(url)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleSaveApprise} disabled={isPending} className="w-full sm:w-auto">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Opslaan
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestApprise}
                  disabled={isPending || appriseUrls.length === 0}
                  className="w-full sm:w-auto"
                >
                  Test verzenden
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Belangrijk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Inbox notificaties</strong> zijn altijd ingeschakeld en vereisen geen configuratie
          </p>
          <p>
            • <strong>E-mail notificaties</strong> vereisen Resend configuratie door de beheerder van Automaatje
          </p>
          <p>
            • Alle notificaties worden eerst in je inbox opgeslagen voordat ze naar andere kanalen worden verzonden
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
