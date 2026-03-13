# CEEJA Paulo Decourt

Site institucional estático do CEEJA Paulo Decourt, publicado via GitHub Pages.

## Estrutura

- `index.html`: home pública
- `portal.html`: portal do aluno
- `admin.html`: painel editorial da secretaria
- `wifi.html`, `livros.html`, `roteiros.html`: páginas de apoio
- `assets/images/`: logo e imagens do site
- `assets/css/shared/`: estilos compartilhados
- `assets/css/pages/`: estilos específicos por página
- `assets/js/core/`: autenticação e conteúdo compartilhado
- `assets/js/pages/`: scripts específicos por página
- `data/site-content.json`: conteúdo estruturado da home
- `docs/`: documentação do projeto e arquivos de referência

## Critérios usados na organização

- estilos e scripts foram separados do HTML;
- código compartilhado foi isolado de código específico de página;
- imagens e documentos saíram da raiz do projeto;
- a estrutura foi mantida simples para funcionar bem no GitHub Pages.

## Publicação

O projeto já possui deploy automático configurado em `.github/workflows/deploy-pages.yml`.

Para publicar:

1. envie o repositório para a branch `main`;
2. abra `Settings > Pages`;
3. selecione `GitHub Actions` em `Build and deployment`;
4. aguarde a execução do workflow `Deploy GitHub Pages`.
