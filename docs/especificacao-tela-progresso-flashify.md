# Especificação funcional, visual e técnica da tela de progresso do Flashify

> Documento baseado no mockup final da tela de progresso. O escopo considera **somente a área de conteúdo da tela de progresso**. A sidebar, o cabeçalho global da aplicação e suas regras de navegação não fazem parte desta especificação.

## 1. Objetivo da tela

A tela de progresso deve transformar os registros de estudo do usuário em uma leitura simples, motivadora e visual da sua evolução. Ela não deve parecer um painel corporativo carregado de indicadores. O foco deve estar em:

- mostrar rapidamente como o usuário estudou na semana;
- diferenciar com clareza flashcards, quizzes e estudo guiado;
- evidenciar consistência, desempenho e avanço pedagógico;
- comparar a semana atual com a semana anterior;
- oferecer recomendações acionáveis para o próximo estudo;
- inserir o usuário em um ranking global de forma motivadora e justa;
- priorizar gráficos, barras, anéis de progresso e ilustrações antes de números isolados.

A leitura ideal da página ocorre em três níveis:

1. **Resumo imediato:** quatro cards de desempenho no topo.
2. **Compreensão da semana:** gráfico de atividade e ranking global.
3. **Próxima ação:** cards de trilha, quiz e revisão inteligente.

---

## 2. Estrutura geral do conteúdo

A tela deve ser composta, de cima para baixo, pelos seguintes blocos:

1. cabeçalho interno da página;
2. mensagem motivacional com o mascote;
3. navegação por abas;
4. quatro cards principais de resumo;
5. gráfico de atividade semanal;
6. ranking global;
7. insight da semana;
8. três cards de próxima ação.

A composição desktop utiliza três grades principais:

- uma grade superior com **quatro colunas iguais** para os indicadores;
- uma grade central com uma coluna larga para o gráfico e uma coluna menor para o ranking;
- uma grade inferior com **três colunas iguais** para as recomendações.

### Dimensões sugeridas

```css
.progress-page {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 36px 36px;
}

.progress-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.progress-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(290px, 0.9fr);
  gap: 22px;
}

.progress-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
```

O fundo da página deve ser quase branco, com uma leve tonalidade fria. Os cards permanecem brancos e são separados do fundo por borda delicada e sombra curta.

---

## 3. Identidade visual

## 3.1. Personalidade visual

A tela deve manter a personalidade do Flashify:

- jovem;
- amigável;
- didática;
- energética;
- tecnológica sem parecer fria;
- motivacional sem parecer infantil.

A interface utiliza formas arredondadas, ilustrações leves, ícones simples e cores semânticas. Cada modo de estudo possui uma cor própria:

- **amarelo:** flashcards, constância, energia e ação;
- **azul-ciano:** quizzes, análise, precisão e tecnologia;
- **verde:** estudo guiado, trilha, cobertura e consolidação;
- **azul-escuro:** texto, hierarquia e estrutura.

## 3.2. Paleta sugerida

Os valores abaixo reproduzem visualmente o mockup. Pequenas variações podem ocorrer por causa de antialiasing, gradientes e exportação da imagem.

```css
:root {
  /* Estrutura */
  --progress-page-bg: #f7f9fc;
  --progress-surface: #ffffff;
  --progress-surface-soft: #fbfcfe;
  --progress-border: #e7edf3;
  --progress-divider: #edf1f5;

  /* Tipografia */
  --progress-text-primary: #182738;
  --progress-text-secondary: #46556d;
  --progress-text-muted: #79839a;
  --progress-text-disabled: #a3a9b8;

  /* Flashcards e energia */
  --flashcard-500: #fdbe0c;
  --flashcard-400: #fccd5f;
  --flashcard-100: #fdedc2;
  --flashcard-50: #fbf9f1;

  /* Quiz e desempenho */
  --quiz-500: #2bacf2;
  --quiz-400: #63caf6;
  --quiz-100: #dff5ff;
  --quiz-50: #eff6fc;

  /* Estudo guiado */
  --guided-500: #52ba6b;
  --guided-400: #84cf92;
  --guided-100: #dff4e5;
  --guided-50: #e7f0ed;

  /* Estados */
  --success: #20b86a;
  --warning: #f5a623;
  --danger: #e85d5d;

  /* Efeitos */
  --progress-shadow-sm: 0 2px 8px rgba(24, 39, 56, 0.05);
  --progress-shadow-md: 0 8px 24px rgba(24, 39, 56, 0.07);
  --progress-radius-sm: 10px;
  --progress-radius-md: 16px;
  --progress-radius-lg: 20px;
}
```

## 3.3. Uso correto das cores

As cores não devem ser aplicadas apenas por decoração. Elas comunicam o tipo de dado:

| Elemento | Cor principal | Significado |
|---|---:|---|
| Flashcards | `--flashcard-500` | repetição, memorização e constância |
| Quizzes | `--quiz-500` | validação, acerto e desempenho |
| Estudo guiado | `--guided-500` | percurso, avanço e cobertura |
| Texto e títulos | `--progress-text-primary` | estrutura e legibilidade |
| Comparação positiva | `--success` | crescimento ou melhora |
| Superfícies | branco e cinza muito claro | leveza e separação visual |

O amarelo não deve ser usado em textos pequenos sobre fundo branco, pois o contraste é insuficiente. Nesses casos, o amarelo aparece em ícones, barras, fundos e bordas, enquanto o texto permanece azul-escuro.

## 3.4. Tipografia

A fonte recomendada é `Inter`, `Manrope` ou a fonte já adotada pelo produto, desde que mantenha boa legibilidade.

| Uso | Tamanho | Peso | Altura de linha |
|---|---:|---:|---:|
| Título da página | 32–36 px | 700 | 1.15 |
| Subtítulo da página | 15–16 px | 400 | 1.5 |
| Título de card | 14–16 px | 600 | 1.35 |
| Número principal | 36–42 px | 700 | 1.0 |
| Texto de apoio | 12–14 px | 400–500 | 1.4 |
| Botões e abas | 13–15 px | 600 | 1.2 |

## 3.5. Cards, bordas e sombras

Todos os blocos principais utilizam:

