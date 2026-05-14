'use client';

import { useAuthStore } from '@/store/useAuthStore';
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
import { Bell, Search, Settings, Menu, Package } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.store_id) {
      fetchLowStock();
    }
  }, [profile]);

  const fetchLowStock = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold')
      .eq('store_id', profile?.store_id)
      .eq('is_active', true)
      .lte('stock_quantity', 10); // Check for low stock (threshold of 10 or their specific threshold)
    
    // Filter by their specific threshold if they have one, or a default of 5
    if (data) {
      const filtered = data.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5));
      setLowStockItems(filtered);
    }
  };

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
            {lowStockItems.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-2xl border-gray-100 animate-in zoom-in-95 duration-200">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2 flex items-center justify-between">
                <span className="font-black text-black">Notifications</span>
                {lowStockItems.length > 0 && <span className="bg-red-50 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{lowStockItems.length} Low Stock</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-50" />
              <div className="max-h-80 overflow-y-auto">
                {lowStockItems.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-bold text-sm">No new notifications</p>
                    <p className="text-[11px] text-gray-300 mt-1">Everything looks good!</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <DropdownMenuItem 
                      key={item.id} 
                      className="p-3 focus:bg-[#f5f5f7] rounded-xl cursor-pointer group"
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
