'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { downloadCSV } from '@/lib/export';
import Link from 'next/link';

export default function GSTReportPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const storeToUse = activeStoreId || profile?.store_id;
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [gstData, setGstData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalTaxable: 0,
    totalCGST: 0,
    totalSGST: 0,
    totalTax: 0,
    totalInvoiceValue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [taxSettings, setTaxSettings] = useState({ tax1_name: 'CGST', tax1_rate: 4, tax2_name: 'SGST', tax2_rate: 4 });

  useEffect(() => {
    if (storeToUse) {
      fetchTaxSettings();
      fetchGSTData();
    }
  }, [storeToUse, selectedMonth]);

  const fetchTaxSettings = async () => {
    const { data } = await supabase.from('stores')
      .select('tax1_name, tax1_rate, tax2_name, tax2_rate')
      .eq('id', storeToUse!)
      .single();
    if (data) setTaxSettings({
      tax1_name: data.tax1_name ?? 'CGST',
      tax1_rate: data.tax1_rate !== null ? parseFloat(data.tax1_rate) : 4.00,
      tax2_name: data.tax2_name ?? 'SGST',
      tax2_rate: data.tax2_rate !== null ? parseFloat(data.tax2_rate) : 4.00
    });
  };

  const fetchGSTData = async () => {
    if (!storeToUse) return;
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const start = startOfMonth(targetDate).toISOString();
    const end = endOfMonth(targetDate).toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, created_at, total_amount, tax_amount, discount_amount, refunded_amount,
        payment_method, payment_status,
        customers(full_name, phone)
      `)
      .eq('store_id', storeToUse)
      .gte('created_at', start)
      .lt('created_at', end)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    const rows = (orders || []).map(order => {
      const taxable = (order.total_amount || 0) - (order.tax_amount || 0);
      const halfTax = (order.tax_amount || 0) / 2;
      return {
        invoice: order.id.slice(0, 8).toUpperCase(),
        date: format(new Date(order.created_at), 'dd/MM/yyyy'),
        customer: (order.customers as any)?.full_name || 'Walk-in',
        taxable: taxable,
        cgst: halfTax,
        sgst: halfTax,
        totalTax: order.tax_amount || 0,
        total: order.total_amount || 0,
      };
    });

    setGstData(rows);
    setSummary({
      totalTaxable: rows.reduce((s, r) => s + r.taxable, 0),
      totalCGST: rows.reduce((s, r) => s + r.cgst, 0),
      totalSGST: rows.reduce((s, r) => s + r.sgst, 0),
      totalTax: rows.reduce((s, r) => s + r.totalTax, 0),
      totalInvoiceValue: rows.reduce((s, r) => s + r.total, 0),
    });
    setLoading(false);
  };

  const exportGST = () => {
    const data = gstData.map(r => ({
      'Invoice No': r.invoice,
      'Date': r.date,
      'Customer': r.customer,
      'Taxable Amount (₹)': r.taxable.toFixed(2),
      [`${taxSettings.tax1_name} (₹)`]: r.cgst.toFixed(2),
      [`${taxSettings.tax2_name} (₹)`]: r.sgst.toFixed(2),
      'Total Tax (₹)': r.totalTax.toFixed(2),
      'Invoice Value (₹)': r.total.toFixed(2),
    }));
    downloadCSV(data, `GST_Report_${selectedMonth}.csv`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/reports" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-black mb-4 gap-1.5 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-black">GST Tax Report</h1>
          <p className="text-[#86868b] font-medium mt-1">{taxSettings.tax1_name}/{taxSettings.tax2_name} monthly filing summary</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[13px] font-semibold outline-none" />
          <Button onClick={exportGST} className="bg-black text-white px-6 rounded-2xl font-bold h-11 transition-transform active:scale-95 shadow-lg">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Taxable Value', value: `₹${summary.totalTaxable.toFixed(2)}` },
          { label: taxSettings.tax1_name, value: `₹${summary.totalCGST.toFixed(2)}` },
          { label: taxSettings.tax2_name, value: `₹${summary.totalSGST.toFixed(2)}` },
          { label: 'Total Tax', value: `₹${summary.totalTax.toFixed(2)}` },
          { label: 'Invoice Total', value: `₹${summary.totalInvoiceValue.toFixed(2)}` },
        ].map(card => (
          <div key={card.label} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{card.label}</p>
            <p className="text-2xl font-black text-black">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f5f5f7]">
              <tr>
                {['Invoice', 'Date', 'Customer', 'Taxable', taxSettings.tax1_name, taxSettings.tax2_name, 'Total Tax', 'Invoice Value'].map(h => (
                  <th key={h} className="px-5 py-4 text-left font-bold text-gray-400 text-[11px] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gstData.map((row, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-[#fbfbfd]">
                  <td className="px-5 py-4 font-bold text-black">#{row.invoice}</td>
                  <td className="px-5 py-4 text-gray-500">{row.date}</td>
                  <td className="px-5 py-4 font-bold text-black">{row.customer}</td>
                  <td className="px-5 py-4 text-black">₹{row.taxable.toFixed(2)}</td>
                  <td className="px-5 py-4 text-[#0071e3] font-bold">₹{row.cgst.toFixed(2)}</td>
                  <td className="px-5 py-4 text-[#0071e3] font-bold">₹{row.sgst.toFixed(2)}</td>
                  <td className="px-5 py-4 font-bold">₹{row.totalTax.toFixed(2)}</td>
                  <td className="px-5 py-4 font-black text-black">₹{row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {gstData.length === 0 && !loading && (
          <div className="py-16 text-center text-gray-400 font-bold">No completed orders for this month.</div>
        )}
      </div>
    </div>
  );
}
