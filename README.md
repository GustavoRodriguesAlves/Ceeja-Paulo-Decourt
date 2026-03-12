# CEEJA Paulo Decourt

Site estático preparado para publicação no GitHub Pages.

## Estrutura principal

- `index.html`: home pública
- `portal.html`: área autenticada de teste
- `assets/`: imagens e logo
- `wifi.html`, `livros.html`, `roteiros.html`: páginas auxiliares

## Publicação no GitHub Pages

Este projeto já está configurado com workflow em `.github/workflows/deploy-pages.yml`.

Quando o repositório for enviado para a branch `main`, o GitHub Actions fará o deploy automático no GitHub Pages.

## Passos que ainda dependem da sua conta GitHub

1. Criar um repositório no GitHub.
2. Enviar estes arquivos para a branch `main`.
3. No repositório, abrir `Settings > Pages`.
4. Em `Source`, selecionar `GitHub Actions`.
5. Após o primeiro push, aguardar o workflow `Deploy GitHub Pages`.

## Observação

Como o ambiente atual não possui `git` nem `gh`, a criação do repositório remoto e o push inicial não puderam ser executados daqui.
