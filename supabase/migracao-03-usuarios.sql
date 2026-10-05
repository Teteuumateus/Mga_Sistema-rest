-- =====================================================================
-- MGA Restaurante · migração 03: usuários só são alterados pelo servidor
-- =====================================================================
-- Rode DEPOIS da migração 02 (Supabase › SQL Editor › New query › cole › Run).
-- Pode rodar mais de uma vez sem problema.
--
-- Antes: qualquer funcionário logado podia alterar a tabela usuarios pela API (até se dar o
-- perfil de administrador). Agora o sistema só LÊ usuários e módulos; criar, alterar e excluir
-- é feito pela Edge Function "usuarios", que confere se quem pede é o administrador.
-- (O primeiro acesso continua funcionando: a função criar_empresa roda com permissão própria.)

drop policy if exists usuarios_da_empresa on public.usuarios;
drop policy if exists usuarios_ver on public.usuarios;
create policy usuarios_ver on public.usuarios for select to authenticated using (empresa_id = public.minha_empresa());

drop policy if exists usuario_modulos_da_empresa on public.usuario_modulos;
drop policy if exists usuario_modulos_ver on public.usuario_modulos;
create policy usuario_modulos_ver on public.usuario_modulos for select to authenticated using (empresa_id = public.minha_empresa());

-- Tempo real também para a lista de usuários
do $$
begin
  alter publication supabase_realtime add table public.usuarios;
exception when duplicate_object then null;
end $$;
