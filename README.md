# CEEJA Paulo Decourt

Site institucional estático do CEEJA Paulo Decourt, publicado via GitHub Pages.

## Estrutura

- `index.html`: home pública
- `portal.html`: portal do aluno de teste
- `admin.html`: painel editorial da secretaria
- `wifi.html`, `livros.html`, `roteiros.html`: páginas de apoio
- `assets/`: imagens, CSS e JavaScript compartilhados
- `data/site-content.json`: conteúdo estruturado da home

## Organização atual

- autenticação e chaves compartilhadas em `assets/js/auth.js`
- leitura e persistência do conteúdo público em `assets/js/site-content.js`
- estilos comuns das páginas internas em `assets/css/secondary-pages.css`

## Publicação

O projeto já possui deploy automático configurado em `.github/workflows/deploy-pages.yml`.

Para publicar:

1. envie o repositório para a branch `main`;
2. abra `Settings > Pages`;
3. selecione `GitHub Actions` em `Build and deployment`;
4. aguarde a execução do workflow `Deploy GitHub Pages`.