- fundo branco;
- borda de aproximadamente `1px solid #e7edf3`;
- raio entre 16 e 20 px;
- sombra suave;
- espaçamento interno entre 20 e 24 px;
- hover discreto apenas em elementos clicáveis.

```css
.progress-card {
  background: var(--progress-surface);
  border: 1px solid var(--progress-border);
  border-radius: var(--progress-radius-md);
  box-shadow: var(--progress-shadow-sm);
}

.progress-card--interactive:hover {
  transform: translateY(-1px);
  box-shadow: var(--progress-shadow-md);
  border-color: #dce4ec;
}
```

A transição deve durar entre 150 e 220 ms. Usuários com `prefers-reduced-motion` não devem receber translação ou animação de entrada.

---

## 4. Cabeçalho interno da página

## 4.1. Título e subtítulo

No canto superior esquerdo da área de conteúdo aparecem:

- um pequeno raio amarelo;
- o título **“Seu Progresso”**;
- o subtítulo **“Acompanhe sua jornada de estudos em todos os modos e evolua a cada dia ✨”**.

O raio pode ser um ícone `Zap` do Lucide ou uma versão simplificada da marca. Ele deve ter entre 24 e 30 px.

### Implementação

```tsx
<header className="progress-header">
  <div className="progress-heading">
    <Zap aria-hidden="true" />
    <div>
      <h1>Seu Progresso</h1>
      <p>Acompanhe sua jornada de estudos em todos os modos e evolua a cada dia ✨</p>
    </div>
  </div>
</header>
```

## 4.2. Card motivacional com Flashinho

No lado direito do cabeçalho existe um card horizontal com:

- ilustração do Flashinho;
- título curto, como **“Continue assim!”**;
- mensagem contextual, como **“Você está acima da sua média das últimas 4 semanas.”**;
- fundo branco com leve halo amarelo;
- borda amarela muito suave.

Esse card não deve conter uma mensagem fixa. O backend deve selecionar o estado motivacional mais relevante.

### Regras sugeridas para a mensagem

Ordem de prioridade:

1. sequência prestes a ser perdida;
2. trilha guiada parada há vários dias;
3. desempenho em queda relevante;
4. novo recorde de sequência;
5. desempenho acima da média das últimas quatro semanas;
6. boa consistência na semana;
7. estado inicial sem dados.

Exemplos:

| Condição | Título | Mensagem |
|---|---|---|
| Sem atividade hoje e sequência ativa | Não perca sua sequência | Faça uma atividade hoje para manter seus dias consecutivos. |
| Recorde de sequência | Novo recorde! | Esta é sua maior sequência de estudos até agora. |
| Desempenho +5 p.p. acima da média de 4 semanas | Continue assim! | Você está acima da sua média das últimas 4 semanas. |
| Trilha sem atividade há 3 dias | Retome sua trilha | Falta pouco para avançar no estudo guiado. |
| Usuário novo | Comece sua jornada | Sua evolução aparecerá aqui conforme você estudar. |

### Backend

O backend deve retornar um objeto pronto para exibição:

```json
{
  "motivation": {
    "type": "above_four_week_average",
    "title": "Continue assim!",
    "message": "Você está acima da sua média das últimas 4 semanas.",
    "illustration": "flashinho-celebrating"
  }
}
```

O frontend apenas associa `illustration` ao asset correspondente. A regra de negócio não deve ficar espalhada em condicionais no componente visual.

---

## 5. Navegação por abas

A barra de abas contém quatro opções:

1. **Visão Geral**;
2. **Flashcards**;
3. **Quizzes**;
4. **Estudo Guiado**.

A aba ativa possui fundo amarelo, texto escuro e sombra curta. As demais ficam em fundo branco, com ícone e texto azul-escuro. Divisores verticais suaves podem separar os itens.

### Comportamento

- a aba ativa deve ser refletida na URL, por exemplo `?tab=overview`;
- a troca de aba não deve recarregar toda a página;
- dados da aba seguinte podem ser pré-carregados ao passar o mouse ou focar;
- o botão Voltar do navegador deve respeitar a troca de abas;
- em telas pequenas, a barra pode permitir rolagem horizontal.

### Acessibilidade

Utilizar os padrões de tabs:

- `role="tablist"` no contêiner;
- `role="tab"` nos botões;
- `aria-selected`;
- `aria-controls`;
- navegação pelas setas esquerda e direita;
- foco visível.

### Estrutura sugerida

```tsx
const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
  { id: 'flashcards', label: 'Flashcards', icon: Layers3 },
  { id: 'quizzes', label: 'Quizzes', icon: CircleHelp },
  { id: 'guided', label: 'Estudo Guiado', icon: Map },
];
```

---

## 6. Linha de indicadores principais

A visão geral possui quatro cards. Eles devem ter a mesma altura e largura. Cada card contém:

- ícone semântico;
- título;
- número ou percentual principal;
- descrição da unidade;
- comparação com o período anterior;
- uma visualização pequena à direita.

A visualização deve ter peso semelhante ao número, evitando que a tela volte a ser uma coleção de KPIs soltos.

## 6.1. Card “Flashcards (semana)”

### Aparência

- cor dominante: amarelo;
- ícone de pilha de cards;
- valor principal: quantidade de cards estudados;
- texto auxiliar: `cards estudados`;
- comparação: seta verde e percentual contra a semana anterior;
- minigráfico de barras amarelas à direita.

### Regra de dados

`cards_studied` deve contar revisões válidas de flashcards realizadas no período. Cada apresentação respondida pelo usuário conta como uma revisão. Eventos de visualização sem resposta não contam.

```text
cards_studied = quantidade de flashcard_reviews válidos no intervalo
```

### Comparação semanal

```text
percent_change = ((current_week - previous_week) / previous_week) × 100
```

Casos especiais:

- semana anterior igual a zero e semana atual maior que zero: exibir **“Novo nesta semana”**;
- ambas iguais a zero: exibir **“Sem atividade”**;
- queda: seta para baixo e texto neutro ou de atenção, sem usar vermelho de forma punitiva.

### Minigráfico

As barras representam o total de revisões em cada dia da semana. O gráfico não exibe eixos, mas deve possuir tooltip e descrição acessível.

## 6.2. Card “Quizzes (semana)”

### Aparência

