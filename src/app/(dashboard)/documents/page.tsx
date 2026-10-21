"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumesTab } from "@/components/documents/resumes-tab";
import { FilesTab } from "@/components/documents/files-tab";

function DocumentsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const tab = useSearchParams().get("tab") === "files" ? "files" : "resumes";

  return (
    <Tabs
      value={tab}
      onValueChange={(v) =>
        router.replace(v === "files" ? `${pathname}?tab=files` : pathname, { scroll: false })
      }
    >
      <TabsList
        variant="line"
        className="mb-5 h-10 w-full justify-start gap-4 border-b border-border/70 px-0 sm:w-auto sm:border-b-0"
      >
        <TabsTrigger value="resumes" className="flex-none px-0">
          Resumes
        </TabsTrigger>
        <TabsTrigger value="files" className="flex-none px-0">
          Other files
        </TabsTrigger>
      </TabsList>
      <TabsContent value="resumes">
        <ResumesTab />
      </TabsContent>
      <TabsContent value="files">
        <FilesTab />
      </TabsContent>
    </Tabs>
  );
}

export default function DocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your resumes with their version history, and the other files you send with applications.
        </p>
      </div>
      <Suspense>
        <DocumentsTabs />
      </Suspense>
    </div>
  );
}
