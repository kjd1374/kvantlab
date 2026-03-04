import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

def send_error_notification(subject: str, message: str):
    """
    Sends an email notification. 
    Requires SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in .env.
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    to_email = os.getenv("NOTIFICATION_EMAIL", smtp_user)

    if not all([smtp_user, smtp_password]):
        print("[Notifier] \u26a0\ufe0f SMTP credentials not found in .env. Skipping email notification.")
        print(f"[Notifier Log] Subject: {subject}\nMessage: {message}")
        return False

    if not to_email:
        print("[Notifier] \u26a0\ufe0f NOTIFICATION_EMAIL not set, falling back to SMTP_USER.")
        to_email = smtp_user

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = f"[DataPool Alert] {subject}"

        msg.attach(MIMEText(message, 'plain'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        print(f"[Notifier] \u2705 Email alert sent: {subject}")
        return True
    except Exception as e:
        print(f"[Notifier] \u274c Failed to send email: {e}")
        return False

if __name__ == "__main__":
    # Test execution
    send_error_notification("Test Alert", "This is a test notification from DataPool Notifier.")
