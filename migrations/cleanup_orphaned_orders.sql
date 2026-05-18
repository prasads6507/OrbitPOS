-- OrbitPOS: Clean up orphaned orders that have no order_items remaining
-- Run this in Supabase SQL Editor to remove stale order data from deleted products

-- Delete orders that have zero order_items left
DELETE FROM orders
WHERE id NOT IN (
  SELECT DISTINCT order_id FROM order_items
);
