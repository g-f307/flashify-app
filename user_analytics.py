#!/usr/bin/env python3
"""
Script de Análise Detalhada de Usuários - Flashify
Gera relatório completo sobre usuários e suas interações no sistema
VERSÃO DOCKER - Configurado para ambiente de produção
"""

import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Any
from decimal import Decimal
from sqlalchemy import create_engine, func, desc, case
from sqlalchemy.orm import sessionmaker
from tabulate import tabulate
import json

# ========================================
# CONFIGURAÇÃO DO BANCO DE DADOS - DOCKER
# ========================================

def get_database_url():
    """
    Obtém a URL do banco de dados - CONFIGURADO PARA DOCKER
    As variáveis já estão no ambiente do container backend
    """
    db_user = os.getenv("DB_USER", "flashify")
    db_password = os.getenv("DB_PASSWORD", "admin2025")
    db_host = os.getenv("DB_HOST", "db")  # Nome do serviço no docker-compose
    db_name = os.getenv("DB_NAME", "flashify")
    
    return f"postgresql://{db_user}:{db_password}@{db_host}/{db_name}"


# ========================================
# FUNÇÕES DE ANÁLISE
# ========================================

def analyze_users(session) -> List[Dict[str, Any]]:
    """Análise detalhada de todos os usuários"""
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            u.id,
            u.username,
            u.email,
            u.provider,
            u.is_active,
            u.created_at,
            u.last_login_at,
            u.daily_generation_count,
            u.last_generation_reset,
            u.inactivity_email_sent,
            COUNT(DISTINCT d.id) as total_decks,
            COUNT(DISTINCT CASE WHEN d.status = 'COMPLETED' THEN d.id END) as completed_decks,
            COUNT(DISTINCT CASE WHEN d.status = 'FAILED' THEN d.id END) as failed_decks,
            COUNT(DISTINCT CASE WHEN d.status = 'PROCESSING' THEN d.id END) as processing_decks,
            COUNT(DISTINCT f.id) as total_flashcards,
            COUNT(DISTINCT sl.id) as total_study_logs,
            COUNT(DISTINCT qa.id) as total_quiz_attempts,
            COALESCE(AVG(qa.score), 0) as avg_quiz_score,
            COUNT(DISTINCT folder.id) as total_folders,
            MAX(d.created_at) as last_deck_created,
            MAX(sl.studied_at) as last_study_session,
            MAX(qa.completed_at) as last_quiz_attempt
        FROM "user" u
        LEFT JOIN document d ON u.id = d.user_id
        LEFT JOIN flashcard f ON d.id = f.document_id
        LEFT JOIN studylog sl ON u.id = sl.user_id
        LEFT JOIN quizattempt qa ON u.id = qa.user_id
        LEFT JOIN folder ON u.id = folder.user_id
        GROUP BY u.id, u.username, u.email, u.provider, u.is_active, 
                 u.created_at, u.last_login_at, u.daily_generation_count,
                 u.last_generation_reset, u.inactivity_email_sent
        ORDER BY u.created_at DESC
    """)
    
    result = session.execute(query)
    return [dict(row._mapping) for row in result]


def analyze_user_activity(session) -> Dict[str, Any]:
    """Análise de atividade geral dos usuários"""
    from sqlalchemy import text
    
    # Total de usuários
    total_users = session.execute(text("SELECT COUNT(*) FROM \"user\"")).scalar()
    
    # Usuários ativos (logaram nos últimos 7 dias)
    active_users = session.execute(text("""
        SELECT COUNT(*) FROM "user" 
        WHERE last_login_at > NOW() - INTERVAL '7 days'
    """)).scalar()
    
    # Usuários por provider
    users_by_provider = session.execute(text("""
        SELECT provider, COUNT(*) as count 
        FROM "user" 
        GROUP BY provider
    """)).fetchall()
    
    # Usuários que geraram decks hoje
    users_generated_today = session.execute(text("""
        SELECT COUNT(DISTINCT user_id) 
        FROM document 
        WHERE created_at::date = CURRENT_DATE
    """)).scalar()
    
    # Taxa de conversão (usuários que criaram pelo menos 1 deck)
    users_with_decks = session.execute(text("""
        SELECT COUNT(DISTINCT user_id) FROM document
    """)).scalar()
    
    conversion_rate = (users_with_decks / total_users * 100) if total_users > 0 else 0
    
    return {
        "total_users": total_users,
        "active_users_7d": active_users,
        "users_by_provider": dict(users_by_provider),
        "users_generated_today": users_generated_today,
        "users_with_decks": users_with_decks,
        "conversion_rate": round(conversion_rate, 2)
    }


def analyze_engagement(session) -> Dict[str, Any]:
    """Análise de engajamento dos usuários"""
    from sqlalchemy import text
    
    # Distribuição de decks por usuário
    decks_distribution = session.execute(text("""
        SELECT 
            CASE 
                WHEN deck_count = 0 THEN '0 decks'
                WHEN deck_count BETWEEN 1 AND 3 THEN '1-3 decks'
                WHEN deck_count BETWEEN 4 AND 10 THEN '4-10 decks'
                WHEN deck_count > 10 THEN '10+ decks'
            END as range,
            COUNT(*) as users
        FROM (
            SELECT u.id, COUNT(d.id) as deck_count
            FROM "user" u
            LEFT JOIN document d ON u.id = d.user_id
            GROUP BY u.id
        ) subq
        GROUP BY range
        ORDER BY range
    """)).fetchall()
    
    # Usuários com sessões de estudo nos últimos 7 dias
    study_active_users = session.execute(text("""
        SELECT COUNT(DISTINCT user_id) 
        FROM studylog 
        WHERE studied_at > NOW() - INTERVAL '7 days'
    """)).scalar()
    
    # Média de flashcards estudados por usuário ativo
    avg_cards_per_user = session.execute(text("""
        SELECT AVG(card_count) 
        FROM (
            SELECT user_id, COUNT(*) as card_count
            FROM studylog
            WHERE studied_at > NOW() - INTERVAL '30 days'
            GROUP BY user_id
        ) subq
    """)).scalar()
    
    return {
        "decks_distribution": dict(decks_distribution),
        "study_active_users_7d": study_active_users,
        "avg_cards_per_active_user_30d": round(float(avg_cards_per_user or 0), 2)
    }


def get_top_users(session, limit: int = 10) -> List[Dict[str, Any]]:
    """Top usuários por diferentes métricas"""
    from sqlalchemy import text
    
    # Top por decks criados
    top_by_decks = session.execute(text(f"""
        SELECT u.username, u.email, COUNT(d.id) as total_decks
        FROM "user" u
        JOIN document d ON u.id = d.user_id
        GROUP BY u.id, u.username, u.email
        ORDER BY total_decks DESC
        LIMIT {limit}
    """)).fetchall()
    
    # Top por flashcards estudados
    top_by_study = session.execute(text(f"""
        SELECT u.username, u.email, COUNT(sl.id) as total_studies
        FROM "user" u
        JOIN studylog sl ON u.id = sl.user_id
        GROUP BY u.id, u.username, u.email
        ORDER BY total_studies DESC
        LIMIT {limit}
    """)).fetchall()
    
    # Top por quiz attempts - CORRIGIDO: cast explícito para numeric
    top_by_quiz = session.execute(text(f"""
        SELECT u.username, u.email, COUNT(qa.id) as total_quizzes,
               CAST(ROUND(CAST(AVG(qa.score) AS numeric), 2) AS float) as avg_score
        FROM "user" u
        JOIN quizattempt qa ON u.id = qa.user_id
        GROUP BY u.id, u.username, u.email
        ORDER BY total_quizzes DESC
        LIMIT {limit}
    """)).fetchall()
    
    return {
        "top_by_decks": [dict(row._mapping) for row in top_by_decks],
        "top_by_study": [dict(row._mapping) for row in top_by_study],
        "top_by_quiz": [dict(row._mapping) for row in top_by_quiz]
    }


def analyze_generation_limits(session) -> Dict[str, Any]:
    """Análise do uso de limites de geração"""
    from sqlalchemy import text
    
    # Usuários que atingiram o limite hoje
    users_at_limit = session.execute(text("""
        SELECT COUNT(*) 
        FROM "user" 
        WHERE daily_generation_count >= 10 
        AND last_generation_reset::date = CURRENT_DATE
    """)).scalar()
    
    # Distribuição de uso do limite
    limit_distribution = session.execute(text("""
        SELECT 
            CASE 
                WHEN daily_generation_count = 0 THEN '0%'
                WHEN daily_generation_count BETWEEN 1 AND 3 THEN '1-30%'
                WHEN daily_generation_count BETWEEN 4 AND 7 THEN '40-70%'
                WHEN daily_generation_count BETWEEN 8 AND 9 THEN '80-90%'
                WHEN daily_generation_count >= 10 THEN '100%'
            END as usage_range,
            COUNT(*) as users
        FROM "user"
        WHERE last_generation_reset::date = CURRENT_DATE
        GROUP BY usage_range
        ORDER BY usage_range
    """)).fetchall()
    
    return {
        "users_at_limit_today": users_at_limit,
        "limit_usage_distribution": dict(limit_distribution)
    }


def analyze_recent_activity(session) -> Dict[str, Any]:
    """Análise de atividade recente (últimas 24h)"""
    from sqlalchemy import text
    
    # Novos usuários (últimas 24h)
    new_users_24h = session.execute(text("""
        SELECT COUNT(*) FROM "user" 
        WHERE created_at > NOW() - INTERVAL '24 hours'
    """)).scalar()
    
    # Decks criados (últimas 24h)
    decks_created_24h = session.execute(text("""
        SELECT COUNT(*) FROM document 
        WHERE created_at > NOW() - INTERVAL '24 hours'
    """)).scalar()
    
    # Sessões de estudo (últimas 24h)
    study_sessions_24h = session.execute(text("""
        SELECT COUNT(*) FROM studylog 
        WHERE studied_at > NOW() - INTERVAL '24 hours'
    """)).scalar()
    
    # Quizzes completados (últimas 24h)
    quizzes_24h = session.execute(text("""
        SELECT COUNT(*) FROM quizattempt 
        WHERE completed_at > NOW() - INTERVAL '24 hours'
    """)).scalar()
    
    return {
        "new_users_24h": new_users_24h,
        "decks_created_24h": decks_created_24h,
        "study_sessions_24h": study_sessions_24h,
        "quizzes_24h": quizzes_24h
    }


# ========================================
# FORMATAÇÃO E EXPORT
# ========================================

def format_datetime(dt):
    """Formata datetime para exibição"""
    if dt is None:
        return "Nunca"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except:
            return dt
    return dt.strftime("%d/%m/%Y %H:%M")


def format_timedelta(dt):
    """Calcula tempo desde uma data"""
    if dt is None:
        return "N/A"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except:
            return "N/A"
    
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    delta = now - dt
    
    if delta.days > 365:
        return f"{delta.days // 365} ano(s)"
    elif delta.days > 30:
        return f"{delta.days // 30} mês(es)"
    elif delta.days > 0:
        return f"{delta.days} dia(s)"
    elif delta.seconds > 3600:
        return f"{delta.seconds // 3600} hora(s)"
    else:
        return f"{delta.seconds // 60} min"


def print_section(title: str):
    """Imprime cabeçalho de seção"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def export_to_json(data: Dict[str, Any], filename: str = "/app/user_analytics.json"):
    """Exporta dados para JSON - CORRIGIDO para lidar com Decimal"""
    # Converter datetime e Decimal para tipos serializáveis
    def convert_types(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: convert_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_types(item) for item in obj]
        return obj
    
    data_converted = convert_types(data)
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data_converted, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Dados exportados para: {filename}")


