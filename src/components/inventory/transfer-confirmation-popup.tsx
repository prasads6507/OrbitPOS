'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Info,
  DollarSign,
  Boxes
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function TransferConfirmationPopup() {
  const { profile } = useAuthStore();
  const [pendingTransfer, setPendingTransfer] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.store_id) {
      checkPendingTransfers();
      
      // Subscribe to real-time additions of stock transfers
      const channel = supabase
        .channel('new_transfers_realtime')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'stock_transfers',
          filter: `target_store_id=eq.${profile.store_id}` 
        }, () => {
          checkPendingTransfers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const checkPendingTransfers = async () => {
    if (!profile?.store_id) return;
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*, stores!stock_transfers_source_store_id_fkey(name)')
        .eq('target_store_id', profile.store_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setPendingTransfer(data);
        setOpen(true);
      }
    } catch (err) {
      console.error('Error checking pending transfers:', err);
    }
  };

  const handleConfirm = async () => {
    if (!pendingTransfer || !profile?.store_id) return;
    setLoading(true);

    try {
      const items = pendingTransfer.items as any[];

      for (const item of items) {
        // 1. Fetch source product details to ensure we decrease its quantity
        // and copy correct metadata if it's a new item in the destination store
        const { data: sourceProduct, error: sourceFetchError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', pendingTransfer.source_store_id)
          .eq('sku', item.sku)
          .maybeSingle();

        if (sourceProduct) {
          // A. Decrement stock from the source (admin) inventory
          const newSourceQty = Math.max(0, (sourceProduct.stock_quantity || 0) - item.quantity);
          const { error: sourceUpdateError } = await supabase
            .from('products')
            .update({ stock_quantity: newSourceQty })
            .eq('id', sourceProduct.id);
          
          if (sourceUpdateError) throw sourceUpdateError;
        }

        // 2. Check if product already exists by SKU in target (employee's) store
        const { data: existingTargetProduct } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', profile.store_id)
          .eq('sku', item.sku)
          .maybeSingle();

        if (existingTargetProduct) {
          // B. Increment stock in the target store inventory
          const newTargetQty = (existingTargetProduct.stock_quantity || 0) + item.quantity;
          const { error: targetUpdateError } = await supabase
            .from('products')
            .update({ stock_quantity: newTargetQty })
            .eq('id', existingTargetProduct.id);
          
          if (targetUpdateError) throw targetUpdateError;
        } else {
          // C. If product doesn't exist in destination, copy details from source and insert new
          if (sourceProduct) {
            const { error: targetInsertError } = await supabase
              .from('products')
              .insert({
                name: sourceProduct.name,
                sku: sourceProduct.sku,
                barcode: sourceProduct.barcode,
                description: sourceProduct.description,
                price: sourceProduct.price,
                cost_price: sourceProduct.cost_price,
                stock_quantity: item.quantity, // Set to dispatched transfer quantity
                category_id: sourceProduct.category_id,
                image_url: sourceProduct.image_url,
                vendor_name: sourceProduct.vendor_name,
                brand_name: sourceProduct.brand_name,
                color: sourceProduct.color,
                product_type: sourceProduct.product_type,
                store_id: profile.store_id
              });
            
            if (targetInsertError) throw targetInsertError;
          }
        }
      }

      // 3. Mark transfer record as confirmed
      const { error: updateError } = await supabase
        .from('stock_transfers')
        .update({ 
          status: 'confirmed', 
          confirmed_at: new Date().toISOString(),
          confirmed_by: profile.id
        })
        .eq('id', pendingTransfer.id);

      if (updateError) throw updateError;

      toast.success('Stock transfer received! Local and admin inventories updated successfully.');
      setOpen(false);
      setPendingTransfer(null);
    } catch (error: any) {
      console.error('Stock confirmation failed:', error);
      toast.error(error.message || 'Failed to process inventory update');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingTransfer) return;
    if (!confirm('Decline this dispatch? Stock will remain unchanged at source and target stores.')) return;

    try {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'cancelled' })
        .eq('id', pendingTransfer.id);

      if (error) throw error;
      
      toast.success('Transfer dispatch cancelled safely.');
      setOpen(false);
      setPendingTransfer(null);
    } catch (err) {
      toast.error('Failed to cancel stock transfer');
    }
  };

  if (!pendingTransfer) return null;

  const totalTransferValuation = pendingTransfer.total_amount || 
    (pendingTransfer.items as any[]).reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  const totalTransferQuantity = pendingTransfer.total_quantity || 
    (pendingTransfer.items as any[]).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
        
        {/* Apple style banner */}
        <div className="p-8 bg-[#0071e3] text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                New Order Received
              </span>
              <DialogTitle className="text-xl font-black tracking-tight mt-1.5">Incoming Dispatch Order</DialogTitle>
              <p className="text-white/80 text-[12px] font-medium">Items sent from admin branch: {pendingTransfer.stores?.name}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-[#0071e3] shrink-0" />
            <div className="space-y-1">
              <p className="text-[13px] font-bold text-blue-900 leading-none">Receipt Verification Required</p>
              <p className="text-[11px] font-medium text-blue-800 leading-relaxed mt-1">
                Please verify the products and quantities before confirming receipt. Confirming will automatically deduct admin stocks and add them directly into your branch inventory.
              </p>
            </div>
          </div>

          {/* Pricing & quantity summary header */}
          <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Dispatched items</span>
              <span className="text-lg font-black text-black">{totalTransferQuantity} pcs</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Invoice valuation</span>
              <span className="text-lg font-black text-[#0071e3]">${Number(totalTransferValuation).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dispatch List Details</p>
            {(pendingTransfer.items as any[]).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[13px] font-bold text-black truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-gray-400">{item.sku}</span>
                    {item.price > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-[11px] font-bold text-gray-400">${Number(item.price).toFixed(2)} each</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-[#0071e3]">{item.quantity}</span>
                  <span className="text-[11px] text-gray-400 uppercase font-black">pcs</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button 
              variant="ghost" 
              className="rounded-xl font-bold text-gray-400 h-12 hover:bg-rose-50 hover:text-rose-500" 
              onClick={handleDecline}
              disabled={loading}
            >
              Decline
            </Button>
            <Button 
              className="rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-12 shadow-lg shadow-blue-500/20"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Confirm Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
