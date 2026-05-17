'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Send, 
  ArrowRight, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2,
  Package,
  Store,
  Printer,
  CheckCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function StockTransferPage() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [targetStoreId, setTargetStoreId] = useState<string>('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Invoice / Receipt printing modal state
  const [printOpen, setPrintOpen] = useState(false);
  const [printedTransfer, setPrintedTransfer] = useState<any | null>(null);

  useEffect(() => {
    if (profile?.store_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', profile?.store_id);
    
    const { data: sData } = await supabase
      .from('stores')
      .select('*')
      .neq('id', profile?.store_id);

    if (pData) setProducts(pData);
    if (sData) setStores(sData);
    setLoading(false);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        toast.error('Cannot transfer more than available stock quantity');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    const product = products.find(p => p.id === id);
    if (qty > product.stock_quantity) {
      toast.error('Cannot transfer more than available stock quantity');
      return;
    }
    if (qty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, quantity: qty } : item));
    }
  };

  // Grand Totals calculations
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

  const handleTransfer = async () => {
    if (!targetStoreId || cart.length === 0 || !profile?.store_id) {
      toast.error('Please select target store and items');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create transfer record with complete amounts and items pricing
      // Note: We DO NOT decrease source inventory here as it will be decreased
      // AT THE MOMENT of employee confirmation at the destination store!
      const itemsList = cart.map(item => ({
        product_id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price || 0,
        total: item.quantity * (item.price || 0)
      }));

      const { data: transfer, error: tError } = await supabase
        .from('stock_transfers')
        .insert({
          source_store_id: profile.store_id,
          target_store_id: targetStoreId,
          items: itemsList,
          status: 'pending',
          total_amount: totalAmount,
          total_quantity: totalQuantity
        })
        .select()
        .single();

      if (tError) throw tError;

      // Find target store name for receipt printout
      const destStore = stores.find(s => s.id === targetStoreId);
      const sourceStoreName = profile.stores?.name || 'Admin HQ';

      const transferDetailsForPrint = {
        id: transfer.id,
        sourceStore: sourceStoreName,
        targetStore: destStore?.name || 'Destination Store',
        items: itemsList,
        totalQuantity,
        totalAmount,
        date: new Date().toLocaleDateString()
      };

      toast.success('Stock transfer initiated! Open printed invoice for reference.');
      setPrintedTransfer(transferDetailsForPrint);
      setPrintOpen(true); // Open the printable invoice dialog instantly!
      
      // Clear cart
      setCart([]);
      setTargetStoreId('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700">
      
      {/* Left Column: Admin Inventory Products List */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black" style={{ fontFamily: 'var(--font-outfit)' }}>
            Admin Stock Dispatch
          </h1>
          <p className="text-[#86868b] font-medium mt-1">
            Dispatch products from the admin store catalog to retail branches.
          </p>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder="Search catalog products to dispatch..." 
            className="pl-12 h-14 bg-white border-gray-100 rounded-2xl shadow-sm font-medium focus-visible:ring-1" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50">
                <TableHead className="pl-6">Product details</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Current stock</TableHead>
                <TableHead className="pr-6 text-right">Dispatch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0071e3]" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                    No matching inventory products found.
                  </TableCell>
                </TableRow>
              ) : filteredProducts.map((p) => (
                <TableRow key={p.id} className="border-gray-50 group hover:bg-gray-50/50">
                  <TableCell className="pl-6">
                    <div>
                      <p className="font-bold text-black">{p.name}</p>
                      <p className="text-[11px] font-mono text-gray-400">{p.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-black">${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell className="font-extrabold text-gray-500">{p.stock_quantity}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl hover:bg-blue-50 hover:text-[#0071e3]"
                      onClick={() => addToCart(p)}
                      disabled={p.stock_quantity <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to transfer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right Column: Dispatch Cart & Destination Select */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 flex flex-col h-fit sticky top-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-black">Dispatch Cart</h2>
            <p className="text-xs text-gray-400 font-medium">Verify quantities and total value before sending.</p>
          </div>
          <div className="bg-blue-50 text-[#0071e3] px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            {cart.length} Items Selected
          </div>
        </div>

        <div className="space-y-6 mb-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination Branch Store</Label>
            <Select value={targetStoreId} onValueChange={(val) => setTargetStoreId(val || '')}>
              <SelectTrigger className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl font-bold">
                <SelectValue placeholder="Select target store location" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id} className="font-bold rounded-xl">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Items Scroll Area */}
        <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-300">
              <Package className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-bold">Dispatch cart is empty</p>
              <p className="text-xs">Add products from the admin stock list.</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-[#fbfbfd] p-4 rounded-2xl border border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[13px] font-bold text-black truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-gray-400 font-semibold">Stock: {item.stock_quantity}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[11px] text-gray-400 font-bold">${Number(item.price).toFixed(2)} each</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
                  <button className="p-1 hover:bg-gray-50 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Minus className="h-3 w-3 text-gray-500" />
                  </button>
                  <span className="px-3 text-sm font-black min-w-8 text-center">{item.quantity}</span>
                  <button className="p-1 hover:bg-gray-50 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Plus className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
                
                {/* Total amount per item */}
                <div className="text-right min-w-[70px] pr-2">
                  <span className="text-xs font-black text-black">
                    ${(item.quantity * (item.price || 0)).toFixed(2)}
                  </span>
                </div>

                <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 rounded-xl h-8 w-8" onClick={() => updateQuantity(item.id, 0)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice pricing summary */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 pt-4 mb-6 space-y-2.5">
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>Total Units Dispatched</span>
              <span className="text-black font-extrabold">{totalQuantity} pcs</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-black border-t border-dashed border-gray-100 pt-2.5">
              <span>Total Invoice Valuation</span>
              <span className="text-xl font-black text-[#0071e3]">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button 
          className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold shadow-xl shadow-black/10 transition-all active:scale-95 disabled:opacity-50"
          disabled={cart.length === 0 || !targetStoreId || submitting}
          onClick={handleTransfer}
        >
          {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          Confirm & Print Dispatch Invoice
        </Button>
      </div>

      {/* STUNNING PRINTABLE INVOICE / RECEIPT MODAL */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
          
          {/* Printable Container */}
          <div id="transfer-invoice-print-container" className="p-8 space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="h-6 w-6 text-[#0071e3]" />
                  <span className="text-xl font-black text-black tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>OrbitPOS Dispatch Invoice</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Internal Stock Transfer Receipt</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-bold">Transfer Ref #</p>
                <p className="text-sm font-mono font-bold text-black">
                  {printedTransfer?.id ? printedTransfer.id.slice(0, 8).toUpperCase() : 'PENDING'}
                </p>
              </div>
            </div>

            {/* Source & Destination Details */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Source Store (Dispatch)</p>
                <p className="font-extrabold text-black text-sm">{printedTransfer?.sourceStore}</p>
                <p className="text-gray-400 mt-1">Date: {printedTransfer?.date}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Target Branch Store (Destination)</p>
                <p className="font-extrabold text-black text-sm">{printedTransfer?.targetStore}</p>
                <p className="text-gray-400 mt-1">Status: Pending receipt</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Dispatched Inventory Items</p>
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400">
                      <th className="p-3 pl-4">Item</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printedTransfer?.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-50 font-medium text-black">
                        <td className="p-3 pl-4">
                          <div>
                            <p className="font-bold">{item.name}</p>
                            <p className="text-[10px] font-mono text-gray-400">{item.sku}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-right text-gray-500">${Number(item.price).toFixed(2)}</td>
                        <td className="p-3 text-right font-bold pr-4">${Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-between items-center border-t border-gray-100 pt-6">
              <div className="text-xs">
                <span className="text-gray-400 font-bold">Total quantity: </span>
                <span className="font-black text-black">{printedTransfer?.totalQuantity} pcs</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Valuation Total</span>
                <span className="text-2xl font-black text-[#0071e3]">${printedTransfer?.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Signature Area */}
            <div className="pt-6 border-t border-dashed border-gray-200 grid grid-cols-2 gap-8 text-[10px] text-gray-400 font-bold">
              <div className="space-y-4">
                <div className="border-b border-gray-200 h-10" />
                <p className="text-center">DISPATCHED BY (ADMIN SIGNATURE)</p>
              </div>
              <div className="space-y-4">
                <div className="border-b border-gray-200 h-10" />
                <p className="text-center">RECEIVED BY (BRANCH EMPLOYEE SIGNATURE)</p>
              </div>
            </div>

          </div>

          {/* Action buttons (Hidden during printing) */}
          <div className="p-8 bg-[#fbfbfd] border-t border-gray-50 flex gap-3">
            <Button variant="ghost" className="flex-1 rounded-xl font-bold text-gray-400" onClick={() => setPrintOpen(false)}>
              Close Invoice
            </Button>
            <Button 
              className="flex-1 bg-black hover:bg-gray-800 text-white font-bold h-12 rounded-xl shadow-lg flex items-center justify-center gap-2"
              onClick={() => {
                const printContents = document.getElementById('transfer-invoice-print-container')?.innerHTML;
                const originalContents = document.body.innerHTML;
                if (printContents) {
                  // Custom printing window for perfect receipt layout
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>OrbitPOS Dispatch Invoice</title>
                          <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #000; }
                            .text-right { text-align: right; }
                            .text-center { text-align: center; }
                            .font-bold { font-weight: bold; }
                            .font-mono { font-family: monospace; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            .items-start { align-items: flex-start; }
                            .items-center { align-items: center; }
                            .grid { display: grid; }
                            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                            .gap-4 { gap: 16px; }
                            .gap-8 { gap: 32px; }
                            .p-5 { padding: 20px; }
                            .bg-gray-50 { bg-color: #f9f9fb; background: #f9f9fb; }
                            .rounded-2xl { border-radius: 12px; }
                            .border { border: 1px solid #eee; }
                            .border-b { border-bottom: 1px solid #eee; }
                            .border-t { border-top: 1px solid #eee; }
                            .pb-6 { padding-bottom: 24px; }
                            .pb-3 { padding-bottom: 12px; }
                            .pt-6 { padding-top: 24px; }
                            .space-y-6 > * + * { margin-top: 24px; }
                            .space-y-2 > * + * { margin-top: 8px; }
                            .space-y-4 > * + * { margin-top: 16px; }
                            .mt-1 { margin-top: 4px; }
                            .mt-0.5 { margin-top: 2px; }
                            .mb-1 { margin-bottom: 4px; }
                            .ml-1 { margin-left: 4px; }
                            .w-full { width: 100%; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
                            th { background: #f9f9fb; font-weight: bold; color: #888; }
                            .text-2xl { font-size: 24px; }
                            .text-sm { font-size: 14px; }
                            .text-xs { font-size: 12px; }
                            .text-xl { font-size: 20px; }
                            .text-lg { font-size: 18px; }
                            .text-[10px] { font-size: 10px; }
                            .text-[11px] { font-size: 11px; }
                            .text-gray-400 { color: #888; }
                            .text-gray-500 { color: #666; }
                            .text-[#0071e3] { color: #0071e3; }
                            .border-dashed { border-style: dashed; }
                            .h-10 { height: 40px; }
                            @media print {
                              body { padding: 0; }
                              button { display: none; }
                            }
                          </style>
                        </head>
                        <body>
                          ${printContents}
                          <script>
                            window.onload = function() {
                              window.print();
                              window.close();
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }
              }}
            >
              <Printer className="h-5 w-5 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
