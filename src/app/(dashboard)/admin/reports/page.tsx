'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Calendar,
  RefreshCw,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { downloadCSV } from '@/lib/export';

import { useAuthStore } from '@/store/useAuthStore';

export default function ReportsPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalLoss: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    if (profile?.store_id) {
      fetchReportData();
    }
  }, [profile]);

  const fetchReportData = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    try {
      // 1. Summary Stats
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, refunded_amount, created_at, payment_status')
        .eq('store_id', profile.store_id)
        .neq('payment_status', 'voided');
        
      setAllOrders(orders || []);

      const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
      const loss = orders?.reduce((sum, o) => sum + (o.refunded_amount || 0), 0) || 0;
      const count = orders?.length || 0;

      setSummary({
        totalRevenue: revenue,
        totalOrders: count,
        totalLoss: loss,
        avgOrderValue: count > 0 ? revenue / count : 0,
      });

      // 2. Sales by Day (Last 14 days)
      const dailyData = [];
      for (let i = 13; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStart = startOfDay(day).toISOString();
        const nextDay = startOfDay(subDays(day, -1)).toISOString();

        const { data: dayOrders } = await supabase
          .from('orders')
          .select('total_amount, refunded_amount')
          .eq('store_id', profile.store_id)
          .gte('created_at', dayStart)
          .lt('created_at', nextDay)
          .neq('payment_status', 'voided');

        dailyData.push({
          date: format(day, 'MMM dd'),
          revenue: dayOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0,
          loss: dayOrders?.reduce((sum, o) => sum + (o.refunded_amount || 0), 0) || 0,
        });
      }
      setSalesByDay(dailyData);

      // 3. Top Products
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, total_price, products(name)')
        .eq('store_id', profile.store_id);
      
      const productMap: Record<string, any> = {};
      items?.forEach((item: any) => {
        const name = item.products?.name || 'Unknown';
        if (!productMap[name]) {
          productMap[name] = { name, value: 0 };
        }
        productMap[name].value += item.quantity;
      });

      const top = Object.values(productMap)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setTopProducts(top);

    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportData = (period: 'daily' | 'monthly' | 'yearly') => {
    if (!allOrders.length) return;

    const grouped: Record<string, number> = {};

    allOrders.forEach(order => {
      const date = new Date(order.created_at);
      let key = '';
      if (period === 'daily') {
        key = format(date, 'yyyy-MM-dd');
      } else if (period === 'monthly') {
        key = format(date, 'yyyy-MM');
      } else if (period === 'yearly') {
        key = format(date, 'yyyy');
      }
      
      grouped[key] = (grouped[key] || 0) + (order.total_amount || 0) - (order.refunded_amount || 0);
    });

    const data = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(key => ({
      Period: key,
      Revenue: `$${grouped[key].toFixed(2)}`
    }));

    downloadCSV(data, `${period}_sales_report.csv`);
  };

  const COLORS = ['#0071e3', '#4094f7', '#80b8fb', '#bfdbfe', '#e1efff'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Sales Reports</h1>
          <p className="text-[#86868b] font-medium mt-1">Comprehensive analysis of your store performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchReportData} variant="outline" className="rounded-2xl h-11 font-bold">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger 
              render={
                <Button className="bg-black text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/5 h-11">
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2">Download Report</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-50" />
                <DropdownMenuItem className="rounded-xl font-bold cursor-pointer focus:bg-blue-50 focus:text-[#0071e3]" onClick={() => exportData('daily')}>
                  Daily (By Date)
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl font-bold cursor-pointer focus:bg-blue-50 focus:text-[#0071e3]" onClick={() => exportData('monthly')}>
                  Monthly
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl font-bold cursor-pointer focus:bg-blue-50 focus:text-[#0071e3]" onClick={() => exportData('yearly')}>
                  Yearly
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ReportCard title="Net Revenue" value={`$${summary.totalRevenue.toLocaleString()}`} icon={DollarSign} color="blue" />
        <ReportCard title="Total Loss" value={`$${summary.totalLoss.toLocaleString()}`} icon={TrendingUp} color="rose" />
        <ReportCard title="Orders" value={summary.totalOrders.toString()} icon={ShoppingBag} color="indigo" />
        <ReportCard title="Avg Order" value={`$${summary.avgOrderValue.toFixed(2)}`} icon={DollarSign} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-black mb-8">Revenue Growth (14 Days)</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#86868b', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#86868b', fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)'}}
                  cursor={{fill: '#f5f5f7', radius: 8}}
                />
                <Bar dataKey="revenue" fill="#0071e3" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-black mb-8">Top Selling Products</h3>
          <div className="h-[350px] w-full flex flex-col items-center justify-center">
            {topProducts.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}} />
                      <span className="text-[12px] font-bold text-gray-600 truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-300">
                <PieChartIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="font-bold">No sales data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, icon: Icon, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
      <div className={`w-12 h-12 rounded-2xl ${colorClasses[color]} flex items-center justify-center mb-6`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <h2 className="text-4xl font-black text-black tracking-tighter">{value}</h2>
    </div>
  );
}
