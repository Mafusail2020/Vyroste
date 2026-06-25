import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from core.config import settings


def _send(to_email: str, subject: str, html: str) -> None:
    """Shared SMTP send. No-ops silently if SMTP isn't configured."""
    if not settings.sendpulse_smtp_user or not settings.sendpulse_smtp_pass:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Виросте <{settings.from_email}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    with smtplib.SMTP(settings.sendpulse_smtp_host, settings.sendpulse_smtp_port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.sendpulse_smtp_user, settings.sendpulse_smtp_pass)
        smtp.sendmail(settings.from_email, to_email, msg.as_string())


def send_welcome_email(to_email: str) -> None:
    """Welcome email sent right after registration."""
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#1a1a1a;">
  <div style="background:#2B6117;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px;font-weight:900;">🌱 ВИРОСТЕ</h1>
  </div>
  <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
    <h2 style="color:#2B6117;margin-top:0;font-size:20px;">Ласкаво просимо!</h2>
    <p style="font-size:16px;line-height:1.7;">
      Дякуємо за реєстрацію у <strong>Виросте</strong> — вашому персональному садовому помічнику.
      Завершіть налаштування, щоб отримати календар посіву, адаптований під погоду вашого регіону.
    </p>
    <ul style="font-size:15px;line-height:1.8;color:#374151;padding-left:18px;">
      <li>📅 Регіональний календар посіву (овочі, квіти + місячний)</li>
      <li>🗺️ Мапа перевірених розсадників поруч</li>
      <li>📚 База знань — гіди та поради агрономів</li>
    </ul>
    <div style="text-align:center;margin:32px 0;">
      <a href="{settings.frontend_origin}/onboarding"
         style="display:inline-block;padding:14px 32px;background:#2B6117;color:white;text-decoration:none;border-radius:8px;font-weight:900;font-size:15px;">
        Налаштувати календар →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      Виросте — ваш персональний садовий помічник
    </p>
  </div>
</body>
</html>"""
    _send(to_email, "🌱 Ласкаво просимо до Виросте!", html)


def send_gdd_alert(to_email: str, crop_name: str, gdd_pct: float) -> None:
    """Send harvest-approaching email. No-ops silently if SMTP not configured."""
    if not settings.sendpulse_smtp_user or not settings.sendpulse_smtp_pass:
        return

    pct_int = round(gdd_pct * 100)
    subject = f"🌱 {crop_name} — час готуватись до збору врожаю!"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#1a1a1a;">
  <div style="background:#2B6117;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px;font-weight:900;">🌱 ВИРОСТЕ</h1>
  </div>
  <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
    <h2 style="color:#2B6117;margin-top:0;font-size:20px;">Час готуватись до збору врожаю!</h2>
    <p style="font-size:16px;line-height:1.7;margin-bottom:8px;">
      Ваша культура <strong>{crop_name}</strong> накопичила
      <strong style="color:#2B6117;font-size:19px;">{pct_int}%</strong>
      від цільового показника GDD.
    </p>
    <p style="color:#6b7280;line-height:1.6;font-size:14px;">
      Рекомендуємо заздалегідь підготуватись до збору: перевірте стан рослин, підготуйте тару та інструменти.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="{settings.frontend_origin}/calendar"
         style="display:inline-block;padding:14px 32px;background:#2B6117;color:white;text-decoration:none;border-radius:8px;font-weight:900;font-size:15px;">
        Відкрити календар →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      Виросте — ваш персональний садовий помічник<br>
      Ви отримали цей лист як власник Преміум-акаунту
    </p>
  </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Виросте <{settings.from_email}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.sendpulse_smtp_host, settings.sendpulse_smtp_port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.sendpulse_smtp_user, settings.sendpulse_smtp_pass)
        smtp.sendmail(settings.from_email, to_email, msg.as_string())
