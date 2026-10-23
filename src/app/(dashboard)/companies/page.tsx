"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Ban, Loader2, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { useDebounce } from "@/lib/utils/use-debounce";

interface Company {
  _id: string;
  name: string;
  website: string;
  industry: string;
  location: string;
  rating: number;
  doNotApplyAgain: boolean;
  applicationCount: number;
}

const PAGE_SIZE = 50;

function CompaniesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(searchParams.get("new") === "true");

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: "name",
      sortOrder: "asc",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/companies?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error);
        setCompanies(data.data.companies);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error("Couldn't load your companies"));
  }, [page, debouncedSearch, reloadKey]);

  const firstRun = companies !== null && companies.length === 0 && !debouncedSearch;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The companies you&apos;ve applied to or are watching.
          </p>
        </div>
        {!firstRun && (
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Add company
          </Button>
        )}
      </div>

      {companies === null ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : firstRun ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No companies yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Companies are added automatically when you create an application. You can also add one
            you want to keep an eye on.
          </p>
          <Button onClick={() => setAddOpen(true)} className="mt-5 gap-1.5">
            <Plus className="h-4 w-4" />
            Add company
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search companies"
                className="pl-9"
                aria-label="Search companies"
                id="search-companies"
              />
            </div>
            <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
              {total === 1 ? "1 company" : `${total} companies`}
            </span>
          </div>

          {companies.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No companies match &ldquo;{debouncedSearch}&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
              {companies.map((c) => (
                <CompanyRow key={c._id} company={c} />
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <AddCompanyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(id) => {
          setReloadKey((k) => k + 1);
          router.push(`/companies/${id}`);
        }}
      />
    </div>
  );
}

function CompanyRow({ company: c }: { company: Company }) {
  const facts = [c.industry, c.location].filter(Boolean);
  const apps =
    c.applicationCount === 0
      ? "No applications"
      : c.applicationCount === 1
        ? "1 application"
        : `${c.applicationCount} applications`;

  return (
    <li className="relative flex items-center gap-3 p-4 hover:bg-muted/30">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground"
        aria-hidden
      >
        {c.name.trim().charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/companies/${c._id}`}
          className="block truncate font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none"
        >
          {c.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
          <span className="sm:hidden">{apps}</span>
          {c.doNotApplyAgain && (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
              <Ban className="h-3.5 w-3.5" />
              Do not apply
            </span>
          )}
        </p>
      </div>
      <div className="hidden shrink-0 text-right text-sm sm:block">
        <p>{apps}</p>
        {c.rating > 0 && (
          <p
            className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground"
            aria-label={`Rated ${c.rating} out of 5`}
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            {c.rating}/5
          </p>
        )}
      </div>
    </li>
  );
}

function AddCompanyDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (id: string) => void;
}) {
  const empty = { name: "", website: "", industry: "", location: "" };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.errors?.[0]?.message || data.error);
      toast.success(`Added ${form.name.trim()}`);
      setForm(empty);
      onOpenChange(false);
      onAdded(data.data.company.id ?? data.data.company._id);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't add the company");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a company</DialogTitle>
          <DialogDescription>
            You can add a rating, notes, and other details on the company&apos;s page.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Name</Label>
            <Input
              id="company-name"
              value={form.name}
              required
              maxLength={200}
              placeholder="e.g. Shopify"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-website">Website (optional)</Label>
            <Input
              id="company-website"
              type="url"
              value={form.website}
              placeholder="https://"
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              disabled={busy}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-industry">Industry (optional)</Label>
              <Input
                id="company-industry"
                value={form.industry}
                placeholder="e.g. E-commerce"
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-location">Location (optional)</Label>
              <LocationAutocomplete
                id="company-location"
                value={form.location}
                placeholder="e.g. Toronto, ON"
                onChange={(v) => setForm({ ...form, location: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !form.name.trim()} id="submit-new-company">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense>
      <CompaniesList />
    </Suspense>
  );
}
