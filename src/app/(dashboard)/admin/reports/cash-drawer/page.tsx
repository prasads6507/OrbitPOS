'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Banknote, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CashDrawerPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const storeToUse = activeStoreId || profile?.store_id;
  
  const [declaredCash, setDeclaredCash] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [cardTotal, setCardTotal] = useState(0);
  const [upiTotal, setUpiTotal] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (storeToUse) fetchTodayTotals();
  }, [storeToUse]);

  const fetchTodayTotals = async () => {
    if (!storeToUse) return;
    setLoading(true);
    
    const startDate = startOfDay(new Date()).toISOString();
    const endDate = endOfDay(new Date()).toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, refunded_amount, payment_method, payment_status, is_split_payment, split_cash_amount, split_card_amount, split_upi_amount')
      .eq('store_id', storeToUse)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .eq('payment_status', 'completed');

    if (orders) {
      let expectedCashAmount = 0;
      let expectedCardAmount = 0;
      let expectedUpiAmount = 0;

      orders.forEach(order => {
        if (order.is_split_payment) {
          expectedCashAmount += (order.split_cash_amount || 0);
          expectedCardAmount += (order.split_card_amount || 0);
          expectedUpiAmount += (order.split_upi_amount || 0);
        } else {
          const net = order.total_amount - (order.refunded_amount || 0);
          if (order.payment_method === 'cash') {
            expectedCashAmount += net;
          } else if (order.payment_method === 'card') {
            expectedCardAmount += net;
          } else if (order.payment_method === 'upi') {
            expectedUpiAmount += net;
          }
        }
      });
      
      setExpectedCash(expectedCashAmount);
      setCardTotal(expectedCardAmount);
      setUpiTotal(expectedUpiAmount);
      setOrderCount(orders.length);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const declared = parseFloat(declaredCash);
    const difference = declared - expectedCash;
    
    const { error } = await supabase.from('cash_drawer_logs').insert({
      store_id: storeToUse,
      cashier_id: profile?.id,
      date: today,
      expected_cash: expectedCash,
      declared_cash: declared,
      difference,
      card_total: cardTotal,
      upi_total: upiTotal,
      order_count: orderCount,
    });

    if (error) {
      toast.error('Failed to save cash drawer report');
      return;
    }

    toast.success('Cash drawer closed successfully');
    setSubmitted(true);
  };

  const difference = parseFloat(declaredCash || '0') - expectedCash;
  const isShort = difference < 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/reports" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-black mb-4 gap-1.5 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-black">End of Day — Cash Drawer</h1>
          <p className="text-[#86868b] font-medium mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {submitted ? (
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-black text-black">Day Closed</h2>
          <p className="text-gray-400 font-medium">Cash drawer report saved successfully.</p>
          <div className="pt-4">
            <Link href="/admin/reports">
              <Button className="rounded-xl font-bold bg-black text-white hover:bg-gray-800">Return to Reports</Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Expected Cash</p>
              <p className="text-2xl font-black text-black">₹{expectedCash.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Card + UPI</p>
              <p className="text-2xl font-black text-black">₹{(cardTotal + upiTotal).toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Orders</p>
              <p className="text-2xl font-black text-black">{orderCount}</p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-black">Declare Cash in Drawer</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Actual Cash Counted (₹)</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[16px] font-black text-gray-400">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-16 pl-10 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-black text-2xl"
                    value={declaredCash}
                    onChange={e => setDeclaredCash(e.target.value)}
                    required
                  />
                </div>
              </div>

              {declaredCash && (
                <div className={`p-5 rounded-2xl flex items-center gap-4 ${Math.abs(difference) < 0.01 ? 'bg-emerald-50 border border-emerald-100' : isShort ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                  {Math.abs(difference) < 0.01 ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <p className="font-black text-black text-[14px]">
                      {Math.abs(difference) < 0.01 ? 'Balanced' : isShort ? `Short by ₹${Math.abs(difference).toFixed(2)}` : `Over by ₹${difference.toFixed(2)}`}
                    </p>
                    <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                      Expected: ₹{expectedCash.toFixed(2)} · Declared: ₹{parseFloat(declaredCash || '0').toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-14 bg-black hover:bg-gray-800 text-white font-black rounded-2xl text-[14px] shadow-lg shadow-black/10 transition-transform active:scale-[0.98]">
                <Banknote className="mr-2 h-5 w-5" />
                Close Day & Save Report
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
