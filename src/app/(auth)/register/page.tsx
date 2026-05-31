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
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(name, email, password, confirmPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function PasswordCheck({
    met,
    label,
  }: {
    met: boolean;
    label: string;
  }) {
    return (
      <li className="flex items-center gap-1.5 text-xs">
        {met ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-muted-foreground/50" />
        )}
        <span
          className={met ? "text-foreground" : "text-muted-foreground"}
        >
          {label}
        </span>
      </li>
    );
  }

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-lg shadow-xl shadow-foreground/2 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-1.5 p-6 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground/80 font-medium">
          Start tracking your job applications
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 p-6 pt-0">
          {error && (
            <div
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
              role="alert"
              id="register-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="register-name" className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Full name</Label>
            <Input
              id="register-name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              autoFocus
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-email" className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Email</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-password" className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Password</Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className="pr-10 h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password strength checklist */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1.5 bg-background/40 p-3 rounded-xl border border-border/50">
                <PasswordCheck
                  met={hasMinLength}
                  label="At least 8 characters"
                />
                <PasswordCheck
                  met={hasLowercase}
                  label="One lowercase letter"
                />
                <PasswordCheck
                  met={hasUppercase}
                  label="One uppercase letter"
                />
                <PasswordCheck met={hasNumber} label="One number" />
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-confirm-password" className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
              Confirm password
            </Label>
            <Input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:bg-background transition-all"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive font-medium mt-1.5">
                Passwords do not match
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 p-6 pt-2">
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
            disabled={
              isSubmitting ||
              !hasMinLength ||
              !hasLowercase ||
              !hasUppercase ||
              !hasNumber ||
              !passwordsMatch
            }
            id="register-submit"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground font-medium">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-primary hover:text-primary/90 transition-colors underline underline-offset-4"
              id="register-login-link"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
