import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def send_sourcing_email(user_email, message_body, item_count):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    to_email = os.getenv("NOTIFICATION_EMAIL", smtp_user)

    if not all([smtp_user, smtp_password]):
        print("[Notifier] SMTP credentials not found in .env. Skipping email.")
        return False

    if not to_email:
        to_email = smtp_user

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = f"[K-Vant Sourcing] 새로운 견적 요청 (요청자: {user_email})"

        body = f"""새로운 B2B 소싱 견적 요청이 접수되었습니다.

■ 요청자: {user_email}
■ 요청 상품 종류: {item_count}개
■ 추가 메시지: 
{message_body}

K-Vant 어드민 페이지 '소싱/견적 관리' 탭에서 내역을 확인하고 견적을 회신해주세요.
"""

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        print("[Notifier] \u2705 Sourcing email alert sent.")
        return True
    except Exception as e:
        print(f"[Notifier] \u274c Failed to send sourcing email: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        user_email = sys.argv[1]
        message_body = sys.argv[2]
        item_count = sys.argv[3]
        send_sourcing_email(user_email, message_body, item_count)
    else:
        print("Usage: python notify_sourcing.py <email> <message> <count>")
