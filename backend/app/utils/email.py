"""
Email utilities — send welcome emails via Resend.

Uses the Resend Python SDK (https://resend.com/docs/send-with-fastapi).
All emails are sent from welcome@sync-ai.dev.
"""

import base64
from pathlib import Path

import resend
from app.config import get_settings
from app.utils.logger import logger

FROM_EMAIL = "Sync AI <welcome@sync-ai.dev>"

# Load and base64-encode the logo once at import time
_LOGO_PATH = Path(__file__).parent / "icons8-ai.jpg"
_LOGO_B64 = base64.b64encode(_LOGO_PATH.read_bytes()).decode()


def send_welcome_email(to_email: str, user_name: str | None = None) -> None:
    """
    Send a welcome email to a newly registered user.

    Args:
        to_email: The recipient's email address (from Google OAuth).
        user_name: The user's display name (optional).
    """
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not configured — skipping welcome email")
        return

    resend.api_key = settings.resend_api_key

    display_name = user_name or "there"

    try:
        params: resend.Emails.SendParams = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Welcome to Sync AI! 🚀",
            "html": _build_welcome_html(display_name),
            "attachments": [
                {
                    "filename": "logo.jpg",
                    "content": _LOGO_B64,
                    "content_type": "image/jpeg",
                    "content_id": "sync-ai-logo",
                }
            ],
        }

        email_response = resend.Emails.send(params)
        logger.info(
            f"Welcome email sent to {to_email} — "
            f"Resend ID: {email_response.get('id', 'unknown')}"
        )
    except Exception as e:
        # Don't let email failures break the auth flow
        logger.error(f"Failed to send welcome email to {to_email}: {e}")


def _build_welcome_html(name: str) -> str:
    """Build a styled HTML welcome email."""

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e4e4e7;">
          <!-- Logo -->
          <tr>
            <td style="padding:36px 40px 0; text-align:center;">
              <img src="cid:sync-ai-logo" alt="Sync AI" width="48" height="48" style="display:inline-block; width:48px; height:48px;" />
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:16px 40px 20px; text-align:center;">
              <h1 style="margin:0; font-size:28px; font-weight:700; color:#18181b; letter-spacing:-0.5px;">
                Welcome to <span style="background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Sync AI</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:10px 40px 30px;">
              <p style="margin:0 0 20px; font-size:16px; line-height:1.6; color:#3f3f46;">
                Hey {name} 👋
              </p>
              <p style="margin:0 0 20px; font-size:16px; line-height:1.6; color:#3f3f46;">
                Thanks for signing up! We're excited to have you on board.
                Sync AI is your intelligent assistant — ready to help you with conversations, document analysis, and so much more.
              </p>
              <p style="margin:0 0 30px; font-size:16px; line-height:1.6; color:#3f3f46;">
                Here's what you can do right away:
              </p>

              <!-- Feature list -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 16px; background-color:#eef2ff; border-radius:8px; margin-bottom:8px;">
                    <p style="margin:0; font-size:14px; color:#4338ca;">💬 &nbsp;Start a conversation with Sync AI</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px; background-color:#eef2ff; border-radius:8px;">
                    <p style="margin:0; font-size:14px; color:#4338ca;">📄 &nbsp;Upload documents for instant analysis</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px; background-color:#eef2ff; border-radius:8px;">
                    <p style="margin:0; font-size:14px; color:#4338ca;">🔍 &nbsp;Search the web with AI-powered results</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;">
                <tr>
                  <td align="center">
                    <a href="https://sync-ai.dev" target="_blank"
                       style="display:inline-block; padding:14px 32px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#ffffff; text-decoration:none; font-size:16px; font-weight:600; border-radius:8px; letter-spacing:0.3px;">
                      Get Started →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 30px; border-top:1px solid #e4e4e7; text-align:center;">
              <p style="margin:0; font-size:13px; color:#71717a;">
                © 2026 Sync AI · All rights reserved
              </p>
              <p style="margin:8px 0 0; font-size:12px; color:#a1a1aa;">
                You're receiving this because you signed up for Sync AI.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
