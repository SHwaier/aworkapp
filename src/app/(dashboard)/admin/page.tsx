"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Trash2,
  Users,
  KeyRound,
  Wand2,
  Ellipsis,
  UserX,
  UserCheck,
  Gauge,
  RotateCcw,
} from "lucide-react";
import { AiLimitsCard, type AiSettings } from "@/components/admin/ai-limits-card";

type Role = "user" | "admin";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  hasGoogle: boolean;
  mustChangePassword: boolean;
  disabled: boolean;
  /** Member's own daily AI limit; null = app default */
  aiDailyLimit: number | null;
  aiUsedToday: number;
  createdAt: string;
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "user" as Role };

// Unambiguous characters (no 0/O, 1/l/I) so temp passwords are easy to read aloud
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Random 14-char temporary password that satisfies the server's password rules. */
function generateTempPassword(): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint32Array(14));
    const password = Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return password;
    }
  }
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [pendingDisable, setPendingDisable] = useState<Member | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [pendingReset, setPendingReset] = useState<Member | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [pendingLimit, setPendingLimit] = useState<Member | null>(null);
  const [limitInput, setLimitInput] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAiSettings(data.data.settings);
      })
      .catch(() => toast.error("Failed to load AI settings"));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/members")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load members");
        setMembers(data.data.members);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load members");
      })
      .finally(() => setIsLoading(false));
  }, [isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.errors?.map((e: { message: string }) => e.message).join(", ") ||
            data.error ||
            "Failed to add member"
        );
      }
      setMembers((prev) => [data.data.member, ...prev]);
      toast.success(`${data.data.member.email} can now sign in`);
      setForm(EMPTY_FORM);
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(member: Member) {
    const role: Role = member.role === "admin" ? "user" : "admin";
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
      toast.success(`${member.name} is now ${role === "admin" ? "an admin" : "a member"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  function openReset(member: Member) {
    setResetPassword(generateTempPassword());
    setResetError("");
    setPendingReset(member);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingReset) return;
    const member = pendingReset;
    setResetError("");
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.errors?.map((e: { message: string }) => e.message).join(", ") ||
            data.error ||
            "Failed to reset password"
        );
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, mustChangePassword: true } : m))
      );
      toast.success(`Temporary password set for ${member.email}`);
      setPendingReset(null);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  }

  /** "3 / 20", "3 / ∞" etc. for the AI usage column */
  function effectiveAiLimit(member: Member): number | null {
    if (!aiSettings) return null;
    if (member.role === "admin" && aiSettings.aiExemptAdmins) return null;
    return member.aiDailyLimit ?? aiSettings.aiDailyLimit;
  }

  function openLimit(member: Member) {
    setLimitInput(member.aiDailyLimit === null ? "" : String(member.aiDailyLimit));
    setPendingLimit(member);
  }

  async function saveLimit(member: Member, aiDailyLimit: number | null) {
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDailyLimit }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.errors?.map((e: { message: string }) => e.message).join(", ") ||
            data.error ||
            "Failed to update limit"
        );
      }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, aiDailyLimit } : m)));
      toast.success(
        aiDailyLimit === null
          ? `${member.email} now uses the default AI limit`
          : `${member.email} can run ${aiDailyLimit} AI analyses per day`
      );
      setPendingLimit(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update limit");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetAiUsage(member: Member) {
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/reset-ai-usage`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset usage");
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, aiUsedToday: 0 } : m)));
      toast.success(`Reset today's AI usage for ${member.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset usage");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDisabled(member: Member, disabled: boolean) {
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update member");
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, disabled } : m)));
      toast.success(`${member.email} ${disabled ? "disabled" : "re-enabled"}`);
      setPendingDisable(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setBusyId(null);
    }
  }

  function openDelete(member: Member) {
    setDeleteConfirm("");
    setPendingDelete(member);
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    const member = pendingDelete;
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete member");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${member.email} and all their data were deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete member");
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <Card className="border-border/60 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
            Admins only
          </CardTitle>
          <CardDescription>You don&apos;t have permission to view this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Public signup is disabled. Only members added here can sign in.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} id="admin-add-member" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
      </div>

      {aiSettings && <AiLimitsCard settings={aiSettings} onSaved={setAiSettings} />}

      {/* Members */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Members
            {!isLoading && <Badge variant="secondary">{members.length}</Badge>}
          </CardTitle>
          <CardDescription>Everyone with access to AWorkApp.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sign-in</TableHead>
                    <TableHead className="whitespace-nowrap">AI today</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const isSelf = member.id === user?.id;
                    const isBusy = busyId === member.id;
                    return (
                      <TableRow
                        key={member.id}
                        className={member.disabled ? "opacity-60" : undefined}
                      >
                        <TableCell className="font-medium">
                          {member.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={member.role === "admin" ? "default" : "outline"}>
                              {member.role === "admin" ? "Admin" : "Member"}
                            </Badge>
                            {member.disabled && <Badge variant="destructive">Disabled</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {member.hasGoogle ? "Password + Google" : "Password"}
                            {member.mustChangePassword && (
                              <Badge variant="secondary">Temporary password</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {(() => {
                            const limit = effectiveAiLimit(member);
                            const atLimit = limit !== null && member.aiUsedToday >= limit;
                            return (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className={
                                    atLimit ? "font-semibold text-destructive" : "tabular-nums"
                                  }
                                >
                                  {member.aiUsedToday} / {limit === null ? "∞" : limit}
                                </span>
                                {member.aiDailyLimit !== null && (
                                  <Badge variant="outline" className="text-[10px]">
                                    custom
                                  </Badge>
                                )}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(member.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isBusy}
                                    aria-label={`Actions for ${member.email}`}
                                  />
                                }
                              >
                                {isBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Ellipsis className="h-4 w-4" />
                                )}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => openLimit(member)}>
                                  <Gauge />
                                  Set AI limit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResetAiUsage(member)}
                                  disabled={member.aiUsedToday === 0}
                                >
                                  <RotateCcw />
                                  Reset AI usage
                                </DropdownMenuItem>
                                {!isSelf && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleRoleChange(member)}>
                                      {member.role === "admin" ? <ShieldOff /> : <ShieldCheck />}
                                      {member.role === "admin" ? "Remove admin" : "Make admin"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openReset(member)}>
                                      <KeyRound />
                                      Reset password
                                    </DropdownMenuItem>
                                    {member.disabled ? (
                                      <DropdownMenuItem
                                        onClick={() => handleSetDisabled(member, false)}
                                      >
                                        <UserCheck />
                                        Re-enable
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => setPendingDisable(member)}>
                                        <UserX />
                                        Disable
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => openDelete(member)}
                                    >
                                      <Trash2 />
                                      Delete permanently
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI limit dialog */}
      <Dialog open={!!pendingLimit} onOpenChange={(open) => !open && setPendingLimit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI limit for {pendingLimit?.name}</DialogTitle>
            <DialogDescription>
              Daily resume analyses for {pendingLimit?.email}. Leave empty to use the default
              {aiSettings ? ` (${aiSettings.aiDailyLimit} per day)` : ""}. 0 turns AI off for them.
              {pendingLimit?.role === "admin" && aiSettings?.aiExemptAdmins
                ? " Admins are currently exempt, so this only applies if that changes."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pendingLimit) return;
              const trimmed = limitInput.trim();
              const value = trimmed === "" ? null : Number(trimmed);
              if (value !== null && (!Number.isInteger(value) || value < 0 || value > 1000)) {
                toast.error("Enter a whole number from 0 to 1000, or leave it empty");
                return;
              }
              saveLimit(pendingLimit, value);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="member-ai-limit">Analyses per day</Label>
              <Input
                id="member-ai-limit"
                type="number"
                min={0}
                max={1000}
                step={1}
                placeholder={aiSettings ? `Default (${aiSettings.aiDailyLimit})` : "Default"}
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-40"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPendingLimit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyId === pendingLimit?.id}>
                {busyId === pendingLimit?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setFormError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Share the temporary password with them — they&apos;ll choose their own the first time
              they sign in. They can also use Google sign-in if their Google account uses this
              email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="off"
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="member-password"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  disabled={isCreating}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm({ ...form, password: generateTempPassword() })}
                  disabled={isCreating}
                  className="gap-1.5 shrink-0"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                At least 10 characters with an uppercase letter, a lowercase letter, and a number.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.role === "user" ? "default" : "outline"}
                  onClick={() => setForm({ ...form, role: "user" })}
                  disabled={isCreating}
                >
                  Member
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.role === "admin" ? "default" : "outline"}
                  onClick={() => setForm({ ...form, role: "admin" })}
                  disabled={isCreating}
                  className="gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!pendingReset} onOpenChange={(open) => !open && setPendingReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {pendingReset?.email} will be signed out and must choose a new password the next time
              they sign in. Copy this temporary password and share it with them.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReset} className="space-y-4">
            {resetError && (
              <div
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {resetError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="reset-password"
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={busyId === pendingReset?.id}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPassword(generateTempPassword())}
                  disabled={busyId === pendingReset?.id}
                  className="gap-1.5 shrink-0"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPendingReset(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyId === pendingReset?.id}>
                {busyId === pendingReset?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable confirmation dialog */}
      <Dialog open={!!pendingDisable} onOpenChange={(open) => !open && setPendingDisable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable member?</DialogTitle>
            <DialogDescription>
              {pendingDisable?.email} will be signed out everywhere right away and won&apos;t be
              able to sign in. Their data is kept, and you can re-enable them at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDisable(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDisable && handleSetDisabled(pendingDisable, true)}
              disabled={busyId === pendingDisable?.id}
            >
              {busyId === pendingDisable?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete dialog */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete member permanently?</DialogTitle>
            <DialogDescription>
              This deletes {pendingDelete?.email}&apos;s account and all of their data:
              applications, companies, resumes, notes, timeline, and uploaded files. This cannot be
              undone. To keep their data, disable them instead.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDelete} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-semibold">{pendingDelete?.email}</span> to
                confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                disabled={busyId === pendingDelete?.id}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  busyId === pendingDelete?.id ||
                  deleteConfirm.trim().toLowerCase() !== pendingDelete?.email
                }
              >
                {busyId === pendingDelete?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete permanently
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