- cor dominante: azul-ciano;
- ícone de alvo ou pergunta;
- valor principal: quizzes concluídos;
- texto auxiliar: `quizzes concluídos`;
- comparação com a semana anterior;
- minigráfico de barras azuis.

### Regra de dados

Um quiz é considerado concluído somente quando:

- possui `completed_at`;
- não foi cancelado;
- tem ao menos uma resposta válida;
- pertence ao usuário autenticado.

Tentativas abandonadas não entram no contador principal, mas podem ser usadas em análises internas.

## 6.3. Card “Estudo Guiado (semana)”

### Aparência

- cor dominante: verde;
- ícone de mapa ou trilha;
- percentual principal, como `68%`;
- texto auxiliar: `da trilha avançada` ou `da trilha concluída`;
- anel de progresso à direita;
- comparação semanal em verde.

### Definição do percentual

O mockup sugere uma trilha principal em andamento. A regra recomendada é:

```text
guided_progress_percent = completed_required_steps / total_required_steps × 100
```

A trilha utilizada deve ser a trilha ativa mais recentemente acessada. Se houver mais de uma:

1. priorizar a marcada como principal;
2. caso nenhuma seja principal, utilizar a que teve atividade mais recente;
3. em empate, utilizar a mais avançada.

A comparação da semana deve medir quanto o usuário avançou desde o início da semana. Tecnicamente, esse valor é melhor apresentado em pontos percentuais:

```text
progress_delta_pp = current_progress_percent - progress_at_week_start
```

Exemplo: de 49% para 68% equivale a **+19 p.p.**. Caso seja necessário reproduzir literalmente o mockup, pode-se exibir `+19%`, mas `+19 p.p.` é semanticamente mais correto.

### Anel de progresso

O anel pode ser implementado com SVG:

```tsx
<svg viewBox="0 0 44 44" role="img" aria-label="68% da trilha concluída">
  <circle className="ring-track" cx="22" cy="22" r="18" />
  <circle
    className="ring-value"
    cx="22"
    cy="22"
    r="18"
    pathLength="100"
    strokeDasharray="68 100"
  />
</svg>
```

O arco deve começar no topo, usando `transform: rotate(-90deg)`.

## 6.4. Card “Desempenho médio”

### Aparência

- cor dominante: azul-ciano;
- ícone de gráfico;
- percentual principal, como `87%`;
- texto auxiliar: `de precisão`;
- comparação semanal;
- sparkline à direita.

### Regra de desempenho

O indicador deve ser calculado sobre interações que possuem resultado correto/incorreto. Uma fórmula unificada possível é:

```text
correct_interactions =
  flashcards_recalled_correctly
  + quiz_correct_answers
  + guided_correct_answers

graded_interactions =
  graded_flashcard_reviews
  + quiz_answers
  + guided_question_answers

overall_accuracy = correct_interactions / graded_interactions × 100
```

Para flashcards, uma resposta pode ser considerada correta quando a avaliação do usuário for `good` ou `easy`. Respostas `again` e `hard` entram como não recordadas, conforme a regra de revisão adotada pelo produto.

O percentual só deve ser exibido quando houver uma amostra mínima, por exemplo cinco interações avaliáveis. Abaixo disso, mostrar `—` e o texto **“Continue estudando para gerar sua média”**.

### Sparkline

A linha representa a precisão diária nos sete dias da semana. Dias sem respostas não devem ser tratados automaticamente como 0%; devem aparecer como lacuna ou ser ignorados na linha.

---

## 7. Gráfico “Atividade da semana”

## 7.1. Estrutura visual

O gráfico ocupa a maior parte da grade central. Ele contém:

- ícone de calendário amarelo;
- título **“Atividade da semana”**;
- subtítulo **“Seus estudos por dia e por modo”**;
- legenda no topo direito;
- eixo horizontal de domingo a sábado;
- eixo vertical com escala automática;
- barras empilhadas por dia;
- totais acima de cada barra;
- valores dentro de cada segmento quando houver espaço;
- card de insight na parte inferior.

Cores das séries:

- flashcards: amarelo;
- quizzes: azul;
- estudo guiado: verde.

## 7.2. Unidade do gráfico

Como flashcards, quizzes e etapas guiadas possuem unidades diferentes, somá-los diretamente pode causar interpretação errada. Para preservar o gráfico empilhado do mockup, a unidade deve ser claramente definida como **interações de estudo**:

- uma revisão de flashcard = uma interação;
- uma questão respondida em quiz = uma interação;
- uma etapa obrigatória concluída no estudo guiado = uma interação.

O gráfico não deve usar “quizzes concluídos” dentro das barras, porque isso tornaria a escala pouco comparável com cards revisados. O card superior continua mostrando quizzes completos; o gráfico mostra questões respondidas.

### Formato retornado pelo backend

```json
{
  "date": "2026-06-15",
  "label": "Dom",
  "flashcards": 18,
  "quizInteractions": 6,
  "guidedSteps": 14,
  "total": 38
}
```

O backend deve sempre retornar os sete dias, inclusive os dias com zero, para evitar mudanças na largura e na ordem das barras.

## 7.3. Tooltip

Ao passar o mouse ou focar uma barra, mostrar:

```text
Quarta-feira, 18 de junho
42 flashcards revisados
12 questões de quiz respondidas
22 etapas guiadas concluídas
76 interações de estudo
```

Em dispositivos touch, o tooltip deve abrir por toque.

## 7.4. Implementação do gráfico

