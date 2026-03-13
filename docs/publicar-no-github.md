# Como publicar este site no GitHub Pages

## Situação atual

O projeto já está preparado localmente para deploy automático:

- workflow do GitHub Pages configurado
- `.nojekyll` criado
- arquivos estáticos prontos para servir na raiz

## O que fazer no GitHub

1. Crie um repositório novo.
2. Envie o conteúdo desta pasta para a branch `main`.
3. Abra `Settings > Pages`.
4. Em `Build and deployment`, escolha `GitHub Actions`.
5. Verifique a aba `Actions` até o workflow terminar.

## URL esperada

Se o repositório for de projeto:

- `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`

Se for um repositório especial com nome `SEU-USUARIO.github.io`:

- `https://SEU-USUARIO.github.io/`

## Observação importante

As páginas usam links relativos, então o site funciona tanto em repositório de projeto quanto em repositório de usuário.
