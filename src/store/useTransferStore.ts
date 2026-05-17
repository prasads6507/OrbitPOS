import { create } from 'zustand';

interface TransferState {
  isOpen: boolean;
  pendingTransfer: any | null;
  setIsOpen: (isOpen: boolean) => void;
  setPendingTransfer: (transfer: any | null) => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  isOpen: false,
  pendingTransfer: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  setPendingTransfer: (pendingTransfer) => set({ pendingTransfer })
}));
