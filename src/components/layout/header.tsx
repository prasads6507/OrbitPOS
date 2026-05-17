'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useTransferStore } from '@/store/useTransferStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Bell, Search, Settings, Menu, Package, ArrowRight, Send } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useAuthStore();
  const { setIsOpen: setOpenConfirmation, setPendingTransfer } = useTransferStore();
  const router = useRouter();
  
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.store_id) {
      fetchNotifications();

      // Realtime subscription for stock transfers
      const transferChannel = supabase
        .channel('header_transfers')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'stock_transfers',
          filter: `target_store_id=eq.${profile.store_id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      // Realtime subscription for products (low stock check)
      const productChannel = supabase
        .channel('header_products')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `store_id=eq.${profile.store_id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(transferChannel);
        supabase.removeChannel(productChannel);
      };
    }
  }, [profile]);

  const fetchNotifications = () => {
    fetchLowStock();
    fetchPendingTransfers();
  };

  const fetchLowStock = async () => {
    if (!profile?.store_id) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold')
      .eq('store_id', profile.store_id)
      .eq('is_active', true)
      .lte('stock_quantity', 10);
    
    if (data) {
      const filtered = data.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5));
      setLowStockItems(filtered);
    }
  };

  const fetchPendingTransfers = async () => {
    if (!profile?.store_id) return;
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('target_store_id', profile.store_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching header transfers:', error);
        return;
      }

      if (data) {
        // Fetch source store name dynamically for each pending transfer to ensure safety
        const enrichedTransfers = await Promise.all(
          data.map(async (transfer) => {
            const { data: storeData } = await supabase
              .from('stores')
              .select('name')
              .eq('id', transfer.source_store_id)
              .single();
            return {
              ...transfer,
              source_store_name: storeData ? storeData.name : 'Other Store'
            };
          })
        );
        setPendingTransfers(enrichedTransfers);
      }
    } catch (err) {
      console.error('Exception in fetchPendingTransfers:', err);
    }
  };

  const handleOpenTransfer = (transfer: any) => {
    setPendingTransfer(transfer);
    setOpenConfirmation(true);
  };

  const totalNotifications = lowStockItems.length + pendingTransfers.length;

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden rounded-xl h-10 w-10 text-gray-500 hover:text-black hover:bg-gray-100"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
            <Input 
              placeholder="Search products, orders, or customers..." 
              className="pl-11 h-11 bg-white border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-100 font-medium text-[14px]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="text-gray-500 hover:text-black rounded-xl hover:bg-gray-100 h-10 w-10 relative flex items-center justify-center outline-none transition-colors">
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-2xl border-gray-100 animate-in zoom-in-95 duration-200">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2 flex items-center justify-between">
                <span className="font-black text-black">Notifications</span>
                {totalNotifications > 0 && (
                  <span className="bg-red-50 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {totalNotifications} New
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-50" />
              <div className="max-h-80 overflow-y-auto space-y-1">
                {totalNotifications === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-bold text-sm">No new notifications</p>
                    <p className="text-[11px] text-gray-300 mt-1">Everything looks good!</p>
                  </div>
                ) : (
                  <>
                    {/* Incoming Stock Transfers */}
                    {pendingTransfers.map((transfer) => {
                      const totalQty = (transfer.items as any[]).reduce((sum, item) => sum + item.quantity, 0);
                      return (
                        <DropdownMenuItem 
                          key={transfer.id} 
                          className="p-3 focus:bg-blue-50/50 rounded-xl cursor-pointer group"
                          onSelect={() => handleOpenTransfer(transfer)}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                              <Send className="h-5 w-5 text-[#0071e3]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-black truncate">Incoming Stock</p>
                              <p className="text-[11px] font-medium text-gray-400">From {transfer.source_store_name}</p>
                              <p className="text-[10px] font-black text-[#0071e3] uppercase mt-0.5 tracking-wider">{totalQty} Units Pending</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}

                    {/* Low Stock Alerts */}
                    {lowStockItems.map((item) => (
                      <DropdownMenuItem 
                        key={item.id} 
                        className="p-3 focus:bg-amber-50/50 rounded-xl cursor-pointer group"
                        onSelect={() => router.push('/admin/inventory')}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                            <Package className="h-5 w-5 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-black truncate">{item.name}</p>
                            <p className="text-[11px] font-medium text-amber-600">Only {item.stock_quantity} remaining in stock</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                    }
                  </>
                )}
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="h-8 w-px bg-gray-100 mx-2" />
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-black leading-none mb-1">{profile?.full_name?.split(' ')[0] || 'User'}</p>
            <p className="text-[11px] font-medium text-gray-400 capitalize">{profile ? ((profile as any)?.stores?.name || profile?.role) : 'Checking Store...'}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden cursor-pointer relative">
             <div className="w-full h-full bg-gray-50 absolute" />
             <span className="text-black font-bold text-sm relative">{profile?.full_name?.charAt(0)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
