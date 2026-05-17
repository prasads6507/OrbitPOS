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
  RefreshCw,
  Store,
  ChevronDown,
  Download,
  Boxes,
  TrendingDown,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  format, 
  startOfDay, 
  endOfDay,
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear 
} from 'date-fns';

const CHART_COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'];

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
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  
  // Advanced Vendor & Product Analytics states
  const [vendorData, setVendorData] = useState<any[]>([]);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState<number>(0);

  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(profile?.store_id || null);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
      fetchStores();
    }
  }, [profile]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*');
    if (data) setStores(data);
  };

  useEffect(() => {
    const storeToUse = selectedStoreId || profile?.store_id;
    if (storeToUse) {
      fetchDashboardData(selectedDate, timeRange, storeToUse);
    }
  }, [selectedDate, timeRange, profile, selectedStoreId]);

  const fetchDashboardData = async (dateStr: string, range: string, storeId: string) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const targetDate = new Date(dateStr + 'T00:00:00');
      let startDate: string;
      let endDate: string;

      if (range === 'daily') {
        startDate = startOfDay(targetDate).toISOString();
        endDate = endOfDay(targetDate).toISOString();
      } else if (range === 'weekly') {
        startDate = startOfWeek(targetDate).toISOString();
        endDate = endOfWeek(targetDate).toISOString();
      } else if (range === 'monthly') {
        startDate = startOfMonth(targetDate).toISOString();
        endDate = endOfMonth(targetDate).toISOString();
      } else {
        startDate = startOfYear(targetDate).toISOString();
        endDate = endOfYear(targetDate).toISOString();
      }

      // 1. Stats based on range
      const { data: rangeData } = await supabase
        .from('orders')
        .select('total_amount, refunded_amount')
        .eq('store_id', storeId)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .neq('payment_status', 'voided');

      const totalRevenue = rangeData?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
      const totalLoss = rangeData?.reduce((sum, o) => sum + (o.refunded_amount || 0), 0) || 0;
      const orderCount = rangeData?.length || 0;

      // 2. All time staff count
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      setStats({
        totalRevenue,
        todaySales: orderCount,
        totalLoss,
        totalProfiles: totalProfiles || 0,
      });

      // 3. Dynamic Chart Data
      const chartPoints = [];
      if (range === 'daily' || range === 'weekly') {
        for (let i = 6; i >= 0; i--) {
          const day = subDays(targetDate, i);
          const dStart = startOfDay(day).toISOString();
          const dEnd = endOfDay(day).toISOString();

          const { data: dOrders } = await supabase
            .from('orders')
            .select('total_amount, refunded_amount')
            .eq('store_id', storeId)
            .gte('created_at', dStart)
            .lt('created_at', dEnd)
            .neq('payment_status', 'voided');

          const dRev = dOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
          chartPoints.push({
            name: format(day, 'EEE'),
            revenue: parseFloat(dRev.toFixed(2)),
          });
        }
      } else if (range === 'monthly') {
        for (let i = 0; i < 4; i++) {
          const wStart = subDays(endOfMonth(targetDate), (3 - i) * 7 + 6);
          const wEnd = subDays(endOfMonth(targetDate), (3 - i) * 7);
          
          const { data: wOrders } = await supabase
            .from('orders')
            .select('total_amount, refunded_amount')
            .eq('store_id', storeId)
            .gte('created_at', startOfDay(wStart).toISOString())
            .lt('created_at', endOfDay(wEnd).toISOString())
            .neq('payment_status', 'voided');

          const wRev = wOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
          chartPoints.push({
            name: `Week ${i + 1}`,
            revenue: parseFloat(wRev.toFixed(2)),
          });
        }
      } else {
        for (let i = 0; i < 12; i++) {
          const mDate = new Date(targetDate.getFullYear(), i, 1);
          const mStart = startOfMonth(mDate).toISOString();
          const mEnd = endOfMonth(mDate).toISOString();

          const { data: mOrders } = await supabase
            .from('orders')
            .select('total_amount, refunded_amount')
            .eq('store_id', storeId)
            .gte('created_at', mStart)
            .lt('created_at', mEnd)
            .neq('payment_status', 'voided');

          const mRev = mOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
          chartPoints.push({
            name: format(mDate, 'MMM'),
            revenue: parseFloat(mRev.toFixed(2)),
          });
        }
      }
      setChartData(chartPoints);

      // 4. Recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, refunded_amount, payment_method, payment_status, created_at')
        .eq('store_id', storeId)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);

      // 5. Vendor Performance Data & Dynamic Sub-product association
      const { data: vItems } = await supabase
        .from('order_items')
        .select(`
          quantity,
          product_id,
          products!inner (
            vendor_name,
            name,
            store_id
          )
        `)
        .eq('products.store_id', storeId)
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      const vendorMap: Record<string, number> = {};
      const vendorProductsMap: Record<string, Record<string, { quantity: number; name: string }>> = {};

      vItems?.forEach((item: any) => {
        const vName = item.products?.vendor_name || 'Generic Vendor';
        const pName = item.products?.name || 'Unknown Item';
        const pId = item.product_id;

        vendorMap[vName] = (vendorMap[vName] || 0) + item.quantity;

        if (!vendorProductsMap[vName]) {
          vendorProductsMap[vName] = {};
        }
        if (!vendorProductsMap[vName][pName]) {
          vendorProductsMap[vName][pName] = { quantity: 0, name: pName };
        }
        vendorProductsMap[vName][pName].quantity += item.quantity;
      });

      const vData = Object.entries(vendorMap)
        .map(([name, value]) => {
          const associatedProducts = Object.values(vendorProductsMap[name] || {})
            .sort((a, b) => b.quantity - a.quantity);

          return {
            name,
            value,
            products: associatedProducts
          };
        })
        .sort((a, b) => b.value - a.value);

      setVendorData(vData);
      setSelectedVendorIndex(0); // Reset index to highest selling vendor

    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const currentVendor = vendorData[selectedVendorIndex] || null;

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
          <div className="flex bg-white border border-gray-100 p-1 rounded-2xl shadow-sm">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 py-2 rounded-xl text-[12px] font-bold capitalize transition-all ${
                  timeRange === r 
                    ? 'bg-black text-white shadow-lg' 
                    : 'text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-[#0071e3] transition-colors">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <input 
              type="date" 
              className="text-[13px] font-semibold text-gray-600 bg-transparent outline-none cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-[#0071e3] transition-colors">
              <Store className="h-4 w-4 text-gray-400" />
              <select 
                className="text-[13px] font-semibold text-gray-600 bg-transparent outline-none cursor-pointer appearance-none pr-6 relative"
                value={selectedStoreId || ''}
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={() => fetchDashboardData(selectedDate, timeRange, selectedStoreId || profile?.store_id || '')} 
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
          subtitle={`Total for ${timeRange} period`}
          icon={DollarSign}
          color="blue"
        />
        <StatsCard 
          title="Orders Count" 
          value={loading ? '...' : stats.todaySales.toString()}
          subtitle={`Total in selected ${timeRange}`}
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
              <h3 className="text-xl font-bold text-black" style={{fontFamily: 'var(--font-outfit)'}}>Revenue Trends</h3>
              <p className="text-[13px] text-gray-400 font-medium">Visualizing data for the selected {timeRange} period</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
              <span className="text-[11px] font-bold text-gray-500 uppercase">Revenue</span>
            </div>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-300">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : chartData.length === 0 || chartData.every(d => d.revenue === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium text-gray-400">No orders yet</p>
                <p className="text-[13px]">Complete a sale in POS to see data here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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

        {/* Brand New Interactive Drill-down Vendor and Associated Products Dashboard */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-black" style={{fontFamily: 'var(--font-outfit)'}}>Vendor Performance Hub</h3>
              <p className="text-[13px] text-gray-400 font-medium">Click vendor share slices or tabs to reveal specific products sold.</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl font-bold h-9 border-gray-100 shadow-sm"
                onClick={() => {
                  const csv = vendorData.map(v => `${v.name},${v.value}`).join('\n');
                  const blob = new Blob([`Vendor,Units Sold\n${csv}`], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vendor_report_${timeRange}.csv`;
                  a.click();
                }}
                disabled={vendorData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[#0071e3]" />
            </div>
          ) : vendorData.length === 0 ? (
            <div className="h-[350px] flex flex-col items-center justify-center text-gray-300">
              <Package className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium text-gray-400">No vendor performance data available for this period</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
              
              {/* Radial Share Chart (Left Col) */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center">
                <div className="h-[250px] w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vendorData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        onClick={(_, idx) => setSelectedVendorIndex(idx)}
                        className="cursor-pointer"
                      >
                        {vendorData.map((_, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                            stroke={selectedVendorIndex === idx ? '#000' : 'transparent'}
                            strokeWidth={selectedVendorIndex === idx ? 2 : 0}
                            style={{ outline: 'none', filter: selectedVendorIndex === idx ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value} Units`, 'Quantity']} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Absolute Centered Stats Badge */}
                  <div className="absolute text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected share</p>
                    <p className="text-2xl font-black text-black mt-0.5">
                      {currentVendor ? `${((currentVendor.value / vendorData.reduce((sum, v) => sum + v.value, 0)) * 100).toFixed(0)}%` : '0%'}
                    </p>
                  </div>
                </div>

                {/* Legends */}
                <div className="flex flex-wrap gap-3 justify-center mt-2 max-w-[90%]">
                  {vendorData.map((v, idx) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVendorIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        selectedVendorIndex === idx 
                          ? 'bg-black text-white border-black shadow-md' 
                          : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="truncate max-w-[100px]">{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Associated Products Breakdown (Right Col) */}
              <div className="lg:col-span-3 space-y-5 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="bg-blue-100 text-[#0071e3] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                      Supplier Products Breakout
                    </span>
                    <h4 className="text-lg font-black text-black mt-2 leading-none">
                      {currentVendor?.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Sales</p>
                    <p className="text-xl font-black text-[#0071e3]">{currentVendor?.value || 0} Units</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {!currentVendor?.products || currentVendor.products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-300">
                      <Boxes className="h-10 w-10 mb-2 opacity-25" />
                      <p className="text-xs font-bold">No products cataloged under this vendor</p>
                    </div>
                  ) : (
                    currentVendor.products.map((p: any, idx: number) => {
                      const percentage = currentVendor.value > 0 ? (p.quantity / currentVendor.value) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-black">
                            <span className="truncate max-w-[220px]">{p.name}</span>
                            <span className="text-gray-400 font-black">{p.quantity} Units ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200/50 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ 
                                width: `${percentage}%`, 
                                backgroundColor: CHART_COLORS[selectedVendorIndex % CHART_COLORS.length] 
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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
