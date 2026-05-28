"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, HelpCircle, Briefcase, Award, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface AnalyticsData {
  totalCount: number;
  interviewCount: number;
  offerCount: number;
  rejectionCount: number;
  statusBreakdown: Record<string, number>;
  sources: Array<{ name: string; count: number }>;
  workModes: Array<{ name: string; count: number }>;
  monthlyTrends: Array<{ label: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          toast.error("Failed to load analytics");
        }
      } catch {
        toast.error("Error connecting to server");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  // Funnel calculations
  const applyCount = data.totalCount;
  const interviewRate = applyCount ? Math.round((data.interviewCount / applyCount) * 100) : 0;
  const offerRate = applyCount ? Math.round((data.offerCount / applyCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & KPIs</h1>
        <p className="text-sm text-muted-foreground">
          Gain insights into your job search application funnel and conversion rates.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total tracked jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Interviews Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{data.interviewCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{interviewRate}% interview conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Offers Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{data.offerCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{offerRate}% offer conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Rejections Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{data.rejectionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {applyCount ? Math.round((data.rejectionCount / applyCount) * 100) : 0}% rejection rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Conversion Section */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Application Conversion Funnel</CardTitle>
          <CardDescription>Visualizing your success rate from apply to offer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Applications Submitted
              </span>
              <span className="font-bold">{data.totalCount}</span>
            </div>
            <Progress value={data.totalCount ? 100 : 0} className="h-3" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <Award className="h-4 w-4 text-blue-500" />
                Interviews Attended
              </span>
              <span className="font-bold text-blue-500">
                {data.interviewCount} ({interviewRate}%)
              </span>
            </div>
            <Progress value={interviewRate} className="h-3 bg-muted" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Offers Received
              </span>
              <span className="font-bold text-green-500">
                {data.offerCount} ({offerRate}%)
              </span>
            </div>
            <Progress value={offerRate} className="h-3 bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Grids */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Sources */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Applications by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center italic">
                No data available.
              </p>
            ) : (
              <div className="space-y-4">
                {data.sources.map((src, idx) => {
                  const percent = data.totalCount ? Math.round((src.count / data.totalCount) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{src.name}</span>
                        <span className="text-muted-foreground">{src.count} ({percent}%)</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Modes */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Applications by Work Mode</CardTitle>
          </CardHeader>
          <CardContent>
            {data.workModes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center italic">
                No data available.
              </p>
            ) : (
              <div className="space-y-4">
                {data.workModes.map((mode, idx) => {
                  const percent = data.totalCount ? Math.round((mode.count / data.totalCount) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium uppercase">{mode.name || "Unspecified"}</span>
                        <span className="text-muted-foreground">{mode.count} ({percent}%)</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Monthly Apply Cadence</CardTitle>
          <CardDescription>Track application activity over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlyTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center italic">
              No trends data available yet. Start applying!
            </p>
          ) : (
            <div className="flex items-end justify-between h-40 pt-4 px-2">
              {data.monthlyTrends.map((trend, idx) => {
                const max = Math.max(...data.monthlyTrends.map((t) => t.count), 1);
                const heightPercent = Math.min((trend.count / max) * 100, 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                    <div className="relative w-full flex justify-center group">
                      {/* Bar tooltip */}
                      <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground text-[10px] py-0.5 px-1.5 rounded pointer-events-none">
                        {trend.count}
                      </span>
                      {/* Visual Bar */}
                      <div
                        className="w-8 sm:w-12 bg-primary/80 rounded-t hover:bg-primary transition-all duration-150 cursor-pointer"
                        style={{ height: `${heightPercent || 4}px`, minHeight: "6px" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                      {trend.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
