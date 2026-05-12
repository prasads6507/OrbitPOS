'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

export function AdjustStockDialog({ product, open, onOpenChange, onProductUpdated }: { product: any, open: boolean, onOpenChange: (open: boolean) => void, onProductUpdated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity?.toString() || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({
          stock_quantity: parseInt(stockQuantity),
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Stock adjusted successfully');
      onOpenChange(false);
      if (onProductUpdated) onProductUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-[#0071e3] rounded-2xl flex items-center justify-center">
             <ArrowUpDown className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black text-black tracking-tight">Adjust Stock</DialogTitle>
            <p className="text-gray-400 font-medium text-[13px] mt-1">{product?.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="stock" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Stock Level</Label>
            <Input 
              id="stock" 
              type="number"
              className="h-16 text-3xl font-black text-center bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required 
            />
            <p className="text-center text-[13px] text-gray-400 font-medium mt-2">
              Current stock: <span className="font-bold text-black">{product?.stock_quantity}</span>
            </p>
          </div>
          
          <div className="pt-4 flex items-center gap-3">
            <Button variant="ghost" type="button" className="flex-1 rounded-xl font-bold text-gray-400 h-12" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white font-bold h-12 rounded-xl shadow-xl shadow-black/10" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
