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
import { toast } from "sonner";
import {
  Plus,
  Search,
  Building2,
  Loader2,
  MapPin,
  ExternalLink,
  Star,
  Slash,
} from "lucide-react";

interface Company {
  _id: string;
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
      if (search) params.set("search", search);

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
  }, [page, search]);

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

      toast.success("Company added successfully");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">
            {total} compan{total !== 1 ? "ies" : "y"} tracked
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} id="add-company-btn">
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Filter and search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
          id="search-companies"
        />
      </div>

      {/* Grid of cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No companies found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              {search
                ? "Try adjusting your search terms."
                : "Add companies to organize your applications and contacts."}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
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
              key={company._id}
              href={`/companies/${company._id}`}
              className="group block"
            >
              <Card className="h-full transition-all duration-150 hover:border-primary/30 hover:shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {company.name}
                  </CardTitle>
                  {company.doNotApplyAgain && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                      DND
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {company.industry && <p className="truncate">{company.industry}</p>}
                    {company.location && (
                      <p className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {company.location}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < company.rating ? "fill-yellow-500" : "text-muted/40"
                          }`}
                        />
                      ))}
                    </div>
                    {company.website && (
                      <span className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 font-medium">
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
        <div className="flex items-center justify-center gap-2 pt-4">
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

      {/* Add Company Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>
              Create a record for a company you want to track.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                placeholder="e.g. Google"
                value={newCompany.name}
                onChange={(e) =>
                  setNewCompany((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-website">Website URL</Label>
              <Input
                id="company-website"
                type="url"
                placeholder="https://google.com"
                value={newCompany.website}
                onChange={(e) =>
                  setNewCompany((p) => ({ ...p, website: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="company-industry">Industry</Label>
                <Input
                  id="company-industry"
                  placeholder="e.g. Technology"
                  value={newCompany.industry}
                  onChange={(e) =>
                    setNewCompany((p) => ({ ...p, industry: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-location">Location</Label>
                <Input
                  id="company-location"
                  placeholder="e.g. Mountain View, CA"
                  value={newCompany.location}
                  onChange={(e) =>
                    setNewCompany((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-rating">Rating (0-5)</Label>
              <Select
                value={newCompany.rating.toString()}
                onValueChange={(v) =>
                  setNewCompany((p) => ({ ...p, rating: parseInt(v || "0") }))
                }
              >
                <SelectTrigger id="company-rating">
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

            <div className="flex items-center gap-2 pt-2">
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
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="dnd-checkbox" className="text-sm font-medium">
                Do not apply to this company again
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-notes">Private Notes</Label>
              <Textarea
                id="company-notes"
                placeholder="Culture info, interview process notes, recruiter info, etc."
                value={newCompany.notes}
                onChange={(e) =>
                  setNewCompany((p) => ({ ...p, notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} id="submit-new-company">
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