Uma biblioteca como Recharts pode ser usada:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={activity}>
    <CartesianGrid vertical={false} strokeDasharray="4 4" />
    <XAxis dataKey="label" />
    <YAxis allowDecimals={false} />
    <Tooltip content={<ActivityTooltip />} />
    <Legend />
    <Bar dataKey="flashcards" stackId="study" fill="var(--flashcard-500)" />
    <Bar dataKey="quizInteractions" stackId="study" fill="var(--quiz-500)" />
    <Bar
      dataKey="guidedSteps"
      stackId="study"
      fill="var(--guided-400)"
      radius={[10, 10, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
```

Os rótulos internos e totais podem ser renderizados com componentes customizados. Em larguras pequenas, remover valores internos e manter apenas o tooltip.

## 7.5. Acessibilidade do gráfico

O gráfico deve possuir uma tabela invisível visualmente, mas acessível a leitores de tela:

```html
<table class="sr-only">
  <caption>Atividade de estudo da semana por dia e modo</caption>
  <!-- dias e valores -->
</table>
```

A legenda não pode depender apenas da cor. Cada série precisa de nome textual e, se possível, ícone ou marcador com formato distinto.

---

## 8. Insight da semana

Abaixo do gráfico existe uma faixa interna com:

- ícone de brilho ou estrela;
- título **“Insight da semana”**;
- uma frase curta e personalizada;
- fundo amarelo muito suave;
- borda amarela clara.

Exemplo do mockup:

> Você foi mais consistente na quarta-feira! Que tal repetir essa energia amanhã? 🚀

## 8.1. Lógica de geração

O backend deve produzir insights determinísticos a partir dos dados, sem depender obrigatoriamente de uma LLM.

Regras possíveis:

1. dia com maior atividade;
2. modo mais utilizado;
3. maior crescimento contra a semana anterior;
4. queda de consistência;
5. avanço importante em uma trilha;
6. precisão alta com volume suficiente;
7. ausência de atividade.

Exemplo de pseudocódigo:

```python
if total_activity == 0:
    return "Comece com uma pequena sessão para criar ritmo nesta semana."
if best_day.total >= average_day * 1.4:
    return f"Você foi mais consistente na {best_day.name}! Que tal repetir esse ritmo?"
if guided_delta >= 20:
    return "Seu maior avanço veio do estudo guiado. Continue a trilha enquanto o conteúdo está fresco."
if accuracy >= 85 and graded_interactions >= 20:
    return "Seu desempenho está excelente. Um novo quiz pode ajudar a validar o que você aprendeu."
```

Uma LLM pode ser adicionada futuramente apenas para variar a redação. Os fatos e a seleção do insight devem vir de regras e dados validados pelo servidor.

---

## 9. Ranking global

## 9.1. Estrutura visual

O ranking ocupa a coluna direita da grade central. Ele contém:

- ícone de globo;
- título **“Ranking global”**;
- subtítulo **“Estudantes em destaque esta semana”**;
- lista ordenada de cinco posições;
- medalhas visuais para 1º, 2º e 3º;
- avatar;
- nome abreviado;
- pontuação alinhada à direita;
- linha do usuário destacada em amarelo claro;
- botão **“Ver ranking completo”**;
- nota explicando a composição dos pontos.

A nota deve ser:

> Pontuação baseada em consistência, desempenho e conclusão de trilhas.

A tela não deve incluir o antigo card “Distribuição do tempo”. O espaço da coluna direita pertence integralmente ao ranking.

## 9.2. Regra de exibição

- se o usuário estiver entre os cinco primeiros, mostrar o top 5 normalmente;
- se estiver fora, mostrar os quatro primeiros e uma quinta linha fixa com a posição real do usuário;
- a posição exibida para o usuário deve ser verdadeira, por exemplo `128`, e não `5`;
- o botão abre uma página ou modal paginado com o ranking completo;
- nomes devem ser abreviados por privacidade, como `Maria E.`;
- o usuário pode optar por não participar do ranking.

## 9.3. Período

O ranking do mockup é semanal. Recomenda-se:

- início: domingo às 00:00 no fuso do produto ou do usuário;
- fim: sábado às 23:59:59;
- atualização periódica durante a semana;
- fechamento e armazenamento do resultado após o término do período.

O fuso deve ser explícito. Para usuários em Manaus, por exemplo, usar `America/Manaus` ao agrupar atividade por dia.

## 9.4. Fórmula de pontos sugerida

Para que o ranking reflita consistência, desempenho e conclusão, sem favorecer apenas quem repete milhares de ações, usar dimensões normalizadas e limitadas.

Pontuação máxima semanal sugerida: **2.500 pontos**.

```text
consistency_score: até 700 pontos
performance_score: até 800 pontos
engagement_score: até 600 pontos
guided_score: até 400 pontos
```

### Consistência — até 700

```text
consistency_score = active_days / 7 × 700
```

Um dia é ativo quando há pelo menos uma das condições:

- cinco interações válidas;
- cinco minutos de estudo confirmado;
- um quiz concluído;
- uma etapa guiada concluída.

### Desempenho — até 800

```text
performance_score = overall_accuracy / 100 × 800
```

Aplicar fator de confiança para amostras pequenas:

```text
confidence = min(graded_interactions / 20, 1)
performance_score = raw_performance_score × confidence
```

### Engajamento — até 600

```text
activity_points =
  flashcard_reviews
  + quiz_answers
  + guided_steps

engagement_score = min(activity_points / 300, 1) × 600
```

### Estudo guiado — até 400

```text
guided_progress_score = min(progress_gained_pp / 100, 1) × 200
guided_completion_score = min(completed_trails / 2, 1) × 200
guided_score = guided_progress_score + guided_completion_score
```

### Total

```text
weekly_score = round(
  consistency_score
  + performance_score
  + engagement_score
  + guided_score
)
```

Essa fórmula produz uma escala coerente com os valores do mockup, cujo líder está próximo de 2.450 pontos.

## 9.5. Antifraude e justiça

O servidor deve:

- contar apenas eventos persistidos e pertencentes ao usuário;
- rejeitar eventos duplicados por `idempotency_key`;
- limitar pontos por dimensão;
- não pontuar simples abertura de página;
- validar duração mínima quando houver medição de tempo;
- excluir tentativas administrativas, testes e dados seed;
- recalcular resultados suspeitos;
- registrar a versão da fórmula usada em cada ranking;
- impedir que o cliente envie pontuação pronta.

O frontend nunca calcula nem envia pontos. Ele apenas mostra o valor retornado pelo backend.

## 9.6. Empates

Desempate recomendado:

1. maior pontuação total;
2. maior consistência;
3. maior desempenho com amostra válida;
4. maior conclusão guiada;
5. quem atingiu a pontuação primeiro.

No banco, usar `RANK()` para empates reais ou `ROW_NUMBER()` quando for obrigatório produzir posições únicas.

---

## 10. Cards inferiores de próxima ação

A parte inferior contém três cards horizontais. Eles não são meros resumos: cada um deve levar diretamente a uma ação útil.

## 10.1. “Sua trilha em andamento”

### Aparência

- fundo verde muito claro;
- ilustração de caminho;
- rótulo verde;
- nome da trilha;
- barra de progresso;
- percentual;
- botão **“Continuar”**.

### Regra de seleção

Selecionar a trilha ativa principal. Caso não exista:

- trocar o texto para **“Comece uma trilha guiada”**;
- recomendar a trilha mais relevante para os decks recentes;
- usar botão **“Explorar trilhas”**.

### Ação

O botão deve abrir exatamente o próximo passo incompleto, e não apenas a página inicial da trilha.

## 10.2. “Próximo quiz sugerido”

### Aparência

- fundo azul muito claro;
- ícone ou ilustração de alvo;
- rótulo azul;
- título do quiz;
- quantidade de questões e nível;
- botão **“Iniciar”**.

### Algoritmo de recomendação

Prioridade sugerida:

1. tópico com menor domínio;
2. tópico estudado recentemente em flashcards;
3. quiz ainda não realizado ou não realizado nas últimas 72 horas;
4. dificuldade compatível com o desempenho atual;
5. deck com atividade recente.

Uma pontuação simples de recomendação pode ser:

```text
quiz_relevance =
  low_mastery_weight × 0.40
  + recent_study_weight × 0.25
  + not_recently_attempted_weight × 0.20
  + difficulty_fit_weight × 0.15
```

O backend retorna somente a recomendação vencedora e uma justificativa curta.

## 10.3. “Revisão inteligente”

### Aparência

- fundo amarelo-creme;
- ilustração de cards;
- rótulo laranja/amarelo;
- quantidade de cards a revisar hoje;
- frase **“Reforce o que mais importa”**;
- botão **“Revisar agora”**.

### Regra de dados

Contar os flashcards cujo `due_at` seja menor ou igual ao horário atual.

Ordenação recomendada:

1. mais atrasados;
2. menor estabilidade ou maior dificuldade;
3. cards errados recentemente;
4. decks priorizados pelo usuário.

O botão inicia uma sessão com os cards retornados pelo agendador de repetição espaçada.

---

## 11. Estados da interface

## 11.1. Carregamento

Utilizar skeletons com a mesma estrutura final:

- quatro skeletons de KPI;
- retângulo do gráfico;
- linhas do ranking;
- três cards inferiores.

Não trocar toda a tela por um spinner central.

## 11.2. Sem dados

Usuário novo:

- KPIs exibem `0` ou `—` de forma coerente;
- gráfico exibe eixos leves e mensagem central;
- ranking pode aparecer normalmente, com a linha do usuário como “Ainda sem pontuação”;
- recomendações oferecem ações iniciais;
- card motivacional convida a começar.

Mensagem sugerida no gráfico:

> Sua atividade aparecerá aqui depois da primeira sessão de estudo.

## 11.3. Erro parcial

Cada bloco deve falhar de forma independente:

- erro no ranking não remove o gráfico;
- erro nas recomendações não remove os KPIs;
- exibir botão **“Tentar novamente”** dentro do bloco afetado;
- enviar erro para observabilidade.

## 11.4. Dados desatualizados

Se a API retornar cache antigo, a interface pode mostrar os dados imediatamente e atualizar em segundo plano. Não é necessário exibir um aviso, salvo quando a defasagem ultrapassar um limite, por exemplo 15 minutos.

---

## 12. Responsividade

## 12.1. Desktop largo — acima de 1280 px

- quatro KPIs em uma linha;
- gráfico e ranking lado a lado;
- três ações em uma linha;
- card motivacional no topo direito.

## 12.2. Notebook — 1024 a 1279 px

- dois KPIs por linha ou quatro cards mais compactos, conforme o espaço real;
- gráfico e ranking podem continuar lado a lado se o ranking mantiver pelo menos 280 px;
- ilustrações podem diminuir.

## 12.3. Tablet — 768 a 1023 px

- dois KPIs por linha;
- gráfico em largura total;
- ranking abaixo do gráfico;
- cards inferiores em uma coluna ou duas colunas;
- tabs com rolagem horizontal.

## 12.4. Celular — abaixo de 768 px

- cabeçalho empilhado;
- card motivacional abaixo do título;
- um KPI por linha ou carrossel horizontal acessível;
- gráfico com altura menor e rolagem horizontal opcional;
- ranking em largura total;
- ações em uma coluna;
- valores internos das barras ocultos;
- botões ocupam largura suficiente para toque.

Breakpoints sugeridos:

```css
@media (max-width: 1199px) {
  .progress-summary-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 959px) {
  .progress-main-grid { grid-template-columns: 1fr; }
  .progress-actions-grid { grid-template-columns: 1fr; }
}

@media (max-width: 639px) {
  .progress-page { padding: 20px 16px 28px; }
  .progress-summary-grid { grid-template-columns: 1fr; }
}
```

---

## 13. Arquitetura de frontend

Os exemplos abaixo assumem Next.js com TypeScript, mas a divisão pode ser aplicada a outro framework.

## 13.1. Árvore de componentes

```text
ProgressPage
├── ProgressHeader
│   ├── PageTitle
│   └── MotivationCard
├── ProgressTabs
├── OverviewPanel
│   ├── ProgressSummaryGrid
│   │   ├── FlashcardsMetricCard
│   │   ├── QuizzesMetricCard
│   │   ├── GuidedStudyMetricCard
│   │   └── PerformanceMetricCard
│   ├── ProgressMainGrid
│   │   ├── WeeklyActivityCard
│   │   │   ├── WeeklyActivityChart
│   │   │   └── WeeklyInsight
│   │   └── GlobalRankingCard
│   └── NextActionsGrid
│       ├── ActivePathCard
│       ├── SuggestedQuizCard
│       └── SmartReviewCard
├── FlashcardsPanel
├── QuizzesPanel
└── GuidedStudyPanel
```

## 13.2. Responsabilidade dos componentes

- `ProgressPage`: carrega parâmetros de URL e dados iniciais.
- `ProgressTabs`: controla somente navegação e acessibilidade.
- `MetricCard`: componente base visual reutilizável.
- cards específicos: formatam dados e visualização de cada modo.
- `WeeklyActivityChart`: componente cliente, pois depende da biblioteca de gráficos.
- `GlobalRankingCard`: exibe dados prontos e dispara abertura do ranking completo.
- `NextActionsGrid`: recebe recomendações já selecionadas pelo backend.

Evitar que um único arquivo contenha toda a página.

## 13.3. Tipos TypeScript

```ts
export type Trend = {
  direction: 'up' | 'down' | 'stable' | 'new';
  value: number | null;
  unit: 'percent' | 'percentage_points' | null;
  label: string;
};

export type Metric = {
  value: number | null;
  trend: Trend;
  series: number[];
};

export type DailyActivity = {
  date: string;
  label: string;
  flashcards: number;
  quizInteractions: number;
  guidedSteps: number;
  total: number;
};

export type RankingEntry = {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  isCurrentUser: boolean;
};

export type ProgressOverviewResponse = {
  period: {
    start: string;
    end: string;
    timezone: string;
  };
  motivation: {
    type: string;
    title: string;
    message: string;
    illustration: string;
  };
  summary: {
    flashcards: Metric;
    quizzes: Metric;
    guided: Metric & {
      activePathId: string | null;
      activePathName: string | null;
    };
    performance: Metric;
  };
  activity: DailyActivity[];
  insight: {
    type: string;
    text: string;
  };
  ranking: {
    entries: RankingEntry[];
    currentUserRank: number | null;
    updatedAt: string;
  };
  recommendations: {
    guidedPath: unknown;
    quiz: unknown;
    review: unknown;
  };
};
```

## 13.4. Carregamento de dados

Estratégia sugerida:

- renderização inicial no servidor;
- hidratação e revalidação no cliente;
- TanStack Query ou SWR para cache, refetch e erro parcial;
- `staleTime` de 1 a 5 minutos para o resumo;
- ranking revalidado a cada 5 minutos;
- atualização imediata após concluir estudo.

Exemplo de chave:

```ts
['progress-overview', userId, periodStart, periodEnd, timezone]
```

Ao finalizar uma atividade, invalidar:

```ts
queryClient.invalidateQueries({ queryKey: ['progress-overview'] });
queryClient.invalidateQueries({ queryKey: ['progress-ranking'] });
```

## 13.5. URL e estado

```text
/progress?tab=overview
/progress?tab=flashcards
/progress?tab=quizzes
/progress?tab=guided
```

O período padrão é a semana atual. Se futuramente houver seletor de período:

```text
/progress?tab=overview&period=week&start=2026-06-14
```

## 13.6. Formatação

- utilizar `Intl.NumberFormat('pt-BR')` para pontos e totais;
- utilizar `Intl.DateTimeFormat('pt-BR')` para datas;
- não concatenar manualmente milhares com ponto;
- percentuais devem respeitar arredondamento centralizado no backend ou regra comum;
- valores de ranking exibem `pts`.

---

## 14. Arquitetura de backend

Os exemplos abaixo assumem FastAPI e PostgreSQL.

## 14.1. Fonte de verdade

Os indicadores não devem depender de valores enviados pelo frontend. O backend deve calcular tudo a partir de registros persistidos.

Entidades mínimas:

- revisões de flashcards;
- tentativas e respostas de quizzes;
- matrículas em trilhas guiadas;
- progresso em etapas guiadas;
- sequência diária;
- snapshots ou agregados diários;
- pontuação semanal de ranking.

## 14.2. Tabelas sugeridas

### `flashcard_reviews`

```sql
id uuid primary key,
user_id uuid not null,
flashcard_id uuid not null,
deck_id uuid not null,
rating varchar(16) not null,
is_correct boolean,
reviewed_at timestamptz not null,
idempotency_key varchar(128) unique,
created_at timestamptz not null default now()
```

### `quiz_attempts`

```sql
id uuid primary key,
user_id uuid not null,
quiz_id uuid not null,
started_at timestamptz not null,
completed_at timestamptz,
score numeric(5,2),
status varchar(20) not null
```

### `quiz_answers`

```sql
id uuid primary key,
attempt_id uuid not null,
question_id uuid not null,
is_correct boolean not null,
answered_at timestamptz not null
```

### `guided_enrollments`

```sql
id uuid primary key,
user_id uuid not null,
path_id uuid not null,
is_primary boolean not null default false,
status varchar(20) not null,
started_at timestamptz not null,
completed_at timestamptz,
last_activity_at timestamptz
```

### `guided_step_progress`

```sql
id uuid primary key,
enrollment_id uuid not null,
step_id uuid not null,
status varchar(20) not null,
is_required boolean not null default true,
score numeric(5,2),
completed_at timestamptz,
updated_at timestamptz not null
```

### `daily_user_progress`

Tabela agregada para reduzir custo das consultas:

```sql
user_id uuid not null,
local_date date not null,
timezone varchar(64) not null,
flashcard_reviews integer not null default 0,
quiz_attempts_completed integer not null default 0,
quiz_answers integer not null default 0,
quiz_correct_answers integer not null default 0,
guided_steps_completed integer not null default 0,
guided_correct_answers integer not null default 0,
graded_flashcards integer not null default 0,
correct_flashcards integer not null default 0,
study_seconds integer not null default 0,
primary key (user_id, local_date, timezone)
```

### `weekly_ranking_scores`

```sql
user_id uuid not null,
week_start date not null,
formula_version varchar(20) not null,
consistency_score integer not null,
performance_score integer not null,
engagement_score integer not null,
guided_score integer not null,
total_score integer not null,
calculated_at timestamptz not null,
primary key (user_id, week_start, formula_version)
```

## 14.3. Índices

```sql
create index idx_flashcard_reviews_user_date
  on flashcard_reviews (user_id, reviewed_at);

create index idx_quiz_attempts_user_completed
  on quiz_attempts (user_id, completed_at)
  where status = 'completed';

create index idx_quiz_answers_attempt
  on quiz_answers (attempt_id, answered_at);

create index idx_guided_enrollment_user_activity
  on guided_enrollments (user_id, last_activity_at desc);

create index idx_daily_progress_date
  on daily_user_progress (local_date, user_id);

create index idx_ranking_week_score
  on weekly_ranking_scores (week_start, total_score desc);
```

## 14.4. Registro de eventos

Cada conclusão deve ser persistida de forma transacional:

- ao responder um flashcard, criar `flashcard_review`;
- ao responder questão, criar `quiz_answer`;
- ao finalizar quiz, atualizar `quiz_attempt`;
- ao concluir etapa, atualizar `guided_step_progress`;
- depois, atualizar ou enfileirar atualização de `daily_user_progress`.

Usar chave de idempotência para evitar duplicação quando o cliente repetir uma requisição por falha de rede.

## 14.5. Agregação

Há duas estratégias válidas:

### Agregação síncrona

Após cada evento, atualizar o agregado diário na mesma transação. Vantagem: painel quase instantâneo. Desvantagem: maior custo na escrita.

### Agregação assíncrona

Persistir o evento e publicar uma tarefa em fila. Um worker atualiza o agregado. Vantagem: escrita mais leve. Desvantagem: atraso de alguns segundos.

Para o Flashify, recomenda-se:

- persistência do evento na transação principal;
- atualização assíncrona dos agregados;
- invalidação do cache ao concluir a tarefa;
- fallback para consulta direta quando o agregado ainda não existir.

## 14.6. Endpoint principal

Para reduzir múltiplas chamadas na visão geral:

```http
GET /api/v1/progress/overview?period=week&timezone=America/Manaus
Authorization: Bearer <token>
```

O servidor identifica o usuário pelo token. Nunca receber `user_id` livre na URL para dados privados.

### Resposta sugerida

```json
{
  "period": {
    "start": "2026-06-14T00:00:00-04:00",
    "end": "2026-06-20T23:59:59-04:00",
    "timezone": "America/Manaus"
  },
  "motivation": {
    "type": "above_four_week_average",
    "title": "Continue assim!",
    "message": "Você está acima da sua média das últimas 4 semanas.",
    "illustration": "flashinho-celebrating"
  },
  "summary": {
    "flashcards": {
      "value": 142,
      "trend": {
        "direction": "up",
        "value": 28,
        "unit": "percent",
        "label": "28% vs semana passada"
      },
      "series": [18, 32, 28, 42, 24, 36, 20]
    },
    "quizzes": {
      "value": 8,
      "trend": {
        "direction": "up",
        "value": 14,
        "unit": "percent",
        "label": "14% vs semana passada"
      },
      "series": [0, 1, 1, 2, 1, 2, 1]
    },
    "guided": {
      "value": 68,
      "trend": {
        "direction": "up",
        "value": 19,
        "unit": "percentage_points",
        "label": "19 p.p. nesta semana"
      },
      "series": [14, 20, 17, 22, 9, 20, 12],
      "activePathId": "path-uuid",
      "activePathName": "Direito Constitucional"
    },
    "performance": {
      "value": 87,
      "trend": {
        "direction": "up",
        "value": 9,
        "unit": "percentage_points",
        "label": "9 p.p. vs semana passada"
      },
      "series": [78, 82, 84, 83, 86, 85, 91]
    }
  },
  "activity": [
    {
      "date": "2026-06-14",
      "label": "Dom",
      "flashcards": 18,
      "quizInteractions": 6,
      "guidedSteps": 14,
      "total": 38
    }
  ],
  "insight": {
    "type": "best_day",
    "text": "Você foi mais consistente na quarta-feira! Que tal repetir essa energia amanhã? 🚀"
  },
  "ranking": {
    "entries": [],
    "currentUserRank": 5,
    "updatedAt": "2026-06-15T21:00:00Z"
  },
  "recommendations": {
    "guidedPath": {
      "id": "path-uuid",
      "title": "Direito Constitucional",
      "progress": 68,
      "nextStepId": "step-uuid",
      "actionUrl": "/guided/path-uuid/steps/step-uuid"
    },
    "quiz": {
      "id": "quiz-uuid",
      "title": "Constituição Federal – Questões",
      "questionCount": 12,
      "difficulty": "intermediário",
      "actionUrl": "/quizzes/quiz-uuid"
    },
    "review": {
      "dueCount": 23,
      "actionUrl": "/review?source=progress"
    }
  }
}
```

## 14.7. Endpoints complementares

```http
GET /api/v1/progress/flashcards?period=week
GET /api/v1/progress/quizzes?period=week
GET /api/v1/progress/guided?period=week
GET /api/v1/rankings/global?period=week&page=1&page_size=50
GET /api/v1/progress/recommendations
```

O endpoint principal pode devolver tudo necessário para o primeiro carregamento; os complementares atendem às abas e ao ranking completo.

## 14.8. Cache

Recomendação:

- resumo pessoal: cache de 1 a 3 minutos;
- ranking: cache de 5 minutos;
- recomendações: cache de 5 a 15 minutos;
- invalidar resumo pessoal após atividade concluída;
- recalcular ranking em job periódico;
- usar Redis quando disponível.

Chave de cache sugerida:

```text
progress:overview:{user_id}:{week_start}:{timezone}:v1
ranking:global:{week_start}:{formula_version}:page:{page}
```

---

## 15. Cálculo da sequência

Embora a sequência não apareça como card principal no mockup final, ela pode alimentar mensagens motivacionais e outras áreas do produto.

Regra recomendada:

- um dia conta quando o usuário atinge o critério mínimo de atividade;
- dias consecutivos são calculados no fuso local;
- atividade após meia-noite pertence ao novo dia local;
- a sequência atual termina quando um dia completo elegível fica sem atividade;
- armazenar também a maior sequência histórica.

Evitar depender do relógio do cliente. O servidor recebe timestamps e normaliza pelo fuso configurado.

---

## 16. Segurança e privacidade

- autenticar todos os endpoints pessoais;
- não aceitar pontuação calculada pelo cliente;
- abreviar nomes no ranking;
- disponibilizar opção de sair do ranking;
- não expor e-mail, matrícula ou identificador interno;
- usar URLs de avatar autorizadas e com fallback;
- limitar frequência de requisições ao ranking;
- validar ownership de decks, quizzes e trilhas;
- registrar auditoria de alterações na fórmula de pontuação.

---

## 17. Acessibilidade

A implementação deve atender, no mínimo, aos seguintes pontos:

- contraste AA para textos;
- foco visível em abas, botões e links;
- áreas clicáveis com pelo menos 44 × 44 px;
- ícones decorativos com `aria-hidden="true"`;
- textos alternativos somente quando a imagem comunica algo não repetido no texto;
- anéis de progresso com `role="progressbar"`, `aria-valuenow`, `aria-valuemin` e `aria-valuemax`;
- gráfico acompanhado de tabela textual;
- ranking implementado como lista ordenada;
- mudança de aba anunciada corretamente;
- mensagens de erro compreensíveis;
- nenhuma informação dependente exclusivamente da cor;
- animações respeitando `prefers-reduced-motion`.

Exemplo do anel:

```tsx
<div
  role="progressbar"
  aria-label="Progresso da trilha Direito Constitucional"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={68}
/>
```

---

## 18. Desempenho e observabilidade

Metas sugeridas:

- endpoint da visão geral abaixo de 300 ms no percentil 95 quando em cache;
- primeira renderização sem layout shift perceptível;
- biblioteca de gráfico carregada somente na aba necessária;
- imagens do mascote otimizadas em SVG ou WebP;
- logs estruturados com `user_id`, período e duração da consulta;
- métricas de erro por bloco;
- tracing das consultas de agregação;
- alerta se o job de ranking ficar atrasado.

Eventos de produto úteis:

```text
progress_page_viewed
progress_tab_changed
progress_ranking_opened
progress_guided_continue_clicked
progress_quiz_started_from_recommendation
progress_review_started_from_recommendation
```

Esses eventos servem para medir uso da página, não para calcular o progresso acadêmico.

---

## 19. Testes necessários

## 19.1. Backend

- cálculo correto com semana completa;
- semana anterior igual a zero;
- usuário sem atividade;
- mudança de fuso;
- evento exatamente na virada do dia;
- duplicação por retry;
- quiz abandonado não contado;
- etapa opcional não incluída no percentual obrigatório;
- ranking com empate;
- usuário fora do top 5;
- usuário fora do ranking por privacidade;
- regra de amostra mínima para desempenho;
- aplicação correta dos limites de pontos.

## 19.2. Frontend

- renderização dos quatro KPIs;
- tabs acessíveis por teclado;
- gráfico com sete dias;
- tooltip correto;
- estado vazio;
- erro apenas no ranking;
- skeleton sem alteração brusca de layout;
- responsividade em 1440, 1024, 768 e 375 px;
- botão de trilha abre próximo passo;
- botão de quiz abre quiz recomendado;
- botão de revisão abre sessão com cards vencidos;
- linha “Você” destacada corretamente;
- redução de movimento respeitada.

## 19.3. Testes de consistência

As seguintes invariantes devem ser validadas:

```text
activity[day].total = flashcards + quizInteractions + guidedSteps

sum(summary.flashcards.series) = summary.flashcards.value

ranking.total_score =
  consistency_score
  + performance_score
  + engagement_score
  + guided_score

guided_progress_percent está entre 0 e 100
performance_percent está entre 0 e 100
```

A série de quizzes do KPI pode representar quizzes concluídos por dia, enquanto a série do gráfico representa questões respondidas. Os nomes devem ser distintos no contrato para evitar confusão.

---

## 20. Ordem recomendada de implementação

### Fase 1 — Dados confiáveis

1. revisar os registros atuais de flashcards e quizzes;
2. persistir corretamente o progresso do estudo guiado;
3. padronizar timestamps e timezone;
4. implementar idempotência;
5. criar agregação diária.

### Fase 2 — API da visão geral

1. criar serviço de período semanal;
2. calcular KPIs e comparações;
3. gerar atividade diária;
4. selecionar trilha ativa;
5. calcular desempenho;
6. retornar contrato unificado.

### Fase 3 — Interface principal

1. cabeçalho e tabs;
2. grade de KPIs;
3. gráfico semanal;
4. insight;
5. estados de loading, erro e vazio.

### Fase 4 — Ranking

1. definir e versionar fórmula;
2. criar snapshots semanais;
3. adicionar job periódico;
4. implementar top 5 e posição do usuário;
5. criar ranking completo e opção de privacidade.

### Fase 5 — Recomendações

1. trilha ativa e próximo passo;
2. quiz por domínio fraco;
3. revisão por `due_at`;
4. telemetria dos cliques;
5. ajustes com base no uso real.

### Fase 6 — Qualidade

1. acessibilidade;
2. responsividade;
3. cache;
4. observabilidade;
5. testes de regressão visual;
6. otimização de consultas.

---

## 21. Critérios de aceite

A tela deixa de ser mockup e pode ser considerada funcional quando:

- os quatro indicadores são calculados com dados reais;
- flashcards, quizzes e estudo guiado possuem fontes de dados separadas;
- a semana atual e a anterior respeitam o fuso do usuário;
- o gráfico sempre representa sete dias e soma corretamente suas séries;
- o percentual da trilha corresponde a etapas obrigatórias reais;
- o desempenho usa apenas respostas avaliáveis;
- o ranking é calculado no servidor e possui fórmula versionada;
- a posição do usuário é real, mesmo fora do top 5;
- as três recomendações abrem ações válidas;
- o card motivacional e o insight mudam conforme os dados;
- loading, erro e estado vazio estão implementados;
- a tela funciona em desktop, tablet e celular;
- gráficos e controles são acessíveis por teclado e leitor de tela;
- nenhuma parte da implementação depende de valores fixos do mockup;
- o card “Distribuição do tempo” não existe nesta versão;
- a sidebar não é alterada por este trabalho.

---

## 22. Resumo da solução

A versão final da tela deve preservar a leveza do mockup, mas operar sobre uma base de dados confiável. O frontend é responsável por composição, interação, acessibilidade e visualização. O backend é responsável por períodos, agregações, tendências, ranking, recomendações e mensagens contextuais.

A separação principal deve ser:

```text
Frontend:
mostrar, navegar, animar, formatar e acionar.

Backend:
validar, registrar, agregar, comparar, pontuar e recomendar.
```

Com essa divisão, todos os números, gráficos, mensagens, posições e recomendações deixam de ser elementos estáticos e passam a representar o comportamento real do usuário dentro do Flashify.
