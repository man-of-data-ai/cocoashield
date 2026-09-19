ALTER TABLE platform_settings ALTER COLUMN refresh_interval_connected_s SET DEFAULT 2;
UPDATE platform_settings SET refresh_interval_connected_s = 2 WHERE refresh_interval_connected_s = 10;
