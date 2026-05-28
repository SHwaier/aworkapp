"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Shield, User, Sun, Moon, Monitor } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/audit-logs?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Parse user agent to a cleaner form
  function cleanUserAgent(ua: string) {
    if (!ua) return "Unknown Device";
    if (ua.includes("Chrome") && ua.includes("Safari") && !ua.includes("Edg")) {
      return "Chrome (Desktop)";
    }
    if (ua.includes("Safari") && !ua.includes("Chrome")) {
      return "Safari (macOS/iOS)";
    }
    if (ua.includes("Firefox")) {
      return "Firefox";
    }
    if (ua.includes("Edg")) {
      return "Edge";
    }
    return ua.slice(0, 30) + "...";
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Security</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal preferences and inspect account security logs.
        </p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security & Audit Logs</TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6 pt-4">
          {/* Profile Card */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                Profile Information
              </CardTitle>
              <CardDescription>Your registered account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Full Name</span>
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Email Address</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Theme Preferences */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">App Appearance</CardTitle>
              <CardDescription>Select how ApplicationOS looks in your browser.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="gap-1.5"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="gap-1.5"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className="gap-1.5"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Logs Tab */}
        <TabsContent value="security" className="space-y-6 pt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                Security Audit Log
              </CardTitle>
              <CardDescription>
                A record of all sensitive events and log-ins performed on your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs && logs.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">
                  No security events logged yet.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="border border-border/60 rounded-md overflow-hidden bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Device/Browser</TableHead>
                          <TableHead className="text-right">Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-semibold text-xs">
                              <Badge variant="outline" className="text-[10px] lowercase">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {log.ipAddress || "Unknown IP"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={log.userAgent}>
                              {cleanUserAgent(log.userAgent)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
