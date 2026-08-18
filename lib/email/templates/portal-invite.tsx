import * as React from "react";

interface PortalInviteEmailProps {
  workspaceName: string;
  clientName: string;
  inviteUrl: string;
  expiresInDays?: number;
}

export function PortalInviteEmail({
  workspaceName,
  clientName,
  inviteUrl,
  expiresInDays = 14,
}: PortalInviteEmailProps) {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: 480,
        margin: "0 auto",
        padding: "40px 24px",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 24px" }}>{workspaceName}</h1>

      <p style={{ fontSize: 15, lineHeight: 1.6, margin: "0 0 16px" }}>
        You&apos;ve been invited to access <strong>{clientName}</strong>&apos;s portal on{" "}
        <strong>{workspaceName}</strong>.
      </p>

      <p style={{ fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>
        Sign in or create an account to view projects, invoices, and files shared with you.
      </p>

      <a
        href={inviteUrl}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#18181b",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          borderRadius: 6,
        }}
      >
        Join Portal
      </a>

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 32, lineHeight: 1.5 }}>
        This link expires in {expiresInDays} days. If you didn&apos;t expect this email, you can
        safely ignore it.
      </p>
    </div>
  );
}