# ========================================
# FUNÇÃO PRINCIPAL
# ========================================

def main():
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║         FLASHIFY - ANÁLISE DE USUÁRIOS E INTERAÇÕES       ║
    ║              Sistema em Produção (Docker)                  ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Conectar ao banco
    try:
        db_url = get_database_url()
        print(f"🔌 Conectando ao banco de dados PostgreSQL...")
        print(f"   Host: {os.getenv('DB_HOST', 'db')}")
        print(f"   Database: {os.getenv('DB_NAME', 'flashify')}")
        
        engine = create_engine(db_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        print("✅ Conexão estabelecida com sucesso!\n")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        sys.exit(1)
    
    try:
        # ========================================
        # 1. RESUMO GERAL
        # ========================================
        print_section("📊 RESUMO GERAL DO SISTEMA")
        
        activity = analyze_user_activity(session)
        
        summary_data = [
            ["Total de Usuários", activity["total_users"]],
            ["Usuários Ativos (7 dias)", activity["active_users_7d"]],
            ["Usuários que Geraram Decks", activity["users_with_decks"]],
            ["Taxa de Conversão", f"{activity['conversion_rate']}%"],
            ["Gerações Hoje", activity["users_generated_today"]],
        ]
        
        print(tabulate(summary_data, headers=["Métrica", "Valor"], tablefmt="grid"))
        
        # Distribuição por provider
        print("\n📱 Usuários por Método de Autenticação:")
        provider_data = [[k, v] for k, v in activity["users_by_provider"].items()]
        print(tabulate(provider_data, headers=["Provider", "Quantidade"], tablefmt="grid"))
        
        # ========================================
        # 2. ATIVIDADE RECENTE (24H)
        # ========================================
        print_section("⚡ ATIVIDADE DAS ÚLTIMAS 24 HORAS")
        
        recent = analyze_recent_activity(session)
        
        recent_data = [
            ["Novos Usuários", recent["new_users_24h"]],
            ["Decks Criados", recent["decks_created_24h"]],
            ["Sessões de Estudo", recent["study_sessions_24h"]],
            ["Quizzes Completados", recent["quizzes_24h"]],
        ]
        
        print(tabulate(recent_data, headers=["Métrica", "Quantidade"], tablefmt="grid"))
        
        # ========================================
        # 3. ENGAJAMENTO
        # ========================================
        print_section("📈 ANÁLISE DE ENGAJAMENTO")
        
        engagement = analyze_engagement(session)
        
        print("📚 Distribuição de Decks por Usuário:")
        decks_dist_data = [[k, v] for k, v in engagement["decks_distribution"].items()]
        print(tabulate(decks_dist_data, headers=["Faixa", "Usuários"], tablefmt="grid"))
        
        print(f"\n🎯 Usuários com estudo ativo (7 dias): {engagement['study_active_users_7d']}")
        print(f"📝 Média de cards estudados/usuário (30 dias): {engagement['avg_cards_per_active_user_30d']}")
        
        # ========================================
        # 4. LIMITES DE GERAÇÃO
        # ========================================
        print_section("⚡ ANÁLISE DE LIMITES DE GERAÇÃO")
        
        limits = analyze_generation_limits(session)
        
        print(f"🚫 Usuários que atingiram o limite hoje: {limits['users_at_limit_today']}")
        print("\n📊 Distribuição de uso do limite:")
        limit_data = [[k, v] for k, v in limits["limit_usage_distribution"].items()]
        print(tabulate(limit_data, headers=["Uso do Limite", "Usuários"], tablefmt="grid"))
        
        # ========================================
        # 5. TOP USUÁRIOS
        # ========================================
        print_section("🏆 TOP USUÁRIOS")
        
        top_users = get_top_users(session, limit=5)
        
        print("👑 Top 5 - Mais Decks Criados:")
        if top_users['top_by_decks']:
            print(tabulate(
                [[u['username'], u['email'], u['total_decks']] for u in top_users['top_by_decks']],
                headers=["Usuário", "Email", "Decks"],
                tablefmt="grid"
            ))
        else:
            print("   Nenhum dado disponível")
        
        print("\n🎓 Top 5 - Mais Estudos Realizados:")
        if top_users['top_by_study']:
            print(tabulate(
                [[u['username'], u['email'], u['total_studies']] for u in top_users['top_by_study']],
                headers=["Usuário", "Email", "Estudos"],
                tablefmt="grid"
            ))
        else:
            print("   Nenhum dado disponível")
        
        print("\n🎯 Top 5 - Mais Quizzes Completados:")
        if top_users['top_by_quiz']:
            print(tabulate(
                [[u['username'], u['email'], u['total_quizzes'], f"{u['avg_score']:.2f}%"] 
                 for u in top_users['top_by_quiz']],
                headers=["Usuário", "Email", "Quizzes", "Média"],
                tablefmt="grid"
            ))
        else:
            print("   Nenhum dado disponível")
        
        # ========================================
        # 6. DETALHES DE TODOS OS USUÁRIOS
        # ========================================
        print_section("👥 DETALHES DE TODOS OS USUÁRIOS")
        
        users = analyze_users(session)
        
        if not users:
            print("⚠️  Nenhum usuário encontrado no sistema")
        else:
            # Tabela resumida
            user_summary = []
            for u in users:
                user_summary.append([
                    u['id'],
                    u['username'][:20],
                    u['email'][:30],
                    u['provider'],
                    "✅" if u['is_active'] else "❌",
                    u['total_decks'],
                    u['completed_decks'],
                    u['total_study_logs'],
                    format_timedelta(u['last_login_at'])
                ])
            
            print(tabulate(
                user_summary,
                headers=["ID", "Usuário", "Email", "Provider", "Ativo", "Decks", "Completos", "Estudos", "Último Login"],
                tablefmt="grid"
            ))
            
            print(f"\n📊 Total de usuários listados: {len(users)}")
        
        # ========================================
        # 7. EXPORT AUTOMÁTICO
        # ========================================
        print_section("💾 EXPORTANDO DADOS")
        
        export_data = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "server_info": {
                "db_host": os.getenv('DB_HOST'),
                "db_name": os.getenv('DB_NAME'),
                "environment": "production-docker"
            },
            "summary": activity,
            "recent_activity": recent,
            "engagement": engagement,
            "limits": limits,
            "top_users": top_users,
            "all_users": users
        }
        export_to_json(export_data)
        
        print("\n" + "=" * 80)
        print("✅ Análise concluída com sucesso!")
        print("📁 Arquivo JSON salvo em: /app/user_analytics.json")
        print("💡 Para copiar para o host: docker cp flashify-backend:/app/user_analytics.json ./")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Erro durante a análise: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()


if __name__ == "__main__":
    main()