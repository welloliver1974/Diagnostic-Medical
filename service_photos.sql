-- Criar bucket de fotos (público, max 5MB, só imagens)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'service_photos', 'service_photos', true, false, 5242880, '{image/jpeg,image/png,image/webp}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'service_photos');

-- Política: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Upload fotos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'service_photos');

-- Política: qualquer um pode ver/download
CREATE POLICY "Ler fotos" ON storage.objects
FOR SELECT
USING (bucket_id = 'service_photos');
