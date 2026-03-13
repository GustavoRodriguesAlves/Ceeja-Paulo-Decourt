# CEEJA Paulo Decourt

Site institucional estÃ¡tico do CEEJA Paulo Decourt, publicado via GitHub Pages.

## Estrutura

- `index.html`: home pÃºblica
- `portal.html`: portal do aluno
- `admin.html`: painel editorial da secretaria
- `wifi.html`, `livros.html`, `roteiros.html`: pÃ¡ginas de apoio
- `assets/images/`: logo e imagens do site
- `assets/css/shared/`: estilos compartilhados
- `assets/css/pages/`: estilos especÃ­ficos por pÃ¡gina
- `assets/js/core/`: autenticaÃ§Ã£o e conteÃºdo compartilhado
- `assets/js/pages/`: scripts especÃ­ficos por pÃ¡gina
- `data/site-content.json`: conteÃºdo estruturado da home
- `docs/`: documentaÃ§Ã£o do projeto e arquivos de referÃªncia

## CritÃ©rios usados na organizaÃ§Ã£o

- estilos e scripts foram separados do HTML;
- cÃ³digo compartilhado foi isolado de cÃ³digo especÃ­fico de pÃ¡gina;
- imagens e documentos saÃ­ram da raiz do projeto;
- a estrutura foi mantida simples para funcionar bem no GitHub Pages.

## PublicaÃ§Ã£o

O projeto jÃ¡ possui deploy automÃ¡tico configurado em `.github/workflows/deploy-pages.yml`.

Para publicar:

1. envie o repositÃ³rio para a branch `main`;
2. abra `Settings > Pages`;
3. selecione `GitHub Actions` em `Build and deployment`;
4. aguarde a execuÃ§Ã£o do workflow `Deploy GitHub Pages`.
