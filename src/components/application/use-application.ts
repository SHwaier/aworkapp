"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ApplicationResume } from "@/components/documents/types";

export interface ApplicationDetails {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobUrl: string;
  applicationUrl: string;
  source: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniorityLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  currentStatus: string;
  lifecycleStage: string;
  nextAction: string;
  nextActionDueAt: string | null;
  appliedAt: string | null;
  applicationDeadline: string | null;
  createdAt: string;
  companyId: { _id: string; name: string; website?: string } | null;
}

export interface TimelineEvent {
  _id: string;
  type: string;
  title: string;
  description: string;
  statusAfterEvent: string | null;
  lifecycleStageAfterEvent: string | null;
  eventDate: string;
  source?: string;
}

export interface Note {
  _id: string;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export async function apiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.errors?.[0]?.message || data.error || fallback;
}

/** Loads an application with its timeline, notes, and assigned resume. */
export function useApplication(applicationId: string) {
  const [app, setApp] = useState<ApplicationDetails | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<ApplicationResume | null | undefined>(undefined);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/applications/${applicationId}`);
    if (!res.ok) {
      setLoadError(await apiError(res, "Couldn't load this application"));
      return;
    }
    const { data } = await res.json();
    setApp(data.application);
    setTimeline(data.timeline ?? []);
    setNotes(data.notes ?? []);
  }, [applicationId]);

  const reloadResume = useCallback(async () => {
    const res = await fetch(`/api/applications/${applicationId}/resume`);
    if (!res.ok) {
      setAssigned(null);
      return;
    }
    const { data } = await res.json();
    setAssigned(data.assigned ?? null);
  }, [applicationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    reload();
    reloadResume();
  }, [reload, reloadResume]);

  /** PATCH the application; returns true on success */
  const update = useCallback(
    async (body: Record<string, unknown>, success?: string) => {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(await apiError(res, "Couldn't save the change"));
        return false;
      }
      if (success) toast.success(success);
      await reload();
      // Marking it applied locks the resume version
      if ("currentStatus" in body) reloadResume();
      return true;
    },
    [applicationId, reload, reloadResume]
  );

  return { app, timeline, notes, assigned, loadError, reload, reloadResume, update };
}
