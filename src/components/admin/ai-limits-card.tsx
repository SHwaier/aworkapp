"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface AiSettings {
  aiDailyLimit: number;
  aiExemptAdmins: boolean;
}

/** App-wide AI limits: the default daily analyses per member and the admin exemption. */
export function AiLimitsCard({
  settings,
  onSaved,
}: {
  settings: AiSettings;
  onSaved: (settings: AiSettings) => void;
}) {
  const [limit, setLimit] = useState(String(settings.aiDailyLimit));
  const [isSaving, setIsSaving] = useState(false);

  const parsed = Number(limit);
  const limitValid =
    limit.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000;
  const dirty = limitValid && parsed !== settings.aiDailyLimit;

  async function save(patch: Partial<AiSettings>) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.errors?.map((e: { message: string }) => e.message).join(", ") ||
            data.error ||
            "Failed to save"
        );
      }
      onSaved(data.data.settings);
      setLimit(String(data.data.settings.aiDailyLimit));
      toast.success("AI limits updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          AI limits
        </CardTitle>
        <CardDescription>
          How many resume analyses each member can run per day. Limits reset at midnight UTC.
          Re-opening an unchanged analysis or a failed run doesn&apos;t count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) save({ aiDailyLimit: parsed });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="ai-default-limit">Default daily limit</Label>
            <Input
              id="ai-default-limit"
              type="number"
              min={0}
              max={1000}
              step={1}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-32"
              aria-invalid={!limitValid}
            />
          </div>
          <Button type="submit" size="sm" disabled={!dirty || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            0 turns AI analysis off for members without their own limit. You can set a different
            limit for any member from their row below.
          </p>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
          <div>
            <p className="text-sm font-medium">Admins are exempt</p>
            <p className="text-xs text-muted-foreground">
              {settings.aiExemptAdmins
                ? "Admins have no daily limit."
                : "Admins follow the same limits as members."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => save({ aiExemptAdmins: !settings.aiExemptAdmins })}
            aria-pressed={settings.aiExemptAdmins}
          >
            {settings.aiExemptAdmins ? "Apply limits to admins" : "Exempt admins"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
