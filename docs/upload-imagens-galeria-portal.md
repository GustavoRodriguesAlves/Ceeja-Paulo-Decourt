# Upload de Imagens para a Galeria do Portal

## Objetivo

Permitir que a secretaria:

- envie imagens diretamente do computador local;
- visualize as imagens já disponíveis no portal;
- escolha uma imagem existente sem precisar digitar caminhos manualmente;
- publique a galeria para todos os usuários no site público.

## Diagnóstico do estado atual

Hoje o painel da secretaria:

- aceita apenas o caminho manual da imagem;
- não faz upload de arquivo;
- não oferece biblioteca visual;
- depende de o usuário conhecer o nome e o local do arquivo no projeto.

Isso funciona tecnicamente, mas é inadequado para uso operacional da secretaria.

## Arquitetura recomendada

### Princípio

Como o site está em GitHub Pages, não existe backend próprio para upload.

Então o fluxo correto é:

1. a secretaria escolhe uma imagem no computador;
2. o painel gera preview local;
3. o painel envia o arquivo para o repositório via GitHub API;
4. o arquivo é salvo no repositório;
5. o `data/site-content.json` é atualizado com a nova imagem;
6. o GitHub Pages publica a atualização para todos.

## Estrutura de arquivos recomendada

### Pasta de imagens do portal

Criar e usar esta pasta:

`assets/images/portal/`

Motivos:

- separa as imagens editoriais da galeria das imagens institucionais fixas;
- evita misturar logo, fundos e mídia dinâmica;
- facilita listagem e manutenção futura.

### Estrutura esperada

```text
assets/
  images/
    portal/
      portal-20260314-101530-feira-cultural.jpg
      portal-20260314-101812-oficina-redacao.jpg
```

## Modelo de dados

Cada item da galeria no `data/site-content.json` deve seguir este formato:

```json
{
  "id": "media-1741940000000",
  "title": "Oficina de redação",
  "src": "assets/images/portal/portal-20260314-101812-oficina-redacao.jpg",
  "alt": "Alunos em atividade de redação na sala de aula",
  "order": 2,
  "published": true
}
```

## Fluxo de uso no painel

### 1. Aba Galeria do Portal

Substituir o campo puramente manual por duas possibilidades:

- `Enviar nova imagem`
- `Usar imagem existente`

### 2. Enviar nova imagem

Campos:

- arquivo da imagem
- título interno
- texto alternativo
- ordem de exibição
- publicar no site

Comportamento:

- ao selecionar arquivo, mostrar preview imediato;
- ao salvar, o painel sobe o arquivo para o GitHub;
- depois salva o item no `site-content.json`.

### 3. Biblioteca de imagens existentes

Mostrar uma grade com:

- miniatura
- nome do arquivo
- título interno, se já estiver cadastrado
- botão `Usar esta imagem`
- botão `Excluir da galeria`

Opcional futuro:

- botão `Excluir do repositório`

## Nomeação de arquivos

### Regra recomendada

Gerar nomes automáticos no painel, sem depender do nome original do arquivo.

Formato:

`portal-AAAAMMDD-HHMMSS-slug.ext`

Exemplo:

`portal-20260314-101812-oficina-redacao.jpg`

### Motivos

- evita conflito de nomes;
- padroniza o repositório;
- melhora rastreabilidade;
- impede nomes confusos como `IMG_3387(1).jpeg`.

### Regra de slug

- minúsculas;
- remover acentos;
- trocar espaços por `-`;
- remover caracteres especiais.

## Regras de validação

### Tipos aceitos

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

### Limites recomendados

- tamanho máximo: `5 MB`
- largura mínima opcional: `800 px`

### Regras editoriais

- exigir `alt`;
- exigir `title`;
- impedir publicação se o upload falhar;
- impedir itens com `src` vazio.

## Fluxo técnico com GitHub API

### Etapa 1. Upload do arquivo

Usar a GitHub Contents API para criar um novo arquivo em:

`assets/images/portal/NOME-GERADO.ext`

### Etapa 2. Atualização do JSON

Depois do upload da imagem:

- carregar o `data/site-content.json` atual;
- inserir ou atualizar o item da galeria;
- publicar o JSON no repositório.

### Ordem correta

1. upload da imagem;
2. atualização do `site-content.json`.

Se a ordem for invertida e o upload falhar, o site pode apontar para imagem inexistente.

## Biblioteca visual

### Fonte dos dados

A biblioteca deve combinar 2 fontes:

1. imagens já cadastradas em `data/site-content.json`;
2. arquivos existentes em `assets/images/portal/`.

### Observação importante

A GitHub Contents API consegue listar arquivos de uma pasta do repositório.

Então o painel pode:

- consultar `assets/images/portal/`;
- renderizar as miniaturas;
- permitir reaproveitamento de arquivos já enviados.

## Exclusão

### Remover da galeria

Remove apenas a referência no `site-content.json`.

Uso recomendado:

- quando a imagem não deve mais aparecer no portal, mas pode ser reutilizada depois.

### Excluir do repositório

Remove o arquivo físico do GitHub.

Uso recomendado:

- só em etapa posterior;
- exige mais cuidado porque pode quebrar referências antigas.

### Recomendação

Na primeira versão:

- implementar apenas `remover da galeria`;
- não excluir arquivo do repositório ainda.

Isso reduz risco operacional.

## Segurança

### Token

Continuar usando o token fino do GitHub já conectado no painel.

Permissões mínimas:

- `Contents: Read and write`

### Risco conhecido

O token continua vivendo na sessão do navegador.

Isso é aceitável para este projeto enquanto:

- o painel for acessado apenas pela secretaria;
- não houver backend próprio;
- o token não for persistido fora da sessão.

## Melhor caminho de implementação

### Fase 1

- upload real de imagem para `assets/images/portal/`
- preview local
- geração automática de nome de arquivo
- cadastro da imagem no JSON
- biblioteca com imagens já cadastradas

### Fase 2

- biblioteca lendo também arquivos da pasta no GitHub
- filtro e busca
- botão `usar imagem existente`

### Fase 3

- exclusão física do repositório
- compressão automática
- recorte ou redimensionamento opcional

## Decisão recomendada

Implementar agora:

- upload de nova imagem;
- preview local;
- nome automático;
- publicação da imagem no GitHub;
- atualização da galeria do portal;
- biblioteca visual inicial com as imagens cadastradas no JSON.

Não implementar agora:

- exclusão física de arquivos do repositório;
- armazenamento local em base64;
- campo manual como fluxo principal.

## Resumo

A ideia é correta e melhora bastante a usabilidade do painel.

O melhor desenho técnico para este projeto é:

- `assets/images/portal/` como pasta de destino;
- upload via GitHub API;
- atualização do `data/site-content.json`;
- preview local;
- biblioteca visual de imagens já cadastradas;
- seleção de imagem existente sem digitar caminho.
