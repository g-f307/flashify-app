# back/app/email_service.py
import os
from pathlib import Path
from typing import List, Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from jinja2 import Environment, FileSystemLoader
from pydantic import EmailStr
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Configuração do serviço de e-mail
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=os.getenv("MAIL_USE_CREDENTIALS", "True").lower() == "true",
    VALIDATE_CERTS=os.getenv("MAIL_VALIDATE_CERTS", "True").lower() == "true",
    TEMPLATE_FOLDER=Path(__file__).parent / "email_templates"
)

fast_mail = FastMail(conf)

# Configurar Jinja2 para templates
template_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "email_templates")
)

class EmailService:
    """Serviço centralizado para envio de e-mails"""
    
    @staticmethod
    async def send_welcome_email(email: EmailStr, username: str) -> bool:
        """
        Envia e-mail de boas-vindas após cadastro
        """
        try:
            template = template_env.get_template("welcome.html")
            html_content = template.render(
                username=username,
                email=email,
                frontend_url=os.getenv("FRONTEND_URL", "http://localhost:4000"),
                whatsapp_link=os.getenv("WHATSAPP_LINK", "https://wa.me/5592000000000"),
                telegram_link=os.getenv("TELEGRAM_LINK", "https://t.me/flashify")
            )
            
            message = MessageSchema(
                subject="Bem-vindo(a) ao Flashify! 🎉",
                recipients=[email],
                body=html_content,
                subtype=MessageType.html
            )
            
            await fast_mail.send_message(message)
            logger.info(f"✅ E-mail de boas-vindas enviado para {email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar e-mail de boas-vindas para {email}: {e}")
            return False
    
    @staticmethod
    async def send_inactivity_reminder(email: EmailStr, username: str, days_inactive: int) -> bool:
        """
        Envia e-mail lembrando usuário inativo
        """
        try:
            template = template_env.get_template("inactivity_reminder.html")
            html_content = template.render(
                username=username,
                email=email,
                days_inactive=days_inactive,
                dashboard_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/dashboard",
                create_deck_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/create",
                whatsapp_link=os.getenv("WHATSAPP_LINK", "https://wa.me/5592000000000"),
                telegram_link=os.getenv("TELEGRAM_LINK", "https://t.me/flashify")
            )
            
            message = MessageSchema(
                subject=f"Sentimos sua falta! 😊 - Volte ao Flashify",
                recipients=[email],
                body=html_content,
                subtype=MessageType.html
            )
            
            await fast_mail.send_message(message)
            logger.info(f"✅ E-mail de inatividade enviado para {email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar e-mail de inatividade para {email}: {e}")
            return False
    
    @staticmethod
    async def send_incomplete_deck_reminder(
        email: EmailStr, 
        username: str, 
        document_title: str,
        document_id: int
    ) -> bool:
        """
        Envia e-mail lembrando deck em processamento/falho
        """
        try:
            template = template_env.get_template("incomplete_deck.html")
            html_content = template.render(
                username=username,
                email=email,
                document_title=document_title,
                deck_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/deck/{document_id}",
                library_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/library",
                whatsapp_link=os.getenv("WHATSAPP_LINK", "https://wa.me/5592000000000"),
                telegram_link=os.getenv("TELEGRAM_LINK", "https://t.me/flashify")
            )
            
            message = MessageSchema(
                subject="Seu deck está esperando! 📚",
                recipients=[email],
                body=html_content,
                subtype=MessageType.html
            )
            
            await fast_mail.send_message(message)
            logger.info(f"✅ E-mail de deck incompleto enviado para {email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar e-mail de deck incompleto para {email}: {e}")
            return False

email_service = EmailService()