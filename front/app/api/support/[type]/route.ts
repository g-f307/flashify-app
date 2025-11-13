// front/app/api/support/[type]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ========================================
// CONFIGURAÇÃO - DISCORD WEBHOOK
// ========================================

// Opção A: Um webhook para todos os formulários (mais simples)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// Opção B: Webhooks separados por tipo (melhor organização)
const DISCORD_WEBHOOKS = {
  'bug-report': process.env.DISCORD_WEBHOOK_BUGS || DISCORD_WEBHOOK_URL,
  'experience': process.env.DISCORD_WEBHOOK_FEEDBACK || DISCORD_WEBHOOK_URL,
  'suggestion': process.env.DISCORD_WEBHOOK_SUGGESTIONS || DISCORD_WEBHOOK_URL,
};

// ========================================
// FUNÇÕES DE ENVIO
// ========================================

// Discord Webhook - Envio otimizado
async function sendToDiscord(type: string, data: any) {
  const webhookUrl = DISCORD_WEBHOOKS[type as keyof typeof DISCORD_WEBHOOKS];
  
  if (!webhookUrl) {
    console.error(`Discord Webhook não configurado para: ${type}`);
    return false;
  }

  const colors = {
    'bug-report': 0xff0000,      // Vermelho
    'experience': 0x0099ff,       // Azul
    'suggestion': 0xffd700        // Amarelo
  };

  const emojis = {
    'bug-report': '🐛',
    'experience': '💬',
    'suggestion': '💡'
  };

  const titles = {
    'bug-report': 'Novo Bug Reportado',
    'experience': 'Novo Feedback de Experiência',
    'suggestion': 'Nova Sugestão de Melhoria'
  };

  // Formata campos de forma mais legível
  const fieldLabels: Record<string, string> = {
    priority: '📊 Prioridade',
    category: '🏷️ Categoria',
    title: '📝 Título',
    steps: '🔄 Passos para Reproduzir',
    expected: '✅ Comportamento Esperado',
    actual: '❌ Comportamento Atual',
    frequency: '🔁 Frequência',
    additionalInfo: '📎 Informações Adicionais',
    rating: '⭐ Avaliação',
    easeOfUse: '🎯 Facilidade de Uso',
    mostUsedFeature: '🔥 Funcionalidade Mais Usada',
    wouldRecommend: '👍 Recomendaria?',
    feedback: '💭 Comentários',
    impact: '⚡ Impacto',
    description: '📋 Descrição',
    useCase: '💡 Caso de Uso'
  };

  const fields = Object.entries(data)
    .filter(([key, value]) => 
      value !== undefined && 
      value !== '' && 
      !key.includes('submitted') && 
      !key.includes('ip')
    )
    .map(([key, value]) => ({
      name: fieldLabels[key] || key.split(/(?=[A-Z])/).join(' ').replace(/^./, str => str.toUpperCase()),
      value: String(value).substring(0, 1024),
      inline: String(value).length < 50
    }));

  const embed = {
    title: `${emojis[type as keyof typeof emojis]} ${titles[type as keyof typeof titles]}`,
    color: colors[type as keyof typeof colors],
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Flashify Support System',
      icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        embeds: [embed],
        username: 'Flashify Support',
        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      })
    });

    if (response.status === 429) {
      // Rate limited - aguarda e tenta novamente
      const retryAfter = parseInt(response.headers.get('retry-after') || '1000');
      console.log(`Rate limited. Aguardando ${retryAfter}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return sendToDiscord(type, data); // Tenta novamente
    }

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    return false;
  }
}

// ========================================
// ROUTE HANDLER
// ========================================

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const body = await request.json();
    const { type } = params;

    // Validação básica
    if (!['bug-report', 'experience', 'suggestion'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de formulário inválido' },
        { status: 400 }
      );
    }

    // Adiciona timestamp
    const enrichedData = {
      ...body,
      submitted_at: new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Manaus',
        dateStyle: 'short',
        timeStyle: 'short'
      })
    };

    // Envia para Discord
    const success = await sendToDiscord(type, enrichedData);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Feedback enviado com sucesso!' 
      });
    }

    // Se falhou
    return NextResponse.json(
      { error: 'Falha ao enviar feedback. Verifique sua configuração do Discord Webhook.' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Erro no route handler:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}