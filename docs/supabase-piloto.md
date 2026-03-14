# Piloto com Supabase

Esta base deixa o projeto pronto para testar leitura pública do Supabase sem quebrar o fluxo atual do GitHub Pages.

## O que já está pronto no projeto

- configuração pública em `src/ts/core/supabase-config.ts`
- leitura pública via REST em `src/ts/core/supabase.ts`
- SQL de criação em `supabase/setup.sql`
- SQL de seed em `supabase/seed.sql`

## O que você ainda precisa fazer no dashboard do Supabase

1. Criar o projeto.
2. Copiar:
   - `Project URL`
   - `Publishable key` ou `anon key`
3. Rodar `supabase/setup.sql` no `SQL Editor`.
4. Opcionalmente rodar `supabase/seed.sql`.
5. Criar o bucket público `portal-media`.
6. Criar um usuário administrativo em `Authentication > Users`.
7. Rodar novamente `supabase/setup.sql` sempre que as policies forem atualizadas no projeto.

## Conta administrativa do painel

Para que o painel da secretaria consiga gravar avisos e links no Supabase, crie um usuário em:

- `Authentication`
- `Users`
- `Add user`

Sugestão para o piloto:

- e-mail: `chief@gmail.com`
- senha: a senha que você quiser usar no painel
- marque a conta como confirmada, se o Supabase pedir essa opção

Depois disso, a própria tela `admin.html` passa a ter uma seção `Conexão editorial com Supabase` para autenticar essa conta no navegador da secretaria.

## Como preencher a configuração local

Abra `src/ts/core/supabase-config.ts` e troque os placeholders:

```ts
export const SUPABASE_CONFIG: SupabasePublicConfig = {
  projectUrl: "https://SEU-PROJETO.supabase.co",
  publishableKey: "SUA_CHAVE_PUBLICA",
  storageBucket: "portal-media",
  enabled: true
};
```

Importante:

- essa chave é pública e pode ficar no front-end;
- não use `service_role` no navegador;
- enquanto `enabled` estiver `false`, nada do site vai tentar falar com o Supabase.

## Próximo passo técnico

Depois de preencher as chaves, rode:

```powershell
npm run verify
```

A integração de leitura já está pronta. O próximo passo é ligar home, portal e painel a esse módulo, substituindo o fluxo atual baseado em GitHub.
