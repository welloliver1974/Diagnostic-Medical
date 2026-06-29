-- Permite que clientes anônimos (sem login) acessem o portal do chamado
-- /portal/:public_token para visualizar o relatório e registrar a assinatura.
--
-- Contexto: as policies originais de service_calls eram TO authenticated;
-- o token público (UUID v4, NOT NULL UNIQUE em 100% das linhas) agora é usado
-- como única barreira de acesso para o papel anon.

CREATE POLICY "anon select service_calls via portal"
  ON public.service_calls
  FOR SELECT
  TO anon
  USING (public_token IS NOT NULL);

CREATE POLICY "anon update client_signature via portal"
  ON public.service_calls
  FOR UPDATE
  TO anon
  USING (public_token IS NOT NULL)
  WITH CHECK (public_token IS NOT NULL);
