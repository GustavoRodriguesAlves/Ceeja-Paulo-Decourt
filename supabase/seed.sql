insert into public.notices (title, summary, category, date, featured, published)
values
  (
    'Aviso de teste',
    'Este é um aviso de teste vindo do Supabase para validar a leitura pública.',
    'Secretaria',
    current_date,
    true,
    true
  );

insert into public.quick_links (label, url, published)
values
  (
    'Portal SED',
    'https://sed.educacao.sp.gov.br/',
    true
  );
