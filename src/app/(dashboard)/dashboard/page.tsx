'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  CalendarDays,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { format, startOfDay, subDays } from 'date-fns';

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todaySales: 0,
    totalLoss: 0,
    totalProfiles: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (profile?.store_id) {
      fetchDashboardData(selectedDate);
    }
  }, [selectedDate, profile]);

  const fetchDashboardData = async (dateStr: string) => {
    if (!profile?.store_id) return;
    setLoading(true);
    try {
      // 1. Total revenue (Total - Refunds, excluding Voids)
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount, refunded_amount')
        .eq('store_id', profile.store_id)
        .neq('payment_status', 'voided');

      const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
      const totalLoss = revenueData?.reduce((sum, o) => sum + (o.refunded_amount || 0), 0) || 0;

      // 2. Selected day's sales count
      const targetDate = new Date(dateStr);
      const targetDayStart = startOfDay(new Date(targetDate.getTime() + targetDate.getTimezoneOffset() * 60000)).toISOString();
      const targetDayEnd = startOfDay(subDays(new Date(targetDate.getTime() + targetDate.getTimezoneOffset() * 60000), -1)).toISOString();

      const { count: todaySales } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', profile.store_id)
        .gte('created_at', targetDayStart)
        .lt('created_at', targetDayEnd);

      // 3. Total active products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', profile.store_id)
        .eq('is_active', true);

      // 4. Total staff (profiles)
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', profile.store_id);

      setStats({
        totalRevenue,
        todaySales: todaySales || 0,
        totalLoss,
        totalProfiles: totalProfiles || 0,
      });

      // 5. Last 7 days chart data
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = startOfDay(subDays(day, -1)).toISOString();

        const { data: dayOrders } = await supabase
          .from('orders')
          .select('total_amount, refunded_amount')
          .eq('store_id', profile.store_id)
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd)
          .neq('payment_status', 'voided');

        const dayRevenue = dayOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
        days.push({
          name: format(day, 'EEE'),
          revenue: parseFloat(dayRevenue.toFixed(2)),
        });
      }
      setChartData(days);

      // 6. Recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, refunded_amount, payment_method, payment_status, created_at')
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black" style={{fontFamily: 'var(--font-outfit)'}}>
            Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-[#86868b] font-medium mt-1">Here is what&apos;s happening with your store today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-[#0071e3] transition-colors focus-within:border-[#0071e3] focus-within:ring-2 focus-within:ring-[#0071e3]/20">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <input 
              type="date" 
              className="text-[13px] font-semibold text-gray-600 bg-transparent outline-none cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <button 
            onClick={() => fetchDashboardData(selectedDate)} 
            className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all text-gray-400 hover:text-black"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Revenue" 
          value={loading ? '...' : `$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="All time"
          icon={DollarSign}
          color="blue"
        />
        <StatsCard 
          title="Orders on Date" 
          value={loading ? '...' : stats.todaySales.toString()}
          subtitle={`Completed on ${format(new Date(selectedDate + 'T00:00:00'), 'MMM d')}`}
          icon={ShoppingBag}
          color="indigo"
        />
        <StatsCard 
          title="Refunded (Loss)" 
          value={loading ? '...' : `$${stats.totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Net returns"
          icon={ArrowDownRight}
          color="rose"
        />
        <StatsCard 
          title="Staff Members" 
          value={loading ? '...' : stats.totalProfiles.toString()}
          subtitle="Total accounts"
          icon={Users}
          color="emerald"
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-black" style={{fontFamily: 'var(--font-outfit)'}}>Revenue (Last 7 Days)</h3>
              <p className="text-[13px] text-gray-400 font-medium">Based on completed orders</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
              <span className="text-[11px] font-bold text-gray-500 uppercase">Revenue</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-300">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : chartData.every(d => d.revenue === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium text-gray-400">No orders yet</p>
                <p className="text-[13px]">Complete a sale in POS to see data here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#86868b', fontSize: 12, fontWeight: 500}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#86868b', fontSize: 12, fontWeight: 500}} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '12px'}}
                    formatter={(value: any) => [`$${value}`, 'Revenue']}
                    cursor={{stroke: '#0071e3', strokeWidth: 1}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0071e3" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-black mb-6" style={{fontFamily: 'var(--font-outfit)'}}>Recent Orders</h3>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-300">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-300 py-8">
              <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium text-gray-400">No orders yet</p>
              <p className="text-[13px] mt-1">Head to POS to complete your first sale.</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-black group-hover:text-[#0071e3] transition-colors">
                        #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] font-medium text-gray-400 capitalize">
                        {order.payment_method} • {format(new Date(order.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[14px] font-bold ${order.payment_status === 'voided' ? 'text-gray-400 line-through' : 'text-emerald-500'}`}>
                    {order.payment_status === 'voided' ? '' : '+'}${ (order.total_amount - (order.refunded_amount || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color]} transition-transform group-hover:scale-110`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-400 mb-1">{title}</p>
        <h2 className="text-3xl font-bold text-black tracking-tight">{value}</h2>
        <p className="text-[12px] text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
