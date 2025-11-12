import os
import resend
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from pydantic import EmailStr
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# 🆕 Configuração do Resend
ENABLE_EMAILS = os.getenv("ENABLE_EMAILS", "false").lower() == "true"
resend.api_key = os.getenv("RESEND_API_KEY")

# Configurar Jinja2 para templates
template_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "email_templates")
)

class EmailService:
    """Serviço centralizado para envio de e-mails via Resend"""
    
    @staticmethod
    def _get_email_context(username: str, email: EmailStr, **kwargs) -> dict:
        """Prepara o contexto comum para todos os templates de e-mail"""
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4000")
        email_assets_url = os.getenv("EMAIL_ASSETS_BASE_URL", f"{frontend_url}/email-assets")
        
        context = {
            "username": username,
            "email": email,
            "frontend_url": frontend_url,
            "whatsapp_link": os.getenv("WHATSAPP_LINK", "https://wa.me/5592000000000"),
            "logo_url": f"{email_assets_url}/logo.svg",
            "whatsapp_icon_url": f"{email_assets_url}/whatsapp-icon.png",
        }
        
        context.update(kwargs)
        return context
    
    @staticmethod
    async def send_welcome_email(email: EmailStr, username: str) -> bool:
        """Envia e-mail de boas-vindas após cadastro"""
        
        if not ENABLE_EMAILS:
            logger.info(f"📧 [MODO TESTE] E-mail de boas-vindas NÃO enviado para {email} (emails desabilitados)")
            return True
        
        if not resend.api_key:
            logger.error("❌ RESEND_API_KEY não configurada!")
            return False
        
        try:
            template = template_env.get_template("welcome.html")
            context = EmailService._get_email_context(username, email)
            html_content = template.render(**context)
            
            params = {
                "from": "Flashify <noreply@flashify.cloud>",
                "to": [email],
                "subject": "Bem-vindo(a) ao Flashify! 🎉",
                "html": html_content,
            }
            
            response = resend.Emails.send(params)
            logger.info(f"✅ E-mail de boas-vindas enviado para {email} (ID: {response.get('id', 'N/A')})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar e-mail de boas-vindas para {email}: {e}")
            return False
    
    @staticmethod
    async def send_inactivity_reminder(email: EmailStr, username: str, days_inactive: int) -> bool:
        """Envia e-mail lembrando usuário inativo"""
        
        if not ENABLE_EMAILS:
            logger.info(f"📧 [MODO TESTE] E-mail de inatividade NÃO enviado para {email} (emails desabilitados)")
            return True
        
        if not resend.api_key:
            logger.error("❌ RESEND_API_KEY não configurada!")
            return False
        
        try:
            template = template_env.get_template("inatividade.html")
            context = EmailService._get_email_context(
                username, 
                email,
                days_inactive=days_inactive,
                dashboard_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/dashboard",
                create_deck_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/create"
            )
            html_content = template.render(**context)
            
            params = {
                "from": "Flashify <noreply@flashify.cloud>",
                "to": [email],
                "subject": f"Sentimos sua falta! 😊 - Volte ao Flashify",
                "html": html_content,
            }
            
            response = resend.Emails.send(params)
            logger.info(f"✅ E-mail de inatividade enviado para {email} (ID: {response.get('id', 'N/A')})")
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
        """Envia e-mail lembrando deck em processamento/falho"""
        
        if not ENABLE_EMAILS:
            logger.info(f"📧 [MODO TESTE] E-mail de deck incompleto NÃO enviado para {email} (emails desabilitados)")
            return True
        
        if not resend.api_key:
            logger.error("❌ RESEND_API_KEY não configurada!")
            return False
        
        try:
            template = template_env.get_template("deck_incompleto.html")
            context = EmailService._get_email_context(
                username,
                email,
                document_title=document_title,
                deck_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/deck/{document_id}",
                library_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:4000')}/library"
            )
            html_content = template.render(**context)
            
            params = {
                "from": "Flashify <noreply@flashify.cloud>",
                "to": [email],
                "subject": "Seu deck está esperando! 📚",
                "html": html_content,
            }
            
            response = resend.Emails.send(params)
            logger.info(f"✅ E-mail de deck incompleto enviado para {email} (ID: {response.get('id', 'N/A')})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar e-mail de deck incompleto para {email}: {e}")
            return False

email_service = EmailService()