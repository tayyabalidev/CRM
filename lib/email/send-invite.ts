import { getResendClient } from "@/lib/email/resend";
import { PortalInviteEmail } from "@/lib/email/templates/portal-invite";

interface SendPortalInviteParams {
  to: string;
  workspaceName: string;
  clientName: string;
  inviteUrl: string;
  expiresInDays?: number;
}

export async function sendPortalInviteEmail({
  to,
  workspaceName,
  clientName,
  inviteUrl,
  expiresInDays = 14,
}: SendPortalInviteParams): Promise<{ sent: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { sent: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: `${workspaceName} <onboarding@resend.dev>`,
      to,
      subject: `You're invited to ${clientName}'s portal on ${workspaceName}`,
      react: PortalInviteEmail({ workspaceName, clientName, inviteUrl, expiresInDays }),
    });

    if (error) {
      console.error("[email] Portal invite send error:", error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (err) {
    console.error("[email] Portal invite exception:", err);
    return { sent: false, error: "Failed to send email" };
  }
}
