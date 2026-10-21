"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ApplicationHeader } from "@/components/application/application-header";
import { OverviewTab, type ApplicationTab } from "@/components/application/overview-tab";
import { ResumeTab } from "@/components/application/resume-tab";
import { JobDescriptionTab } from "@/components/application/job-description-tab";
import { NotesTab } from "@/components/application/notes-tab";
import { ActivityTab } from "@/components/application/activity-tab";
import { apiError, useApplication } from "@/components/application/use-application";
import { cn } from "@/lib/utils";

const TABS: ApplicationTab[] = ["overview", "resume", "job", "notes", "activity"];

function ApplicationDetail({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ApplicationTab | null;
  const tab: ApplicationTab = tabParam && TABS.includes(tabParam) ? tabParam : "overview";
  const { app, timeline, notes, assigned, loadError, reload, reloadResume, update } =
    useApplication(applicationId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function goTo(next: ApplicationTab) {
    router.replace(next === "overview" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  async function deleteApplication() {
    const res = await fetch(`/api/applications/${applicationId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiError(res, "Couldn't delete the application"));
      throw new Error();
    }
    toast.success("Application deleted");
    router.push("/applications");
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">{loadError}</p>
        <Link href="/applications" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          Back to applications
        </Link>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const count = (n: number) =>
    n > 0 ? <span className="text-xs tabular-nums text-muted-foreground">{n}</span> : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ApplicationHeader app={app} onUpdate={update} onDelete={() => setDeleteOpen(true)} />

      <Tabs value={tab} onValueChange={(v) => goTo(v as ApplicationTab)}>
        <div className="-mx-4 overflow-x-auto border-b border-border/70 px-4 sm:mx-0 sm:px-0">
          <TabsList variant="line" className="h-10 w-max justify-start gap-5 px-0">
            <TabsTrigger value="overview" className="flex-none px-0">
              Overview
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex-none px-0">
              Resume
            </TabsTrigger>
            <TabsTrigger value="job" className="flex-none px-0">
              <span className="sm:hidden">Job</span>
              <span className="hidden sm:inline">Job description</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-none gap-1.5 px-0">
              Notes
              {count(notes.length)}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-none gap-1.5 px-0">
              Activity
              {count(timeline.length)}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="pt-5">
          <OverviewTab
            key={`${app.nextAction}-${app.nextActionDueAt}`}
            app={app}
            timeline={timeline}
            notes={notes}
            assigned={assigned}
            onUpdate={update}
            goTo={goTo}
          />
        </TabsContent>
        <TabsContent value="resume" className="pt-5">
          <ResumeTab applicationId={applicationId} assigned={assigned} onChanged={reloadResume} />
        </TabsContent>
        <TabsContent value="job" className="pt-5">
          <JobDescriptionTab
            key={app.jobDescription.length}
            description={app.jobDescription}
            onSave={update}
          />
        </TabsContent>
        <TabsContent value="notes" className="pt-5">
          <NotesTab applicationId={applicationId} notes={notes} onChanged={reload} />
        </TabsContent>
        <TabsContent value="activity" className="pt-5">
          <ActivityTab
            applicationId={applicationId}
            timeline={timeline}
            onChanged={async () => {
              await reload();
              reloadResume();
            }}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${app.jobTitle}?`}
        description="Its notes, activity, and resume link are deleted too. Your resumes stay in Documents. This can't be undone."
        confirmLabel="Delete application"
        onConfirm={deleteApplication}
      />
    </div>
  );
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <ApplicationDetail applicationId={id} />
    </Suspense>
  );
}
