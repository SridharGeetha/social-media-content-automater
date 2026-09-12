import nodemailer from 'nodemailer';

interface SendInvitationEmailParams {
  toEmail: string;
  role: string;
  workspaceName: string;
  invitationUrl: string;
  inviterName: string;
}

// In-memory dev log for testing invitation links seamlessly in local environment
export const recentInvitationLogs: Array<{
  email: string;
  role: string;
  workspaceName: string;
  invitationUrl: string;
  sentAt: Date;
}> = [];

export async function sendInvitationEmail({
  toEmail,
  role,
  workspaceName,
  invitationUrl,
  inviterName,
}: SendInvitationEmailParams) {
  const logEntry = {
    email: toEmail,
    role,
    workspaceName,
    invitationUrl,
    sentAt: new Date(),
  };
  recentInvitationLogs.unshift(logEntry);
  if (recentInvitationLogs.length > 20) recentInvitationLogs.pop();

  console.log('====================================================');
  console.log(`[INVITATION EMAIL LOGGED]`);
  console.log(`To: ${toEmail}`);
  console.log(`Role: ${role}`);
  console.log(`Workspace: ${workspaceName}`);
  console.log(`Invited By: ${inviterName}`);
  console.log(`Link: ${invitationUrl}`);
  console.log('====================================================');

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Social Automater" <noreply@socialplatform.app>',
        to: toEmail,
        subject: `You have been invited to join ${workspaceName} as a ${role}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1f2937; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
            <h2 style="color: #6366f1; margin-top: 0;">Join ${workspaceName} on Social Automater</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>${workspaceName}</strong> with the role <strong>${role}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${invitationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation & Register</a>
            </p>
            <p style="color: #94a3b8; font-size: 14px;">This invitation will automatically assign you the <strong>${role}</strong> role upon registration. If you did not expect this invite, you can ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
            <p style="color: #64748b; font-size: 12px;">Social Media Content Automater &bull; Team Management</p>
          </div>
        `,
      });
      console.log(`[SMTP] Invitation email delivered to ${toEmail}`);
    } catch (err) {
      console.error('[SMTP Error] Failed to send email via SMTP, logged link instead:', err);
    }
  }

  return { success: true, invitationUrl };
}
