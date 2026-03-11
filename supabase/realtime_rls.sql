-- ============================================================
-- Run this in Supabase SQL Editor if real-time isn't working
-- ============================================================

-- 1. Enable real-time on flood_reports
ALTER PUBLICATION supabase_realtime ADD TABLE flood_reports;

-- 2. Allow anon (frontend) to READ and INSERT reports
ALTER TABLE flood_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read reports"
  ON flood_reports FOR SELECT USING (true);
CREATE POLICY "Public can insert reports"
  ON flood_reports FOR INSERT WITH CHECK (true);

-- Allow backend (service role) to UPDATE/DELETE — already works via service role key
-- Allow frontend to read shelters and counties
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read shelters"
  ON shelters FOR SELECT USING (true);

ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read counties"
  ON counties FOR SELECT USING (true);

-- Verify realtime is enabled:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
