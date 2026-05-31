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
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { getStatusVariant } from "@/lib/utils/status";

interface DashboardStats {
  totalApplications: number;
  activeApplications: number;
  totalCompanies: number;
  totalResumes: number;
  statusBreakdown: Record<string, number>;
  recentApplications: Array<{
    _id?: string;
    id?: string;
    jobTitle: string;
    currentStatus: string;
    companyId: { name: string } | null;
    createdAt: string;
    nextAction: string;
    nextActionDueAt: string | null;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [analyticsRes, appsRes, companiesRes, resumesRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/applications?limit=5&sortBy=createdAt&sortOrder=desc"),
        fetch("/api/companies?limit=1"),
        fetch("/api/resumes?limit=1"),
      ]);

      const [analyticsData, appsData, companiesData, resumesData] = await Promise.all([
        analyticsRes.json(),
        appsRes.json(),
        companiesRes.json(),
        resumesRes.json(),
      ]);

      let statusBreakdown: Record<string, number> = {};
      let totalApplications = 0;
      if (analyticsData.success) {
        statusBreakdown = analyticsData.data?.statusBreakdown || {};
        totalApplications = analyticsData.data?.totalCount || 0;
      }

      let activeCount = 0;
      const inactiveStatuses = ["Rejected", "Ghosted", "Withdrawn", "Closed / posting removed", "Offer declined"];

      Object.entries(statusBreakdown).forEach(([status, count]) => {
        if (!inactiveStatuses.includes(status)) {
          activeCount += count;
        }
      });

      setStats({
        totalApplications,
        activeApplications: activeCount,
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

  // Calculations for stats
  const interviewCount = 
    (stats?.statusBreakdown["Interview scheduled"] || 0) +
    (stats?.statusBreakdown["Interview completed"] || 0) +
    (stats?.statusBreakdown["Screening scheduled"] || 0) +
    (stats?.statusBreakdown["Screening completed"] || 0) +
    (stats?.statusBreakdown["Technical assessment completed"] || 0) +
    (stats?.statusBreakdown["Final round"] || 0);

  const interviewRate = stats?.totalApplications
    ? Math.round((interviewCount / stats.totalApplications) * 100)
    : 0;

  const offerCount = 
    (stats?.statusBreakdown["Offer received"] || 0) +
    (stats?.statusBreakdown["Offer accepted"] || 0);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-muted/60" />
        </div>
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
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Sleek Gradient Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-primary/5 p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/5 blur-3xl rounded-full" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Active Dashboard
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text">
              {greeting()}, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your application command center. You have <span className="font-semibold text-foreground">{stats?.activeApplications} active processes</span> out of {stats?.totalApplications} total roles.
            </p>
          </div>
          <Link
            href="/applications/new"
            className={buttonVariants({
              variant: "default",
              className: "shadow-md shadow-primary/10 hover:shadow-lg transition-all",
            })}
            id="new-application-button"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Application
          </Link>
        </div>
      </div>

      {/* Grid of Aesthetics Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total App Card */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Applications
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/5 text-primary">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.totalApplications || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Opportunity entries tracked</p>
          </CardContent>
        </Card>

        {/* Active Pipeline Card */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Pipeline
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/5 text-blue-500">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-500">
              {stats?.activeApplications || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Excludes closed/rejected listings</p>
          </CardContent>
        </Card>

        {/* Companies Card */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Target Companies
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/5 text-amber-500">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {stats?.totalCompanies || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Profiles and contact spaces</p>
          </CardContent>
        </Card>

        {/* Interview Rate Card */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Interview Rate
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <div>
              <div className="text-3xl font-black text-emerald-500">
                {stats?.totalApplications ? `${interviewRate}%` : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {interviewCount} roles reached interview
              </p>
            </div>
            {/* Minimalist SVG Radial Progress */}
            {stats?.totalApplications ? (
              <div className="relative h-11 w-11 shrink-0">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="text-muted/30"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${interviewRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Main Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications Listing */}
        <Card className="lg:col-span-2 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Recent Applications
            </CardTitle>
            <Link
              href="/applications"
              id="view-all-applications"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-xs gap-1" })}
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium">No application records</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Create application cards to monitor interview phases and resume tailoring.
                </p>
                <Link
                  href="/applications/new"
                  className={buttonVariants({ size: "sm", className: "mt-4" })}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Application
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.recentApplications.map((app) => (
                  <Link
                    key={app.id || app._id}
                    href={`/applications/${app.id || app._id}`}
                    className="flex items-center justify-between border border-border/50 rounded-xl p-3.5 hover:border-primary/20 hover:bg-accent/30 transition-all group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {app.jobTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {app.companyId?.name || "Unassigned Company"}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(app.currentStatus)} className="text-[10px] px-2 py-0.5 font-bold shrink-0">
                      {app.currentStatus}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar / Quick Actions Panel */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Command Grid</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2.5">
              <Link
                href="/applications/new"
                className="flex items-center justify-between p-3 border border-border/60 rounded-xl hover:border-primary/20 hover:bg-primary/[0.02] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/5 text-primary">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Log Application</p>
                    <p className="text-[10px] text-muted-foreground">Log a job opportunity card</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/companies?new=true"
                className="flex items-center justify-between p-3 border border-border/60 rounded-xl hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/5 text-amber-500">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Create Company Space</p>
                    <p className="text-[10px] text-muted-foreground">Log a company profile</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/resumes"
                className="flex items-center justify-between p-3 border border-border/60 rounded-xl hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Resume Snapshots</p>
                    <p className="text-[10px] text-muted-foreground">Manage files and variations</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>

          {/* Attention / Alert Card */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Actions Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (stats.statusBreakdown["Follow-up needed"] || 0) > 0 ? (
                <div className="rounded-xl border border-warning/20 bg-warning/[0.03] p-3.5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Follow-up Required</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        You have {stats.statusBreakdown["Follow-up needed"]} application
                        {(stats.statusBreakdown["Follow-up needed"] || 0) > 1 ? "s" : ""} marked as needing attention.
                      </p>
                      <Link href="/applications" className="inline-flex items-center gap-1 text-[10px] text-primary font-bold mt-2 hover:underline">
                        Review roles <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3.5 border border-dashed border-border/60 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Pipeline Up-to-date</p>
                    <p className="text-[10px] text-muted-foreground">No pending flags or urgent alerts.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
