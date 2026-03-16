# CEEJA Paulo Decourt

Site institucional do CEEJA Paulo Decourt, publicado no GitHub Pages.

## Estrutura

- `index.html`: home pública
- `portal.html`: portal do aluno
- `admin.html`: painel editorial da secretaria
- `wifi.html`, `livros.html`, `roteiros.html`: páginas de apoio
- `assets/images/`: logo e imagens do site
- `assets/css/shared/`: estilos compartilhados
- `assets/css/pages/`: estilos específicos por página
- `assets/js/core/`: módulos gerados a partir do TypeScript para autenticação e conteúdo compartilhado
- `assets/js/pages/`: scripts gerados por página
- `src/ts/`: código-fonte principal em TypeScript
- `data/site-content.json`: fallback local de conteúdo público
- `supabase/`: SQL, configuração e functions do Supabase
- `docs/`: documentação de apoio

## Arquitetura atual

- o GitHub continua responsável pelo código e pelo deploy do frontend;
- o Supabase é a fonte principal do conteúdo editorial:
  - avisos
  - links rápidos
  - galeria do portal
- `data/site-content.json` permanece como fallback local de leitura.

## Desenvolvimento

Scripts disponíveis:

- `npm run typecheck`: valida os arquivos TypeScript sem gerar saída
- `npm run build`: gera os arquivos JavaScript em `assets/js`
- `npm run verify`: executa `typecheck` e `build` em sequência
- `npm run clean`: remove os arquivos JavaScript e `.d.ts` gerados a partir de `src/ts`
- `npm run rebuild`: limpa os gerados e executa um novo build completo
- `npm run typecheck:watch`: mantém a checagem de tipos em modo observação
- `npm run build:watch`: recompila automaticamente enquanto os arquivos `.ts` mudam

## Supabase

Arquivos principais:

- `src/ts/core/supabase-config.ts`
- `src/ts/core/supabase.ts`
- `supabase/setup.sql`
- `supabase/seed.sql`
- `docs/supabase-piloto.md`

Se `enabled` estiver `false` em `supabase-config.ts`, o site volta a usar o fallback local.

## Publicação

Para publicar o frontend:

1. envie o repositório para a branch `main`
2. abra `Settings > Pages`
3. selecione `GitHub Actions` em `Build and deployment`
4. aguarde a execução do workflow `Deploy GitHub Pages`
