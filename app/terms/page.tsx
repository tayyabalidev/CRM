import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        By using this CRM, users agree to use it lawfully and protect workspace account credentials.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Acceptable use</h2>
        <p className="text-sm text-muted-foreground">
          Do not upload harmful content, attempt unauthorized access, or interfere with service operations.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Data ownership</h2>
        <p className="text-sm text-muted-foreground">
          Workspace owners remain responsible for content stored in their workspace and access they grant.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Service changes</h2>
        <p className="text-sm text-muted-foreground">
          Features and limits may change over time. Critical updates are communicated in-app or by email.
        </p>
      </section>
    </main>
  );
}
