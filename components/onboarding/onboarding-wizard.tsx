"use client";

import { useMemo, useState, useTransition } from "react";

import { FieldError } from "@/components/auth/field-error";
import { BrandWordmark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { completeOnboardingAction } from "@/lib/actions/onboarding";
import { currencies } from "@/lib/constants/currencies";
import { appConfig } from "@/lib/config";
import type { OnboardingInput } from "@/lib/validations/onboarding";

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "name", title: "Your name" },
  { id: "workspace", title: "Workspace" },
  { id: "currency", title: "Currency" },
  { id: "timezone", title: "Timezone" },
  { id: "finish", title: "Finish" },
] as const;

function getTimezones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}

export function OnboardingWizard({
  defaultName,
  defaultTimezone,
}: {
  defaultName: string;
  defaultTimezone: string;
}) {
  const timezones = useMemo(() => getTimezones(), []);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<OnboardingInput>({
    fullName: defaultName,
    workspaceName: "",
    currency: "USD",
    timezone: defaultTimezone || "UTC",
  });

  function update<K extends keyof OnboardingInput>(key: K, value: OnboardingInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function canContinue() {
    if (step === 1) {
      return values.fullName.trim().length >= 2;
    }
    if (step === 2) {
      return values.workspaceName.trim().length >= 2;
    }
    if (step === 3) {
      return values.currency.length === 3;
    }
    if (step === 4) {
      return values.timezone.length > 0;
    }
    return true;
  }

  function next() {
    setError(null);
    if (!canContinue()) {
      setError("Fill in this step before continuing.");
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>
        <div className="mb-6 flex gap-1.5">
          {STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`h-1 flex-1 rounded-full ${index <= step ? "bg-foreground" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{STEPS[step].title}</h1>

          <div className="mt-6 space-y-4">
            {step === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {appConfig.name} helps you keep clients, projects, invoices, and time in one place.
                We will set up your first workspace next. This takes about a minute.
              </p>
            ) : null}

            {step === 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Your name</Label>
                <Input
                  id="fullName"
                  value={values.fullName}
                  onChange={(event) => update("fullName", event.target.value)}
                  autoComplete="name"
                  placeholder="Tayyab"
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-1.5">
                <Label htmlFor="workspaceName">Workspace or business name</Label>
                <Input
                  id="workspaceName"
                  value={values.workspaceName}
                  onChange={(event) => update("workspaceName", event.target.value)}
                  placeholder="Studio North"
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-1.5">
                <Label htmlFor="currency">Default currency</Label>
                <Select
                  id="currency"
                  value={values.currency}
                  onChange={(event) => update("currency", event.target.value)}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} — {currency.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  id="timezone"
                  value={values.timezone}
                  onChange={(event) => update("timezone", event.target.value)}
                >
                  {timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  We will create your profile and first workspace with these details.
                </p>
                <dl className="space-y-2 rounded-lg border bg-muted/40 p-3">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{values.fullName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Workspace</dt>
                    <dd className="font-medium">{values.workspaceName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Currency</dt>
                    <dd className="font-medium">{values.currency}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Timezone</dt>
                    <dd className="text-right font-medium">{values.timezone}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <FieldError message={error ?? undefined} />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0 || pending}
              onClick={() => {
                setError(null);
                setStep((current) => Math.max(current - 1, 0));
              }}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await completeOnboardingAction(values);
                    if (result?.error) {
                      setError(result.error);
                    }
                  });
                }}
              >
                {pending ? "Creating workspace..." : "Go to dashboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
