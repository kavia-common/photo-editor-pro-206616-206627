import React, { useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { Button, Card, ErrorBanner, InfoBanner, Input, Spinner } from "../components/ui";

function validateEmail(email) {
  if (!email) return "Email is required.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email.";
  return "";
}

function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return "";
}

// PUBLIC_INTERFACE
export default function AuthPage() {
  const auth = useAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailError = useMemo(() => validateEmail(email), [email]);
  const passwordError = useMemo(() => validatePassword(password), [password]);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (emailError || passwordError) {
      setError("Please fix the validation errors and try again.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await auth.login(email.trim(), password);
      } else {
        await auth.register(email.trim(), password);
      }
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pe-page">
      <div className="pe-center">
        <Card
          title="Photo Editor Pro"
          subtitle="Retro lab for cropping + filters + brightness/contrast"
          right={
            <div className="pe-pill">
              {mode === "login" ? "LOGIN" : "REGISTER"}
            </div>
          }
        >
          <InfoBanner
            message="Tip: If backend endpoints are not available yet, the app runs in an in-browser mock mode so you can still use Upload/Edit/Gallery."
          />
          <ErrorBanner message={error} onDismiss={() => setError("")} />

          <form onSubmit={submit} aria-label="authentication form">
            <Input
              label="Email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={email ? emailError : ""}
              placeholder="you@domain.com"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={password ? passwordError : ""}
              placeholder="••••••"
              hint="Minimum 6 characters"
            />

            <div className="pe-row pe-row--space" style={{ marginTop: 10 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
                disabled={busy}
              >
                {mode === "login" ? "Need an account?" : "Have an account?"}
              </Button>

              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Working..." : mode === "login" ? "Login" : "Create account"}
              </Button>
            </div>

            {busy ? <Spinner label="Authenticating..." /> : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
