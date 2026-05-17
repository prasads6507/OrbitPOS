'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Wallet, 
  Download, 
  Calendar, 
  DollarSign, 
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { format, startOfYear, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { downloadCSV } from '@/lib/export';
import { toast } from 'sonner';

import { useActiveStore } from '@/store/useActiveStore';

export default function PayrollPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ ytd: 0, estimated: 0, currentHours: 0 });
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);

  const storeToUse = activeStoreId || profile?.store_id;

  useEffect(() => {
    if (storeToUse) {
      fetchPayroll();
    }
  }, [profile, activeStoreId, storeToUse]);

  const fetchPayroll = async () => {
    if (!profile || !storeToUse) return;
    setLoading(true);

    try {
      if (profile.role === 'admin') {
        // Fetch only employees from this store
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .eq('store_id', storeToUse);
        
        // Fetch attendance for store employees for the current month
        const { data: monthLogs } = await supabase
          .from('attendance')
          .select('*')
          .eq('store_id', storeToUse)
          .gte('clock_in', startOfMonth(new Date()).toISOString());
        
        // Fetch store payroll history for YTD calculation
        const { data: allStubs } = await supabase
          .from('payroll')
          .select('*')
          .eq('store_id', storeToUse);

        const employeesList = (profilesData || []).map(emp => {
          const empLogs = (monthLogs || []).filter(l => l.employee_id === emp.id);
          const hours = empLogs.reduce((sum, l) => sum + (Number(l.total_hours) || 0), 0);
          return {
            id: emp.id,
            name: emp.full_name,
            role: emp.role,
            hourly_rate: Number(emp.hourly_rate) || 0,
            currentHours: hours,
            estimatedPay: hours * (Number(emp.hourly_rate) || 0)
          };
        });

        setPayrollData(employeesList);

        const ytdTotal = (allStubs || [])
          .filter(s => new Date(s.period_end) >= startOfYear(new Date()))
          .reduce((sum, s) => sum + (Number(s.gross_pay) || 0), 0);
        
        const totalEstimated = employeesList.reduce((sum, e) => sum + e.estimatedPay, 0);
        const totalHours = employeesList.reduce((sum, e) => sum + e.currentHours, 0);

        setStats({ ytd: ytdTotal, estimated: totalEstimated, currentHours: totalHours });
      } else {
        // 1. Fetch historical pay stubs for this user and store
        const { data } = await supabase
          .from('payroll')
          .select('*')
          .eq('employee_id', profile.id)
          .eq('store_id', storeToUse)
          .order('period_end', { ascending: false });

        const stubs = data || [];
        setPayrollData(stubs);

        // 2. Calculate YTD
        const ytdTotal = stubs
          .filter(s => new Date(s.period_end) >= startOfYear(new Date()))
          .reduce((sum, s) => sum + (Number(s.gross_pay) || 0), 0);

        // 3. Fetch Current Month Hours
        const { data: monthLogs } = await supabase
          .from('attendance')
          .select('total_hours')
          .eq('employee_id', profile.id)
          .eq('store_id', storeToUse)
          .gte('clock_in', startOfMonth(new Date()).toISOString());
        
        const currentHours = monthLogs?.reduce((sum, l) => sum + (Number(l.total_hours) || 0), 0) || 0;
        const estimated = currentHours * (Number(profile.hourly_rate) || 0);

        setStats({ ytd: ytdTotal, estimated, currentHours });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateTestStub = async () => {
    if (!profile || stats.currentHours === 0) {
      toast.error(stats.currentHours === 0 ? "You haven't clocked any hours yet!" : "Profile not found");
      return;
    }

    setGenerating(true);
    try {
      const { error } = await supabase
        .from('payroll')
        .insert({
          employee_id: profile.id,
          period_start: startOfMonth(new Date()).toISOString(),
          period_end: new Date().toISOString(),
          total_hours: stats.currentHours,
          gross_pay: stats.estimated,
          status: 'paid',
        });

      if (error) throw error;
      
      toast.success('Pay stub generated for current hours!');
      fetchPayroll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate stub');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Payroll</h1>
          <p className="text-[#86868b] font-medium mt-1">
            {profile?.role === 'admin' ? 'Store-wide payroll overview and employee timesheets.' : 'View your earnings and payment history.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-black text-white px-6 py-3 rounded-2xl flex items-center shadow-xl shadow-black/10">
            <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
            <span className="text-[13px] font-bold text-gray-400 mr-2 uppercase tracking-widest">Rate:</span>
            <span className="text-xl font-black">${profile?.hourly_rate?.toFixed(2) || '0.00'}/hr</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute top-0 right-0 p-8 text-emerald-50 opacity-10 transition-transform group-hover:scale-110">
              <Calendar className="h-20 w-20" />
           </div>
           <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
           <h3 className="text-3xl font-black text-black tracking-tight">Active</h3>
           <p className="text-[13px] text-emerald-500 font-bold mt-2 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Direct Deposit Ready
           </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute top-0 right-0 p-8 text-[#0071e3] opacity-5 transition-transform group-hover:scale-110">
              <Clock className="h-20 w-20" />
           </div>
           <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unpaid Earnings</p>
           <h3 className="text-3xl font-black text-black tracking-tight">${stats.estimated.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
           <p className="text-[12px] text-gray-400 font-medium mt-2">{stats.currentHours.toFixed(1)} hours this month</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute top-0 right-0 p-8 text-indigo-50 opacity-10 transition-transform group-hover:scale-110">
              <Wallet className="h-20 w-20" />
           </div>
           <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">YTD Earnings</p>
           <h3 className="text-3xl font-black text-black tracking-tight">${stats.ytd.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
           <div className="mt-2 flex items-center text-[12px] font-bold text-indigo-500">
              <TrendingUp className="h-3 w-3 mr-1" />
              Year 2026
           </div>
        </div>
      </div>

      {/* Pay Stubs Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-bold text-black">{profile?.role === 'admin' ? 'Employee Payroll' : 'Pay Stubs'}</h3>
             <p className="text-[13px] text-gray-400 font-medium">{profile?.role === 'admin' ? 'Automatically calculated pay based on timesheets' : 'Your historical payment records'}</p>
           </div>
           <div className="flex items-center gap-3">
             {profile?.role !== 'admin' && (
               <Button 
                 onClick={generateTestStub} 
                 disabled={generating || stats.currentHours === 0}
                 variant="outline" 
                 className="rounded-xl border-[#0071e3] text-[#0071e3] hover:bg-blue-50 h-11 font-bold"
               >
                  {generating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Process Current Hours
               </Button>
             )}
             <Button variant="outline" className="rounded-xl border-gray-100 shadow-sm h-11 font-bold" onClick={() => downloadCSV(payrollData, 'payroll_export.csv')}>
                <Download className="mr-2 h-4 w-4 text-gray-400" />
                Export
             </Button>
           </div>
        </div>
        <Table>
          <TableHeader>
            {profile?.role === 'admin' ? (
              <TableRow className="border-gray-50">
                <TableHead className="font-bold text-black pl-8">Employee</TableHead>
                <TableHead className="font-bold text-black">Rate</TableHead>
                <TableHead className="font-bold text-black">Hours (This Month)</TableHead>
                <TableHead className="font-bold text-black">Calculated Pay</TableHead>
                <TableHead className="font-bold text-black text-right pr-8">Actions</TableHead>
              </TableRow>
            ) : (
              <TableRow className="border-gray-50">
                <TableHead className="font-bold text-black pl-8">Pay Period</TableHead>
                <TableHead className="font-bold text-black">Hours</TableHead>
                <TableHead className="font-bold text-black">Gross Pay</TableHead>
                <TableHead className="font-bold text-black">Status</TableHead>
                <TableHead className="font-bold text-black text-right pr-8">Receipt</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : payrollData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <div className="flex flex-col items-center text-gray-300">
                    <Wallet className="h-16 w-16 mb-4 opacity-10" />
                    <p className="font-bold">No data found</p>
                    <p className="text-[13px] mt-1">No payroll information is available yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : profile?.role === 'admin' ? (
              payrollData.map((emp) => (
                <TableRow key={emp.id} className="border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="pl-8">
                    <div>
                      <p className="font-bold text-black">{emp.name || 'Unnamed Employee'}</p>
                      <p className="text-[12px] text-gray-400 capitalize">{emp.role}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-500">${(emp.hourly_rate || 0).toFixed(2)}/hr</TableCell>
                  <TableCell className="font-medium text-gray-500">{(emp.currentHours || 0).toFixed(2)} hrs</TableCell>
                  <TableCell className="font-black text-black text-lg">${(emp.estimatedPay || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" className="text-[#0071e3] font-bold text-[13px] hover:bg-blue-50 rounded-xl" onClick={() => setSelectedDetails(emp)}>
                      View Details
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              payrollData.map((stub) => (
                <TableRow key={stub.id} className="border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="pl-8">
                    <div className="font-bold text-black">
                      {format(new Date(stub.period_start), 'MMM d')} - {format(new Date(stub.period_end), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-500">{stub.total_hours.toFixed(2)} hrs</TableCell>
                  <TableCell className="font-black text-black text-lg">${stub.gross_pay.toFixed(2)}</TableCell>
                  <TableCell>
                    {stub.status === 'paid' ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-50 text-gray-500 border-gray-100 font-bold">Processing</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" className="text-[#0071e3] font-bold text-[13px] hover:bg-blue-50 rounded-xl" onClick={() => setSelectedDetails(stub)}>
                      View Details
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedDetails} onOpenChange={(open) => !open && setSelectedDetails(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Payroll Details</DialogTitle>
          </DialogHeader>
          {selectedDetails && (
            <div className="space-y-4 mt-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Name</span>
                <span className="font-bold text-black">{selectedDetails.name || profile?.full_name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Rate</span>
                <span className="font-bold text-black">${(selectedDetails.hourly_rate || profile?.hourly_rate || 0).toFixed(2)}/hr</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Hours</span>
                <span className="font-bold text-black">{(selectedDetails.currentHours ?? selectedDetails.total_hours ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gray-50 rounded-xl px-4">
                <span className="text-gray-500 font-medium">Total Pay</span>
                <span className="font-black text-emerald-600 text-xl">
                  ${(selectedDetails.estimatedPay ?? selectedDetails.gross_pay ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
