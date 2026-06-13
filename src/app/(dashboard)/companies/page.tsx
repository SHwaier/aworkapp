"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/lib/utils/use-debounce";
import { toast } from "sonner";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import {
  Plus,
  Search,
  Building2,
  Loader2,
  MapPin,
  ExternalLink,
  Star,
  Sparkles,
  Info,
} from "lucide-react";

interface Company {
  _id?: string;
  id?: string;
  name: string;
  website: string;
  industry: string;
  location: string;
  rating: number;
  tags: string[];
  doNotApplyAgain: boolean;
  createdAt: string;
}

export default function CompaniesPage() {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewDialog, setShowNewDialog] = useState(
    searchParams.get("new") === "true"
  );

  // New Company form state
  const [newCompany, setNewCompany] = useState({
    name: "",
    website: "",
    careersUrl: "",
    linkedinUrl: "",
    industry: "",
    location: "",
    notes: "",
    rating: 0,
    doNotApplyAgain: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "24",
        sortBy: "name",
        sortOrder: "asc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/companies?${params}`);
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany.name.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Company added successfully ✨");
      setShowNewDialog(false);
      setNewCompany({
        name: "",
        website: "",
        careersUrl: "",
        linkedinUrl: "",
        industry: "",
        location: "",
        notes: "",
        rating: 0,
        doNotApplyAgain: false,
      });
      fetchCompanies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6 px-1">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-primary/5 p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/5 blur-3xl rounded-full" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <Sparkles className="h-3 w-3" />
              Company Library
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text">
              Companies
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage organization profiles, track careers portals, and rate application spaces.
            </p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} className="shadow-md shadow-primary/10 hover:shadow-lg transition-all" id="add-company-btn">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10 h-10 bg-card border-border/80 shadow-xs"
          id="search-companies"
        />
      </div>

      {/* Grid of cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Gathering companies...</span>
        </div>
      ) : companies.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">No companies found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              {search
                ? "Try adjusting your search terms or verify name spelling."
                : "Your company library is currently empty. Organize details of potential workspaces."}
            </p>
            {!search && (
              <Button className="mt-6" onClick={() => setShowNewDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Company
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {companies.map((company) => (
            <Link
              key={company.id || company._id}
              href={`/companies/${company.id || company._id}`}
              className="group block"
            >
              <Card className="h-full border border-border/80 bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-xs group-hover:-translate-y-[2px] flex flex-col justify-between">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 p-5">
                  <div className="space-y-1 pr-2">
                    <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">
                      {company.name}
                    </CardTitle>
                    {company.industry && (
                      <span className="inline-block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded-md">
                        {company.industry}
                      </span>
                    )}
                  </div>
                  {company.doNotApplyAgain && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold shrink-0">
                      DND
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5 text-xs text-muted-foreground font-medium">
                    {company.location ? (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                        {company.location}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-muted-foreground/40 italic">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        No location logged
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-auto">
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < company.rating ? "fill-yellow-500 text-yellow-500" : "text-muted/30"
                          }`}
                        />
                      ))}
                    </div>
                    {company.website && (
                      <span className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 font-bold">
                        Website
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-9"
          >
            Previous
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-9"
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Company Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Add Company
            </DialogTitle>
            <DialogDescription>
              Create a record for a company space you want to track opportunities at.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name" className="text-sm font-semibold">Company Name *</Label>
              <Input
                id="company-name"
                placeholder="e.g. Google"
                value={newCompany.name}
                onChange={(e) =>
                  setNewCompany((p) => ({ ...p, name: e.target.value }))
                }
                className="h-10 bg-card"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-website" className="text-sm font-semibold">Website URL</Label>
              <Input
                id="company-website"
                type="url"
                placeholder="https://google.com"
                value={newCompany.website}
                onChange={(e) =>
                  setNewCompany((p) => ({ ...p, website: e.target.value }))
                }
                className="h-10 bg-card"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="company-industry" className="text-sm font-semibold">Industry</Label>
                <Input
                  id="company-industry"
                  placeholder="e.g. Technology"
                  value={newCompany.industry}
                  onChange={(e) =>
                    setNewCompany((p) => ({ ...p, industry: e.target.value }))
                  }
                  className="h-10 bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-location" className="text-sm font-semibold">Location</Label>
                <LocationAutocomplete
                  id="company-location"
                  placeholder="e.g. Mountain View, CA"
                  value={newCompany.location}
                  onChange={(v) =>
                    setNewCompany((p) => ({ ...p, location: v }))
                  }
                  className="h-10 bg-card"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-rating" className="text-sm font-semibold">Rating (0-5)</Label>
              <Select
                value={newCompany.rating.toString()}
                onValueChange={(v) =>
                  setNewCompany((p) => ({ ...p, rating: parseInt(v || "0") }))
                }
              >
                <SelectTrigger id="company-rating" className="h-10 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      {r} {r === 1 ? "Star" : "Stars"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 py-1.5 px-1 bg-muted/20 border border-border/40 rounded-lg">
              <input
                id="dnd-checkbox"
                type="checkbox"
                checked={newCompany.doNotApplyAgain}
                onChange={(e) =>
                  setNewCompany((p) => ({
                    ...p,
                    doNotApplyAgain: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ml-2 cursor-pointer"
              />
              <Label htmlFor="dnd-checkbox" className="text-xs font-semibold cursor-pointer text-foreground/80 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Do not apply to this company again (DND tag)
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-notes" className="text-sm font-semibold">Private Notes</Label>
              <Textarea
                id="company-notes"
                placeholder="Culture information, interview process details, internal contact references..."
                value={newCompany.notes}
                onChange={(e) =>
                  setNewCompany((p) => ({ ...p, notes: e.target.value }))
                }
                rows={3}
                className="bg-card"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/40 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewDialog(false)}
                className="h-10"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="h-10 px-5" id="submit-new-company">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Company
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
