'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Package, Truck, Eye, Trash2, CheckCircle2, ChevronRight, Loader2, ClipboardList, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function PurchaseOrdersPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const storeToUse = activeStoreId || profile?.store_id;
  
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPODialogOpen, setNewPODialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [poDetails, setPoDetails] = useState<any[]>([]);
  
  // New PO form state
  const [selectedVendor, setSelectedVendor] = useState('');
  const [poItems, setPoItems] = useState<any[]>([]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');

  // Receive items form state
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [submittingPO, setSubmittingPO] = useState(false);

  useEffect(() => {
    if (storeToUse) {
      fetchPurchaseOrders();
      fetchVendors();
      fetchProducts();
    }
  }, [storeToUse]);

  const fetchPurchaseOrders = async () => {
    if (!storeToUse) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, vendors(name), created_by_profile:profiles(full_name)')
      .eq('store_id', storeToUse)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to load purchase orders');
    } else {
      setPurchaseOrders(data || []);
    }
    setLoading(false);
  };

  const fetchVendors = async () => {
    if (!storeToUse) return;
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('store_id', storeToUse)
      .eq('is_active', true);
    setVendors(data || []);
  };

  const fetchProducts = async () => {
    if (!storeToUse) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, price, cost_price')
      .eq('store_id', storeToUse)
      .eq('is_active', true);
    setProducts(data || []);
  };

  const handleOpenView = async (po: any) => {
    setSelectedPO(po);
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, sku)')
      .eq('po_id', po.id);
    if (error) {
      toast.error('Failed to load order items');
    } else {
      setPoDetails(data || []);
      setViewDialogOpen(true);
    }
  };

  const handleOpenReceive = async (po: any) => {
    setSelectedPO(po);
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, sku)')
      .eq('po_id', po.id);
    if (error) {
      toast.error('Failed to load order items');
    } else {
      setPoDetails(data || []);
      // Pre-populate with outstanding quantities
      const prepop: Record<string, number> = {};
      data?.forEach(item => {
        const outstanding = item.ordered_quantity - (item.received_quantity || 0);
        prepop[item.id] = Math.max(0, outstanding);
      });
      setReceivedQuantities(prepop);
      setReceiveDialogOpen(true);
    }
  };

  const addPOItem = () => {
    setPoItems([...poItems, { product_id: '', ordered_quantity: 1, unit_cost: 0, product_name: '', sku: '' }]);
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    const updated = [...poItems];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].product_id = product.id;
        updated[index].product_name = product.name;
        updated[index].sku = product.sku || '';
        updated[index].unit_cost = product.cost_price || product.price * 0.6; // fallback cost
      }
    } else {
      updated[index][field] = value;
    }
    setPoItems(updated);
  };

  const removePOItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const createPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || poItems.length === 0) {
      toast.error('Please select a vendor and add at least one product');
      return;
    }

    // Validate po items
    for (const item of poItems) {
      if (!item.product_id) {
        toast.error('Please select a product for all rows');
        return;
      }
      if (item.ordered_quantity <= 0) {
        toast.error('Quantities must be greater than zero');
        return;
      }
      if (item.unit_cost < 0) {
        toast.error('Costs must be zero or positive');
        return;
      }
    }

    setSubmittingPO(true);
    try {
      const totalAmount = poItems.reduce((sum, item) => sum + (item.ordered_quantity * item.unit_cost), 0);
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          store_id: storeToUse,
          vendor_id: selectedVendor,
          po_number: poNumber,
          expected_delivery: expectedDelivery || null,
          notes,
          total_amount: totalAmount,
          created_by: profile?.id,
          status: 'draft',
        })
        .select()
        .single();

      if (poError) throw poError;

      const poItemsWithIds = poItems.map(item => ({
        po_id: po.id,
        product_id: item.product_id,
        ordered_quantity: parseInt(item.ordered_quantity.toString()),
        received_quantity: 0,
        unit_cost: parseFloat(item.unit_cost.toString()),
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItemsWithIds);
      
      if (itemsError) throw itemsError;

      toast.success('Purchase order drafted successfully!');
      setNewPODialogOpen(false);
      resetPOForm();
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create purchase order');
    } finally {
      setSubmittingPO(false);
    }
  };

  const resetPOForm = () => {
    setSelectedVendor('');
    setPoItems([]);
    setExpectedDelivery('');
    setNotes('');
  };

  const handleReceiveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || poDetails.length === 0) return;

    setSubmittingReceive(true);
    try {
      // 1. Process stock increments and PO item updates
      for (const item of poDetails) {
        const qtyReceivedInThisTurn = parseInt(receivedQuantities[item.id]?.toString() || '0');
        if (qtyReceivedInThisTurn > 0) {
          // Increment stock using Postgres RPC
          const { error: rpcError } = await supabase.rpc('increment_stock', {
            p_product_id: item.product_id,
            p_qty: qtyReceivedInThisTurn,
            p_store_id: storeToUse,
            p_reason: `PO ${selectedPO.po_number} received`
          });

          // Log manually if RPC fallback needed
          if (rpcError) {
            console.warn('increment_stock RPC failed, falling back to manual update:', rpcError);
            const { data: prod } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();

            await supabase
              .from('products')
              .update({ stock_quantity: (prod?.stock_quantity || 0) + qtyReceivedInThisTurn })
              .eq('id', item.product_id);

            await supabase.from('inventory_logs').insert({
              product_id: item.product_id,
              store_id: storeToUse,
              change_amount: qtyReceivedInThisTurn,
              reason: `PO ${selectedPO.po_number} received`
            });
          }

          // Update items received_quantity
          const newReceivedQty = (item.received_quantity || 0) + qtyReceivedInThisTurn;
          await supabase
            .from('purchase_order_items')
            .update({ received_quantity: newReceivedQty })
            .eq('id', item.id);
        }
      }

      // 2. Determine and update overall PO status
      const { data: updatedItems } = await supabase
        .from('purchase_order_items')
        .select('ordered_quantity, received_quantity')
        .eq('po_id', selectedPO.id);

      const allReceived = (updatedItems || []).every(item => item.received_quantity >= item.ordered_quantity);
      const partialReceived = (updatedItems || []).some(item => item.received_quantity > 0);

      const newStatus = allReceived ? 'received' : (partialReceived ? 'partial' : 'draft');
      
      await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', selectedPO.id);

      toast.success('Order items received and inventory successfully restocked!');
      setReceiveDialogOpen(false);
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process received items');
    } finally {
      setSubmittingReceive(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-full font-bold px-3 py-1 text-[11px]">Fully Received</Badge>;
      case 'partial':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-full font-bold px-3 py-1 text-[11px]">Partially Received</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-full font-bold px-3 py-1 text-[11px]">Draft / Ordered</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Purchase Orders</h1>
          <p className="text-[#86868b] font-medium mt-1">Manage vendor restocks, draft orders, and receive inventory.</p>
        </div>
        <Button onClick={() => { resetPOForm(); setNewPODialogOpen(true); }} className="bg-black text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-black/10 transition-transform active:scale-[0.98]">
          <Plus className="mr-2 h-5 w-5" /> New Purchase Order
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
          <Loader2 className="h-10 w-10 text-[#0071e3] animate-spin mb-4" />
          <p className="text-gray-400 font-bold text-sm">Loading purchase orders...</p>
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <ClipboardList className="h-16 w-16 text-gray-200 mb-4" />
          <h3 className="text-xl font-bold text-black mb-1">No Purchase Orders</h3>
          <p className="text-gray-400 font-medium max-w-sm mb-6">Restock your inventory by creating purchase orders and tracking items from suppliers.</p>
          <Button onClick={() => { resetPOForm(); setNewPODialogOpen(true); }} className="bg-black text-white rounded-2xl">
            Draft Your First PO
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f5f5f7]">
                <tr>
                  {['PO Number', 'Vendor', 'Expected Date', 'Total Amount', 'Created By', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-5 text-left font-bold text-gray-400 text-[11px] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-t border-gray-50 hover:bg-[#fbfbfd]/50 transition-colors">
                    <td className="px-6 py-5 font-black text-black">#{po.po_number}</td>
                    <td className="px-6 py-5 font-bold text-black">{po.vendors?.name || 'Unknown'}</td>
                    <td className="px-6 py-5 text-gray-500 font-medium">
                      {po.expected_delivery ? format(new Date(po.expected_delivery), 'MMM dd, yyyy') : 'No date set'}
                    </td>
                    <td className="px-6 py-5 font-black text-black text-[14px]">₹{po.total_amount?.toLocaleString() || '0.00'}</td>
                    <td className="px-6 py-5 text-gray-400 font-bold text-[11px]">{po.created_by_profile?.full_name || 'Staff'}</td>
                    <td className="px-6 py-5">{getStatusBadge(po.status)}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Button onClick={() => handleOpenView(po)} variant="outline" size="sm" className="rounded-xl h-8 px-3 text-[11px] font-bold text-gray-500 hover:text-black">
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                        </Button>
                        {po.status !== 'received' && (
                          <Button onClick={() => handleOpenReceive(po)} className="bg-black hover:bg-gray-800 text-white rounded-xl h-8 px-3 text-[11px] font-bold">
                            <Truck className="h-3.5 w-3.5 mr-1.5" /> Receive Items
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW PURCHASE ORDER DIALOG */}
      <Dialog open={newPODialogOpen} onOpenChange={setNewPODialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 shrink-0">
            <DialogTitle className="text-2xl font-black text-black leading-none">Draft Purchase Order</DialogTitle>
            <p className="text-gray-400 font-bold text-[11px] uppercase tracking-wider mt-1.5">Procure inventory restocks from registered vendors</p>
          </div>
          
          <form onSubmit={createPurchaseOrder} className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Vendor</Label>
                <Select value={selectedVendor} onValueChange={(val) => setSelectedVendor(val || '')} required>
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold">
                    <SelectValue placeholder="Choose Supplier..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1 shadow-lg border-gray-50">
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id} className="rounded-lg font-bold">{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Expected Delivery (Optional)</Label>
                <div className="relative">
                  <Input
                    type="date"
                    className="h-12 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold text-[13px]"
                    value={expectedDelivery}
                    onChange={e => setExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Order Items</Label>
                <Button type="button" onClick={addPOItem} variant="outline" size="sm" className="rounded-xl font-bold h-8 text-[11px] text-[#0071e3] border-[#0071e3]/20 hover:bg-blue-50/50">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                </Button>
              </div>

              {poItems.length === 0 ? (
                <div className="border border-dashed border-gray-200 p-8 rounded-2xl text-center text-gray-400 font-bold text-[13px]">
                  Add items to your purchase order using the button above.
                </div>
              ) : (
                <div className="space-y-3">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-end bg-[#f5f5f7] p-3 rounded-2xl border border-gray-50">
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 ml-1">Product</p>
                        <Select value={item.product_id} onValueChange={(val) => updatePOItem(index, 'product_id', val)} required>
                          <SelectTrigger className="h-10 rounded-xl bg-white border-transparent font-bold text-[12px]">
                            <SelectValue placeholder="Choose product..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl p-1 shadow-lg max-h-[250px]">
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id} className="rounded-lg font-bold text-[12px]">{p.name} {p.sku ? `(${p.sku})` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 ml-1">Qty</p>
                        <Input
                          type="number"
                          min="1"
                          required
                          value={item.ordered_quantity}
                          onChange={(e) => updatePOItem(index, 'ordered_quantity', parseInt(e.target.value) || 0)}
                          className="h-10 rounded-xl bg-white border-transparent text-center font-bold text-[12px]"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 ml-1">Unit Cost (₹)</p>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.unit_cost}
                          onChange={(e) => updatePOItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="h-10 rounded-xl bg-white border-transparent text-center font-bold text-[12px]"
                        />
                      </div>
                      <div className="w-24 text-right pr-2 self-center">
                        <p className="text-[9px] font-bold text-gray-400">Total</p>
                        <p className="font-black text-black text-[12px] mt-0.5">₹{(item.ordered_quantity * item.unit_cost).toLocaleString()}</p>
                      </div>
                      <Button type="button" onClick={() => removePOItem(index)} variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-rose-500 rounded-xl">
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">PO Notes / Memo</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Include shipping instructions or purchase terms..."
                className="w-full min-h-[80px] p-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-medium text-[13px] outline-none"
              />
            </div>
            
            <Separator className="bg-gray-100" />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-wider">Estimated PO Total</p>
                <p className="text-3xl font-black text-black">
                  ₹{poItems.reduce((sum, item) => sum + (item.ordered_quantity * item.unit_cost), 0).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="rounded-xl px-5 h-12 font-bold" onClick={() => setNewPODialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submittingPO} className="bg-black text-white hover:bg-gray-800 rounded-xl px-6 h-12 font-bold shadow-lg shadow-black/5">
                  {submittingPO ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Draft PO
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden flex flex-col">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 flex items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-xl font-black text-black">PO #{selectedPO?.po_number}</DialogTitle>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-0.5">{selectedPO?.vendors?.name}</p>
            </div>
            {selectedPO && getStatusBadge(selectedPO.status)}
          </div>
          <div className="p-8 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Expected Delivery</p>
                <p className="font-bold text-black">
                  {selectedPO?.expected_delivery ? format(new Date(selectedPO.expected_delivery), 'MMMM dd, yyyy') : 'Not scheduled'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Created Date</p>
                <p className="font-bold text-black">
                  {selectedPO?.created_at && format(new Date(selectedPO.created_at), 'MMMM dd, yyyy · hh:mm a')}
                </p>
              </div>
            </div>

            <Separator className="bg-gray-100" />

            <div className="space-y-3">
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Items Ordered</p>
              <div className="space-y-2">
                {poDetails.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-black text-[13px]">{item.products?.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">SKU: {item.products?.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-black text-[13px]">₹{item.unit_cost.toLocaleString()} x {item.ordered_quantity}</p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Received: {item.received_quantity || 0} / {item.ordered_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPO?.notes && (
              <>
                <Separator className="bg-gray-100" />
                <div className="space-y-1">
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">PO Notes / Memo</p>
                  <p className="text-[13px] font-medium text-gray-600 italic bg-gray-50/50 p-4 rounded-xl border border-gray-100">{selectedPO.notes}</p>
                </div>
              </>
            )}
          </div>
          <div className="p-6 border-t border-gray-50 bg-[#fbfbfd] flex justify-end shrink-0 gap-3">
            <Button className="rounded-xl font-bold bg-black text-white hover:bg-gray-800" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* RECEIVE INVENTORY ITEMS DIALOG */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden flex flex-col">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 shrink-0">
            <DialogTitle className="text-xl font-black text-black">Receive Stock — PO #{selectedPO?.po_number}</DialogTitle>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-0.5">Confirm received units to increment products database inventory</p>
          </div>
          <form onSubmit={handleReceiveOrder} className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="space-y-4">
              {poDetails.map((item) => {
                const maxAllowed = item.ordered_quantity - (item.received_quantity || 0);
                return (
                  <div key={item.id} className="flex gap-4 items-center justify-between bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-black text-[13px] truncate">{item.products?.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        Ordered: {item.ordered_quantity} · Previously Received: {item.received_quantity || 0}
                      </p>
                    </div>
                    <div className="w-32 flex items-center gap-2 bg-white border border-gray-100 p-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-gray-400 pl-2 shrink-0">Recv:</span>
                      <Input
                        type="number"
                        min="0"
                        max={maxAllowed}
                        value={receivedQuantities[item.id] || 0}
                        onChange={(e) => setReceivedQuantities({
                          ...receivedQuantities,
                          [item.id]: Math.min(maxAllowed, parseInt(e.target.value) || 0)
                        })}
                        className="h-8 border-none bg-transparent font-black text-right text-black focus:ring-0 text-[13px] p-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="bg-gray-100" />
            
            <div className="flex items-center justify-between shrink-0">
              <p className="text-gray-400 font-bold text-[11px]">Ensure items match physical shipping manifests</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="rounded-xl px-5 h-12 font-bold" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submittingReceive} className="bg-black text-white hover:bg-gray-800 rounded-xl px-6 h-12 font-bold shadow-lg shadow-black/5">
                  {submittingReceive ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Log Stock
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
