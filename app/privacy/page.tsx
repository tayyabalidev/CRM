import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        This policy explains what personal and business data WorkFlow CRM stores and how it is used.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Data we store</h2>
        <p className="text-sm text-muted-foreground">
          Account details, workspace content, uploaded files, and activity logs needed to operate the service.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">How data is used</h2>
        <p className="text-sm text-muted-foreground">
          Data is used to provide core CRM workflows, secure workspace access, and deliver notifications.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Contact</h2>
        <p className="text-sm text-muted-foreground">
          For privacy requests, contact your workspace owner or support team operating this deployment.
        </p>
      </section>
    </main>
  );
}
