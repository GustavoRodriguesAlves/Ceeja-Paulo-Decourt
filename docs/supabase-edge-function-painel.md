# Edge Function do painel

Esta função permite que o dono do painel:

- crie a conta de autenticação do editor no Supabase
- defina ou troque a senha desse editor
- grave o e-mail na `admin_allowlist`

## Arquivos

- `supabase/functions/manage-panel-users/index.ts`
- `supabase/functions/_shared/cors.ts`

## O que a função faz

1. valida a sessão do usuário atual pelo token do Supabase
2. confirma se esse usuário é `owner` em `public.admin_allowlist`
3. cria ou atualiza a conta no `Supabase Auth`
4. grava ou atualiza o e-mail permitido em `public.admin_allowlist`

## Secrets necessários

No Supabase, a função precisa ter acesso a:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Esses valores ficam no ambiente da Edge Function. Nunca coloque a `service_role` no front-end.

## Deploy

Você pode publicar essa função por CLI ou pelo fluxo disponível no dashboard do Supabase.

Nome da função:

- `manage-panel-users`

Depois do deploy, o painel passa a chamar:

- `/functions/v1/manage-panel-users`

## Observações

- remover um e-mail da allowlist corta o acesso ao painel, mas não apaga automaticamente a conta do `Auth`
- ao editar um usuário existente, a senha pode ficar em branco para manter a atual
- apenas o `owner` pode usar esse recurso
