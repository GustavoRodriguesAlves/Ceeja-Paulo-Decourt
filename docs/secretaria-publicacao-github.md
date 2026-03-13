# Publicação Automática da Secretaria

Este painel pode publicar avisos, links e imagens para todos os usuários do site, desde que a secretaria conecte um token fino do GitHub com permissão de escrita no repositório.

## Repositório usado

- `owner`: `GustavoRodriguesAlves`
- `repo`: `Ceeja-Paulo-Decourt`
- `branch`: `main`
- arquivo publicado: `data/site-content.json`

## Como criar o token fino no GitHub

1. Entre na conta que possui acesso ao repositório.
2. Abra `Settings`.
3. Vá em `Developer settings`.
4. Abra `Personal access tokens`.
5. Clique em `Fine-grained tokens`.
6. Clique em `Generate new token`.
7. Preencha:
   - `Token name`: `CEEJA Secretaria`
   - `Expiration`: escolha um prazo apropriado
   - `Resource owner`: `GustavoRodriguesAlves`
   - `Repository access`: `Only select repositories`
   - selecione `Ceeja-Paulo-Decourt`
8. Em `Repository permissions`, libere:
   - `Contents`: `Read and write`
9. Gere o token e copie o valor imediatamente.

## Como conectar no painel

1. Abra o `Painel da Secretaria`.
2. Na seção `Publicação automática no GitHub`, cole o token.
3. Clique em `Conectar GitHub`.
4. Se tudo estiver certo, o painel mostrará que as alterações passarão a ser publicadas automaticamente.

## Como testar

1. Cadastre um aviso novo.
2. Salve.
3. Aguarde alguns segundos.
4. Abra a home pública ou o portal do aluno em uma janela anônima.
5. Confirme se o aviso já aparece para todos.

## O que acontece por trás

- o painel continua guardando um rascunho local no navegador;
- quando existe token conectado, ele também atualiza `data/site-content.json` no GitHub;
- isso dispara o workflow do GitHub Pages;
- o site público passa a servir a versão nova para todos os visitantes.

## Se der erro

- confirme se a conta realmente tem acesso de escrita ao repositório;
- confirme se o token foi criado como `fine-grained`;
- confirme se a permissão `Contents` está em `Read and write`;
- confira se o repositório selecionado é exatamente `Ceeja-Paulo-Decourt`.
