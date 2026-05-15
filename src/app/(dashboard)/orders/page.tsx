'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, 
  Search, 
  ArrowRight,
  Download,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  ShieldAlert,
  Undo2,
  RotateCcw,
  MessageSquare,
  Printer,
  Calendar,
  Clock,
  ChevronRight
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format, parseISO, isToday } from 'date-fns';
import { downloadCSV } from '@/lib/export';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '@/store/useAuthStore';
import { voidOrder, refundOrder } from '@/app/actions/orders';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function OrdersPage() {
  const { profile } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  useEffect(() => {
    if (profile?.store_id) {
      fetchOrders();
    }
  }, [profile]);

  const fetchOrders = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          tax_amount,
          discount_amount,
          payment_status,
          payment_method,
          created_at,
          refunded_amount,
          refund_reason,
          cashier:profiles!cashier_id ( full_name ),
          order_items (
            id,
            quantity,
            refunded_quantity,
            total_price,
            unit_price,
            products ( name, price, sku )
          )
        `)
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.cashier?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by Day
  const groupedOrders = filteredOrders.reduce((acc: any, order) => {
    const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  const exportOrders = () => {
    const data = filteredOrders.map(o => ({
      'Order ID': o.id,
      'Date': format(parseISO(o.created_at), 'yyyy-MM-dd HH:mm'),
      'Cashier': o.cashier?.full_name || 'System',
      'Payment Method': o.payment_method,
      'Status': o.payment_status,
      'Total Amount': o.total_amount.toFixed(2)
    }));
    downloadCSV(data, 'orders_export.csv');
  };

  const handleReprint = (order: any) => {
    // Simplified reprint logic for demonstration
    toast.info("Preparing print data for order #" + order.id.slice(0, 8));
  };

  const handleVoidOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to VOID this transaction?')) return;
    setActionLoading(true);
    const res = await voidOrder(orderId);
    if (res.success) {
      toast.success('Transaction voided');
      fetchOrders();
    } else {
      toast.error(res.error);
    }
    setActionLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black flex items-center gap-3">
             <div className="p-2 bg-black rounded-xl text-white">
                <ShoppingBag className="h-6 w-6" />
             </div>
             Order History
          </h1>
          <p className="text-gray-400 font-bold mt-2 ml-1">Review your sales history grouped by day.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
            <Input 
              placeholder="Search Order ID..." 
              className="pl-12 h-12 w-64 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-gray-100 font-bold" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={fetchOrders} variant="outline" className="rounded-2xl h-12 px-6 border-gray-100 shadow-sm font-bold hover:bg-gray-50">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportOrders} className="rounded-2xl h-12 px-8 bg-black hover:bg-gray-800 text-white font-bold shadow-xl shadow-black/10">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Day Wise History */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-40 text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-gray-200" />
            <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-sm">Loading Transactions...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-40 text-center">
            <ClipboardList className="h-20 w-20 mx-auto mb-6 text-gray-100" />
            <h3 className="text-xl font-black text-black">No Orders Found</h3>
            <p className="text-gray-400 font-medium">Try adjusting your search or complete a sale in POS.</p>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const dateOrders = groupedOrders[dateKey];
            const displayDate = parseISO(dateKey);
            const isTodayDate = isToday(displayDate);

            return (
              <div key={dateKey} className="space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <div className={cn(
                    "px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest",
                    isTodayDate ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-gray-100 text-gray-500"
                  )}>
                    {isTodayDate ? 'Today' : format(displayDate, 'EEEE')}
                  </div>
                  <h2 className="text-xl font-black text-black">
                    {format(displayDate, 'MMMM dd, yyyy')}
                  </h2>
                  <div className="h-px bg-gray-100 flex-1" />
                  <div className="text-gray-400 font-bold text-sm">
                    {dateOrders.length} {dateOrders.length === 1 ? 'Order' : 'Orders'}
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                        <TableHead className="font-black text-black pl-8 py-5 text-[11px] uppercase tracking-widest">Order Details</TableHead>
                        <TableHead className="font-black text-black text-[11px] uppercase tracking-widest">Method</TableHead>
                        <TableHead className="font-black text-black text-[11px] uppercase tracking-widest">Cashier</TableHead>
                        <TableHead className="font-black text-black text-right text-[11px] uppercase tracking-widest">Amount</TableHead>
                        <TableHead className="font-black text-black text-right pr-8 text-[11px] uppercase tracking-widest">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateOrders.map((order: any) => (
                        <TableRow key={order.id} className="group border-gray-50 hover:bg-gray-50/30 transition-colors">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                                <ShoppingBag className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-black text-black leading-none">#{order.id.slice(0, 8).toUpperCase()}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                   <Clock className="h-3 w-3 text-gray-400" />
                                   <span className="text-[11px] text-gray-400 font-bold">{format(parseISO(order.created_at), 'hh:mm a')}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               {order.payment_method === 'card' ? <CreditCard className="h-3.5 w-3.5 text-indigo-500" /> : <Banknote className="h-3.5 w-3.5 text-emerald-500" />}
                               <span className="font-bold text-[13px] capitalize">{order.payment_method}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                             <span className="font-bold text-gray-500 text-[13px]">{order.cashier?.full_name || 'System'}</span>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex flex-col items-end">
                                <span className="font-black text-black text-lg">${order.total_amount.toFixed(2)}</span>
                                {order.payment_status === 'voided' ? (
                                   <Badge className="bg-gray-100 text-gray-400 border-none font-black text-[9px] h-4">VOIDED</Badge>
                                ) : (
                                   <Badge className={cn(
                                     "border-none font-black text-[9px] h-4",
                                     order.payment_status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                   )}>
                                      {order.payment_status.toUpperCase()}
                                   </Badge>
                                )}
                             </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-10 px-4 rounded-xl font-black text-[12px] text-blue-600 hover:bg-blue-50"
                               onClick={() => setSelectedOrder(order)}
                             >
                               Details
                               <ChevronRight className="ml-1 h-4 w-4" />
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order Detail Dialog - Reused from original but styled better */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 text-center">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-black">Order Summary</DialogTitle>
            <p className="text-gray-400 font-bold text-[13px] mt-1">#{selectedOrder?.id.toUpperCase()}</p>
          </div>

          <div className="p-8 space-y-6">
             <div className="space-y-4">
                {selectedOrder?.order_items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-black">{item.products?.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{item.quantity} x ${item.unit_price?.toFixed(2)}</p>
                    </div>
                    <span className="font-black text-black">${item.total_price.toFixed(2)}</span>
                  </div>
                ))}
             </div>

             <div className="pt-6 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-gray-400 font-bold">Subtotal</span>
                   <span className="font-black">${(selectedOrder?.total_amount - (selectedOrder?.tax_amount || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-gray-400 font-bold">Tax</span>
                   <span className="font-black">${selectedOrder?.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                   <span className="text-lg font-black">Total Paid</span>
                   <span className="text-3xl font-black text-blue-600">${selectedOrder?.total_amount.toFixed(2)}</span>
                </div>
             </div>
          </div>

          <DialogFooter className="p-8 pt-0">
             <div className="grid grid-cols-2 gap-3 w-full">
                <Button variant="outline" className="h-14 rounded-2xl font-black" onClick={() => setSelectedOrder(null)}>Close</Button>
                <Button className="h-14 rounded-2xl bg-black text-white font-black" onClick={() => handleReprint(selectedOrder)}>
                   <Printer className="mr-2 h-5 w-5" />
                   Print
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
