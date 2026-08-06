-- Hot path: açık sipariş lookup (tableId + status)
CREATE INDEX IF NOT EXISTS "Order_tableId_status_idx" ON "Order"("tableId", "status");
CREATE INDEX IF NOT EXISTS "Order_businessId_tableId_status_idx" ON "Order"("businessId", "tableId", "status");
