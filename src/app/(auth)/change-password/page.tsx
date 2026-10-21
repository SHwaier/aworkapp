"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";

const LABEL_CLASS = "text-xs font-bold text-muted-foreground tracking-wide uppercase";
const INPUT_CLASS =
  "h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all";

export default function ChangePasswordPage() {
  const { user, isLoading, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRequired = !!user?.mustChangePassword;
  const inputType = showPasswords ? "text" : "password";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="border border-border/80 bg-card/60 backdrop-blur-lg shadow-xl shadow-foreground/2 rounded-2xl overflow-hidden p-6 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-lg shadow-xl shadow-foreground/2 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-1.5 p-6 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          {isRequired ? "Set your password" : "Change password"}
        </CardTitle>
        <CardDescription className="text-muted-foreground/80 font-medium">
          {isRequired
            ? "You're signed in with a temporary password. Choose your own to continue."
            : "Other devices will be signed out after you change it."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 p-6 pt-0">
          {error && (
            <div
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
              role="alert"
              id="change-password-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="current-password" className={LABEL_CLASS}>
              {isRequired ? "Temporary password" : "Current password"}
            </Label>
            <Input
              id="current-password"
              type={inputType}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              autoFocus
              disabled={isSubmitting}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className={LABEL_CLASS}>
              New password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={inputType}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className={`pr-10 ${INPUT_CLASS}`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              At least 10 characters with an uppercase letter, a lowercase letter, and a number.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className={LABEL_CLASS}>
              Confirm new password
            </Label>
            <Input
              id="confirm-password"
              type={inputType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
              className={INPUT_CLASS}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 p-6 pt-2">
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
            disabled={isSubmitting}
            id="change-password-submit"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isRequired ? "Set password and continue" : "Change password"}
          </Button>

          {isRequired ? (
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/settings"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to settings
            </Link>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
