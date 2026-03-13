# Rascunho final do painel da secretaria

## Objetivo

Dar para a secretaria um painel simples, no estilo de um mini WordPress, para atualizar o site sem editar HTML manualmente.

## Estrutura final desejada

### 1. Visão geral
- indicadores rápidos de avisos, links e última atualização
- resumo do que está em destaque na home
- atalhos para editar avisos, links e texto principal

### 2. Avisos do dia
- cadastro de novo aviso
- edição de avisos existentes
- status de publicação
- categoria
- data
- opção de destaque

Uso esperado:
- registrar orientações do dia
- avisos de matrícula
- alterações de horário
- comunicados urgentes

### 3. Links rápidos
- cadastro de links úteis para a home
- ativar ou ocultar links
- editar e excluir com poucos cliques

Uso esperado:
- WhatsApp da direção
- consulta pública
- Instagram oficial
- serviços recorrentes da secretaria

### 4. Texto da home
- editar o título principal
- editar o texto de apoio
- visualizar prévia antes de publicar

### 5. Publicação
- mostrar o JSON atual do conteúdo
- exportar o arquivo pronto
- importar um arquivo salvo
- orientar como substituir `data/site-content.json`

## Implementação desta fase

Nesta primeira fase, o painel:
- salva rascunhos no navegador da secretaria com `localStorage`
- já alimenta a home localmente no mesmo navegador
- exporta e importa `JSON`
- usa `data/site-content.json` como base pública do site

## Próxima fase recomendada

Para virar um painel operacional definitivo, o ideal é conectar isso a um backend de publicação. Os caminhos mais realistas são:

1. fluxo com GitHub API ou automação de commit
2. CMS Git-based
3. backend próprio com autenticação

## Arquivos envolvidos nesta fase

- `admin.html`
- `data/site-content.json`
- `index.html`
