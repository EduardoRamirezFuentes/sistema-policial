-- Add activo column to oficiales table if it doesn't exist
ALTER TABLE oficiales 
ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1 
COMMENT '1 = Activo, 0 = Inactivo';

-- Update existing records to be active by default if the column was just added
UPDATE oficiales SET activo = 1 WHERE activo IS NULL;
