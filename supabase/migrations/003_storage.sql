-- Fotoğraf storage bucket oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('hive-photos', 'hive-photos', true)
ON CONFLICT DO NOTHING;

-- Storage RLS politikaları
CREATE POLICY "Kullanıcı kendi fotoğraflarını yükleyebilir"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hive-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Herkese açık görüntüleme"
ON storage.objects FOR SELECT
USING (bucket_id = 'hive-photos');

CREATE POLICY "Kullanıcı kendi fotoğraflarını silebilir"
ON storage.objects FOR DELETE
USING (bucket_id = 'hive-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
