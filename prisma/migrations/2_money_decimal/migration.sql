-- Money/quantity fields: binary floating point -> exact decimal.
-- Existing values are cast from double precision and rounded to 6 (quantity) and 4 (avgPrice) decimal places.
-- Bounds: validation caps quantity at 1e9 and price at 1e7, well inside both precisions.
-- AlterTable
ALTER TABLE "portfolio_holdings" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(20,6),
ALTER COLUMN "avgPrice" SET DATA TYPE DECIMAL(18,4);

