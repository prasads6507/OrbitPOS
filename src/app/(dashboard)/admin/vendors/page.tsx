'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  FileText, 
  Upload, 
  Search, 
  Calendar, 
  Trash2, 
  ExternalLink,
  Loader2,
  Package,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

export default function VendorInvoicesPage() {
  const { profile } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced search/filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Upload dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (profile?.store_id) {
      fetchInvoices();
    }
  }, [profile]);

  const fetchInvoices = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select('*')
        .eq('store_id', profile.store_id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !vendorName || !profile?.store_id) {
      toast.error('Please fill in all required fields and choose a file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `invoices/${profile.store_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const parsedAmount = amount ? parseFloat(amount) : 0;

      const { error: dbError } = await supabase
        .from('vendor_invoices')
        .insert({
          vendor_name: vendorName,
          invoice_url: publicUrl,
          invoice_date: invoiceDate,
          store_id: profile.store_id,
          invoice_number: invoiceNumber || null,
          amount: isNaN(parsedAmount) ? 0 : parsedAmount,
          notes: notes || null
        });

      if (dbError) throw dbError;

      toast.success('Supplier invoice stored successfully for future reference!');
      setUploadOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setVendorName('');
    setInvoiceNumber('');
    setAmount('');
    setNotes('');
    setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const deleteInvoice = async (id: string, url: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error: dbError } = await supabase
        .from('vendor_invoices')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (error: any) {
      toast.error('Failed to delete invoice');
    }
  };

  // Perform multi-criteria filtering on the client-side for rapid rendering
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && !isBefore(parseISO(inv.invoice_date), parseISO(startDate));
    }
    if (endDate) {
      matchesDate = matchesDate && !isAfter(parseISO(inv.invoice_date), parseISO(endDate));
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black" style={{ fontFamily: 'var(--font-outfit)' }}>
            Supplier Invoices & Expense Vault
          </h1>
          <p className="text-[#86868b] font-medium mt-1">
            Store and audit invoices from external companies and vendors for future reference.
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger render={<Button className="bg-black hover:bg-gray-800 text-white font-bold rounded-2xl h-11 px-6 shadow-lg transition-all active:scale-95" />}>
            <Upload className="mr-2 h-5 w-5" />
            Store New Invoice
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
              <DialogTitle className="text-2xl font-black text-black tracking-tight">Store External Invoice</DialogTitle>
              <p className="text-gray-400 font-medium text-[13px] mt-1">
                Upload billing files from external partners for accounting and future reference.
              </p>
            </div>
            <form onSubmit={handleUpload} className="p-10 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Company / Vendor Name *</Label>
                  <Input 
                    placeholder="e.g. Acme Supplier Corp" 
                    className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold text-sm"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Invoice / Reference #</Label>
                  <Input 
                    placeholder="e.g. INV-2026-99" 
                    className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold text-sm"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Amount ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Invoice Date *</Label>
                  <Input 
                    type="date"
                    className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold text-sm"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes & Future Reference Purpose</Label>
                <Textarea 
                  placeholder="E.g. Purchase of office hardware, servers, gadget components..." 
                  className="bg-[#f5f5f7] border-transparent rounded-xl font-medium text-sm min-h-20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload PDF / Image File *</Label>
                <div className="relative h-28 rounded-2xl bg-[#f5f5f7] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-all overflow-hidden group">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-7 w-7 text-[#0071e3] mb-1" />
                      <p className="text-[11px] font-bold text-black truncate max-w-[240px]">{file.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-gray-300 mb-1" />
                      <p className="text-[11px] text-gray-400 font-bold">Select invoice file</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" type="button" className="flex-1 rounded-xl font-bold text-gray-400" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-12 rounded-xl shadow-xl" disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Store Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
            <Input 
              placeholder="Search by supplier, reference #, or purpose..." 
              className="pl-12 h-12 bg-[#f5f5f7] border-transparent rounded-2xl font-medium shadow-none focus-visible:bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              type="date"
              className="pl-12 h-12 bg-[#f5f5f7] border-transparent rounded-2xl font-semibold text-gray-600 shadow-none focus-visible:bg-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="absolute right-3 top-[-8px] bg-white px-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Start Date</span>
          </div>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              type="date"
              className="pl-12 h-12 bg-[#f5f5f7] border-transparent rounded-2xl font-semibold text-gray-600 shadow-none focus-visible:bg-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <span className="absolute right-3 top-[-8px] bg-white px-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">End Date</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">External Supplier</TableHead>
              <TableHead className="font-bold text-black">Reference #</TableHead>
              <TableHead className="font-bold text-black">Amount</TableHead>
              <TableHead className="font-bold text-black">Purpose / Notes</TableHead>
              <TableHead className="font-bold text-black">Invoice Date</TableHead>
              <TableHead className="font-bold text-black">Uploaded At</TableHead>
              <TableHead className="w-[120px] pr-8 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#0071e3]" />
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                  <p className="text-gray-400 font-bold">No partner invoices archived yet</p>
                  <p className="text-gray-300 text-xs mt-1">Upload external invoices for billing reference.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="border-gray-50 hover:bg-gray-50/50 group">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-black">{inv.vendor_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-gray-600 text-xs">
                    {inv.invoice_number || 'N/A'}
                  </TableCell>
                  <TableCell className="font-extrabold text-black">
                    {inv.amount ? `$${Number(inv.amount).toFixed(2)}` : '$0.00'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-gray-500 font-medium text-[13px]">
                    {inv.notes || '—'}
                  </TableCell>
                  <TableCell className="font-medium text-gray-600">
                    {format(new Date(inv.invoice_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-gray-400 text-[13px] font-medium">
                    {format(new Date(inv.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-blue-50 hover:text-[#0071e3]"
                        onClick={() => window.open(inv.invoice_url, '_blank')}
                      >
                        <ExternalLink className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-rose-50 hover:text-rose-500"
                        onClick={() => deleteInvoice(inv.id, inv.invoice_url)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
