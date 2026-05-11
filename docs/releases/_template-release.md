# Template de Release

Este arquivo serve como modelo para documentar releases em construcao e releases fechadas do Flashify.

## Padrao de nome recomendado

Usar o formato:

`YYYY-MM-DD-release-<slug>.md`

Exemplos:

- `2026-05-11-release-melhorias-na-experiencia-de-estudo.md`
- `2026-06-03-release-evolucao-da-operacao-admin.md`

## 1. Identificacao

- `Titulo da release`:
- `Slug`:
- `Status`: `Em construcao` | `Em validacao` | `Pronta para deploy` | `Publicada`
- `Data de abertura`:
- `Data prevista para fechamento`:
- `Responsavel`:

## 2. Visao geral

Descrever em um paragrafo curto:

- qual problema a release resolve
- por que ela existe
- qual impacto esperado no produto

## 3. Objetivo

Listar os objetivos principais da release.

- 
- 
- 

## 4. Escopo da release

Descrever o que esta dentro do escopo atual.

### 4.1. Entradas confirmadas

- 
- 
- 

### 4.2. Fora de escopo

- 
- 
- 

## 5. Funcionalidades concluidas

Registrar apenas o que ja foi implementado e incorporado ao escopo da release.

### 5.1. Feat 1

- `Nome`:
- `Status`: `Concluida`
- `Descricao`:
- `Impacto no usuario`:
- `Impacto tecnico`:

### 5.2. Feat 2

- `Nome`:
- `Status`: `Concluida`
- `Descricao`:
- `Impacto no usuario`:
- `Impacto tecnico`:

## 6. Itens em andamento

Registrar frentes ja iniciadas, mas ainda nao fechadas.

### 6.1. Item em andamento

- `Nome`:
- `Status`: `Em andamento`
- `Descricao atual`:
- `Dependencias`:
- `Risco atual`:

## 7. Itens planejados

Registrar o que deve entrar antes do fechamento da release.

### 7.1. Item planejado

- `Nome`:
- `Status`: `Planejado`
- `Descricao esperada`:
- `Criterio de entrada na release`:

## 8. Correcoes e ajustes incluidos

Separar aqui bugs, refinamentos de UX, ajustes de comportamento e estabilizacao.

- 
- 
- 

## 9. Impacto tecnico

### 9.1. Frontend

- componentes afetados:
- riscos principais:
- cuidados de responsividade:

### 9.2. Backend

- servicos ou rotas afetadas:
- impactos de compatibilidade:

### 9.3. Banco de dados

- migrations envolvidas:
- impacto esperado:
- cuidados de rollback:

### 9.4. Dependencias

- novas dependencias:
- dependencias alteradas:

## 10. QA e validacao

### 10.1. Cenarios obrigatorios

- [ ] validar fluxo principal no desktop
- [ ] validar fluxo principal no mobile
- [ ] validar estados vazios e estados de erro
- [ ] validar regressao nas areas adjacentes

### 10.2. Casos especificos desta release

- [ ] 
- [ ] 
- [ ] 

## 11. Deploy

### 11.1. Pre-requisitos

- [ ] migrations aplicadas
- [ ] dependencias instaladas
- [ ] build atualizado
- [ ] variaveis de ambiente revisadas

### 11.2. Passos de deploy

1. 
2. 
3. 

## 12. Rollback

Descrever como desfazer a release se necessario.

- `Aplicacao`:
- `Banco de dados`:
- `Risco do rollback`:

## 13. Riscos e pontos de atencao

- 
- 
- 

## 14. Criterios para fechamento da release

- [ ] todas as funcionalidades previstas foram entregues
- [ ] checklist de QA foi concluido
- [ ] riscos bloqueantes foram resolvidos
- [ ] documentacao final foi atualizada
- [ ] release esta pronta para deploy ou publicada

## 15. Evidencias e referencias

- links para PRs:
- links para issues:
- links para gravacoes:
- links para documentos de apoio:

## 16. Historico de atualizacao

### YYYY-MM-DD

- descricao da atualizacao realizada no documento

