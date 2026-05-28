"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  FileText,
  TrendingUp,
  Plus,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface DashboardStats {
  totalApplications: number;
  activeApplications: number;
  totalCompanies: number;
  totalResumes: number;
  statusBreakdown: Record<string, number>;
  recentApplications: Array<{
    _id: string;
    jobTitle: string;
    currentStatus: string;
    companyId: { name: string } | null;
    createdAt: string;
    nextAction: string;
    nextActionDueAt: string | null;
  }>;
}

// Status color mapping for badges
function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const positive = [
    "Offer received",
    "Offer accepted",
    "Interview scheduled",
    "Interview completed",
    "Final round",
  ];
  const negative = ["Rejected", "Ghosted", "Withdrawn", "Closed / posting removed"];
  const warning = ["Follow-up needed", "Technical assessment pending"];

  if (positive.includes(status)) return "default";
  if (negative.includes(status)) return "destructive";
  if (warning.includes(status)) return "secondary";
  return "outline";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [appsRes, companiesRes, resumesRes] = await Promise.all([
        fetch("/api/applications?limit=5&sortBy=createdAt&sortOrder=desc"),
        fetch("/api/companies?limit=1"),
        fetch("/api/resumes?limit=1"),
      ]);

      const [appsData, companiesData, resumesData] = await Promise.all([
        appsRes.json(),
        companiesRes.json(),
        resumesRes.json(),
      ]);

      // Build status breakdown from applications
      const statusBreakdown: Record<string, number> = {};
      if (appsData.success) {
        // We need all apps for status breakdown, fetch count by each status
        // For MVP, we'll use what we have
        for (const app of appsData.data?.applications || []) {
          statusBreakdown[app.currentStatus] =
            (statusBreakdown[app.currentStatus] || 0) + 1;
        }
      }

      setStats({
        totalApplications: appsData.data?.pagination?.total || 0,
        activeApplications: appsData.data?.pagination?.total || 0,
        totalCompanies: companiesData.data?.pagination?.total || 0,
        totalResumes: resumesData.data?.pagination?.total || 0,
        statusBreakdown,
        recentApplications: appsData.data?.applications || [],
      });
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your job search progress.
          </p>
        </div>
        <Link
          href="/applications?new=true"
          className={buttonVariants({ variant: "default" })}
          id="new-application-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Applications
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalApplications || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalCompanies || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resume Versions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalResumes || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interview Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalApplications
                ? `${Math.round(
                    ((stats?.statusBreakdown["Interview completed"] ||
                      0) /
                      stats.totalApplications) *
                      100
                  )}%`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Recent Applications
            </CardTitle>
            <Link
              href="/applications"
              id="view-all-applications"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No applications yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start tracking your job search by adding your first
                  application.
                </p>
                <Link
                  href="/applications?new=true"
                  className={buttonVariants({ size: "sm", className: "mt-4" })}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Application
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.recentApplications.map((app) => (
                  <Link
                    key={app._id}
                    href={`/applications/${app._id}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {app.jobTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {app.companyId?.name || "No company"}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(app.currentStatus)}>
                      {app.currentStatus}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/applications?new=true"
              className={buttonVariants({ variant: "outline", className: "w-full justify-start" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
            <Link
              href="/companies?new=true"
              className={buttonVariants({ variant: "outline", className: "w-full justify-start" })}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Add Company
            </Link>
            <Link
              href="/resumes?new=true"
              className={buttonVariants({ variant: "outline", className: "w-full justify-start" })}
            >
              <FileText className="mr-2 h-4 w-4" />
              Upload Resume
            </Link>

            <div className="pt-4">
              <h4 className="mb-2 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Needs Attention
              </h4>
              {stats &&
              (stats.statusBreakdown["Follow-up needed"] || 0) > 0 ? (
                <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span>
                      {stats.statusBreakdown["Follow-up needed"]}{" "}
                      follow-up
                      {(stats.statusBreakdown["Follow-up needed"] || 0) > 1
                        ? "s"
                        : ""}{" "}
                      needed
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up! 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
