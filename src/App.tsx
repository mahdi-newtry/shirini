import React, { useState, useEffect } from 'react';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_BOT_SETTINGS,
  INITIAL_DISCOUNT_CODES, 
  INITIAL_SUPPORT_TICKETS,
  INITIAL_CUSTOMERS,
  INITIAL_WALLET_TRANSACTIONS,
  INITIAL_BACKUP_SCHEDULE,
  INITIAL_BACKUP_SNAPSHOTS,
  INITIAL_CUSTOM_ORDERS
} from './data/initialData';
import { 
  Product, 
  Order, 
  BotSettings, 
  OrderStatus, 
  DiscountCode, 
  SupportTicket, 
  TicketStatus,
  CustomerUser,
  WalletTransaction,
  BackupScheduleConfig,
  BackupSnapshot,
  MasterBackupPayload,
  CustomPastryOrder,
  CustomPastryStatus,
  CustomPastryType
} from './types';
import { Sidebar } from './components/Header';
import { TelegramSimulator } from './components/TelegramSimulator';
import { ProductManager } from './components/ProductManager';
import { OrderManager } from './components/OrderManager';
import { DiscountManager } from './components/DiscountManager';
import { SalesAnalytics } from './components/SalesAnalytics';
import { BotSettingsComponent } from './components/BotSettings';
import { SupportManager } from './components/SupportManager';
import { BotTextsCustomizer } from './components/BotTextsCustomizer';
import { BackupManager } from './components/BackupManager';
import { CustomPastryManager } from './components/CustomPastryManager';
import { CustomerManager } from './components/CustomerManager';

export default function App() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [customOrders, setCustomOrders] = useState<CustomPastryOrder[]>(INITIAL_CUSTOM_ORDERS);
  const [discounts, setDiscounts] = useState<DiscountCode[]>(INITIAL_DISCOUNT_CODES);
  const [botSettings, setBotSettings] = useState<BotSettings>(INITIAL_BOT_SETTINGS);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [customers, setCustomers] = useState<CustomerUser[]>(INITIAL_CUSTOMERS);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(INITIAL_WALLET_TRANSACTIONS);
  const [backupSchedule, setBackupSchedule] = useState<BackupScheduleConfig>(INITIAL_BACKUP_SCHEDULE);
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>(INITIAL_BACKUP_SNAPSHOTS);
  
  const [activeTab, setActiveTab] = useState<'simulator' | 'products' | 'orders' | 'custom_orders' | 'discounts' | 'support' | 'texts' | 'analytics' | 'settings' | 'backup' | 'customers'>('simulator');
  const [simulatorRole, setSimulatorRole] = useState<'customer' | 'admin'>('customer');
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Fetch initial data from Express backend
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, ordRes, customOrdRes, discRes, setRes, supRes, custRes, wtxRes, schedRes, snapRes] = await Promise.all([
          fetch('/api/products').catch(() => null),
          fetch('/api/orders').catch(() => null),
          fetch('/api/custom-orders').catch(() => null),
          fetch('/api/discounts').catch(() => null),
          fetch('/api/settings').catch(() => null),
          fetch('/api/support/tickets').catch(() => null),
          fetch('/api/customers').catch(() => null),
          fetch('/api/wallet/transactions').catch(() => null),
          fetch('/api/backup/schedule').catch(() => null),
          fetch('/api/backup/snapshots').catch(() => null),
        ]);

        if (prodRes && prodRes.ok) {
          const prods = await prodRes.json();
          if (Array.isArray(prods) && prods.length > 0) setProducts(prods);
        }
        if (ordRes && ordRes.ok) {
          const ords = await ordRes.json();
          if (Array.isArray(ords)) setOrders(ords);
        }
        if (customOrdRes && customOrdRes.ok) {
          const cords = await customOrdRes.json();
          if (Array.isArray(cords) && cords.length > 0) setCustomOrders(cords);
        }
        if (discRes && discRes.ok) {
          const discs = await discRes.json();
          if (Array.isArray(discs) && discs.length > 0) setDiscounts(discs);
        }
        if (setRes && setRes.ok) {
          const sett = await setRes.json();
          if (sett && sett.storeName) setBotSettings(sett);
        }
        if (supRes && supRes.ok) {
          const sups = await supRes.json();
          if (Array.isArray(sups) && sups.length > 0) setSupportTickets(sups);
        }
        if (custRes && custRes.ok) {
          const custs = await custRes.json();
          if (Array.isArray(custs) && custs.length > 0) setCustomers(custs);
        }
        if (wtxRes && wtxRes.ok) {
          const wtxs = await wtxRes.json();
          if (Array.isArray(wtxs)) setWalletTransactions(wtxs);
        }
        if (schedRes && schedRes.ok) {
          const sched = await schedRes.json();
          if (sched && typeof sched === 'object') setBackupSchedule(sched);
        }
        if (snapRes && snapRes.ok) {
          const snaps = await snapRes.json();
          if (Array.isArray(snaps)) setBackupSnapshots(snaps);
        }
      } catch (err) {
        console.warn('Using local fallback state:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Add Product Handler
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const tempProduct: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Optimistic state update
    setProducts(prev => [tempProduct, ...prev]);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempProduct)
      });
      if (res.ok) {
        const saved = await res.json();
        setProducts(prev => prev.map(p => p.id === tempProduct.id ? saved : p));
        return saved;
      }
    } catch (e) {
      console.error('Failed to persist product to server:', e);
    }
    return tempProduct;
  };

  // Update Product Handler
  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to update product on server:', e);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete product on server:', e);
    }
  };

  // Create Order Handler
  const handleCreateOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
    const tempOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: `SH-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOrders(prev => [tempOrder, ...prev]);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempOrder)
      });
      if (res.ok) {
        const saved = await res.json();
        setOrders(prev => prev.map(o => o.id === tempOrder.id ? saved : o));
        return saved;
      }
    } catch (e) {
      console.error('Failed to persist order to server:', e);
    }
    return tempOrder;
  };

  // Update Order Status Handler
  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o));
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error('Failed to update order status on server:', e);
    }
  };

  // Add Discount Code Handler
  const handleAddDiscount = async (newDiscountData: Omit<DiscountCode, 'id' | 'createdAt'>): Promise<DiscountCode> => {
    const tempDiscount: DiscountCode = {
      ...newDiscountData,
      id: `disc-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setDiscounts(prev => [tempDiscount, ...prev]);

    try {
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDiscountData)
      });
      if (res.ok) {
        const savedDiscount = await res.json();
        setDiscounts(prev => prev.map(d => d.id === tempDiscount.id ? savedDiscount : d));
        return savedDiscount;
      }
    } catch (e) {
      console.error('Failed to save discount to server:', e);
    }
    return tempDiscount;
  };

  // Update Discount Code Handler
  const handleUpdateDiscount = async (id: string, updates: Partial<DiscountCode>) => {
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    try {
      await fetch(`/api/discounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to update discount on server:', e);
    }
  };

  // Delete Discount Code Handler
  const handleDeleteDiscount = async (id: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
    try {
      await fetch(`/api/discounts/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete discount from server:', e);
    }
  };

  // Update Settings Handler
  const handleUpdateSettings = async (newSettings: Partial<BotSettings>) => {
    setBotSettings(prev => ({ ...prev, ...newSettings }));
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.error('Failed to update settings on server:', e);
    }
  };

  // Support Tickets Handlers
  const handleAddSupportTicket = async (ticketData: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'replies'>): Promise<SupportTicket> => {
    const tempTicket: SupportTicket = {
      ...ticketData,
      id: `tkt-${Date.now()}`,
      ticketNumber: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [
        {
          id: `rep-${Date.now()}`,
          sender: 'customer',
          senderName: ticketData.customerName,
          text: ticketData.message,
          createdAt: new Date().toISOString()
        }
      ]
    };

    setSupportTickets(prev => [tempTicket, ...prev]);

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempTicket)
      });
      if (res.ok) {
        const saved = await res.json();
        setSupportTickets(prev => prev.map(t => t.id === tempTicket.id ? saved : t));
        return saved;
      }
    } catch (e) {
      console.error('Failed to save support ticket to server:', e);
    }
    return tempTicket;
  };

  const handleReplySupportTicket = async (ticketId: string, replyText: string, senderName?: string) => {
    const newReply = {
      id: `rep-${Date.now()}`,
      sender: 'admin' as const,
      senderName: senderName || 'مدیریت قنادی',
      text: replyText,
      createdAt: new Date().toISOString()
    };

    setSupportTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              status: 'answered',
              updatedAt: new Date().toISOString(),
              replies: [...t.replies, newReply]
            }
          : t
      )
    );

    try {
      await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText,
          sender: 'admin',
          senderName: senderName || 'مدیریت قنادی'
        })
      });
    } catch (e) {
      console.error('Failed to send reply to ticket:', e);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus, priority?: 'low' | 'normal' | 'high') => {
    setSupportTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              status,
              priority: priority || t.priority,
              updatedAt: new Date().toISOString()
            }
          : t
      )
    );

    try {
      await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, priority })
      });
    } catch (e) {
      console.error('Failed to update ticket status:', e);
    }
  };

  const handleDeleteSupportTicket = async (ticketId: string) => {
    setSupportTickets(prev => prev.filter(t => t.id !== ticketId));
    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete support ticket:', e);
    }
  };

  // --- Custom Pastry Orders Handlers ---
  const handleAddCustomOrder = async (orderData: Omit<CustomPastryOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'chatMessages'>): Promise<CustomPastryOrder> => {
    const tempOrder: CustomPastryOrder = {
      ...orderData,
      id: `custom-${Date.now()}`,
      orderNumber: `CK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatMessages: []
    };

    setCustomOrders(prev => [tempOrder, ...prev]);

    try {
      const res = await fetch('/api/custom-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempOrder)
      });
      if (res.ok) {
        const saved = await res.json();
        setCustomOrders(prev => prev.map(o => o.id === tempOrder.id ? saved : o));
        return saved;
      }
    } catch (e) {
      console.error('Failed to create custom order on server:', e);
    }
    return tempOrder;
  };

  const handleUpdateCustomOrderStatus = async (id: string, status: CustomPastryStatus, rejectReason?: string, adminNotes?: string) => {
    setCustomOrders(prev =>
      prev.map(o =>
        o.id === id
          ? {
              ...o,
              status,
              rejectReason: rejectReason !== undefined ? rejectReason : o.rejectReason,
              adminNotes: adminNotes !== undefined ? adminNotes : o.adminNotes,
              updatedAt: new Date().toISOString()
            }
          : o
      )
    );

    try {
      await fetch(`/api/custom-orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectReason, adminNotes })
      });
    } catch (e) {
      console.error('Failed to update custom order status:', e);
    }
  };

  const handleQuoteCustomOrder = async (id: string, finalPrice: number, prepaymentAmount: number, adminNotes?: string, messageToCustomer?: string) => {
    setCustomOrders(prev =>
      prev.map(o =>
        o.id === id
          ? {
              ...o,
              finalPrice,
              prepaymentAmount,
              adminNotes: adminNotes !== undefined ? adminNotes : o.adminNotes,
              status: 'price_quoted' as CustomPastryStatus,
              updatedAt: new Date().toISOString()
            }
          : o
      )
    );

    try {
      await fetch(`/api/custom-orders/${id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalPrice, prepaymentAmount, adminNotes, messageToCustomer })
      });
    } catch (e) {
      console.error('Failed to quote custom order:', e);
    }
  };

  const handleSendCustomOrderChatMessage = async (orderId: string, text: string, senderName?: string) => {
    const newMsg = {
      id: `cmsg-${Date.now()}`,
      sender: 'admin' as const,
      senderName: senderName || 'سرقناد قنادی',
      text,
      createdAt: new Date().toISOString()
    };

    setCustomOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              chatMessages: [...(o.chatMessages || []), newMsg],
              updatedAt: new Date().toISOString()
            }
          : o
      )
    );

    try {
      await fetch(`/api/custom-orders/${orderId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sender: 'admin', senderName: senderName || 'سرقناد قنادی' })
      });
    } catch (e) {
      console.error('Failed to send chat message for custom order:', e);
    }
  };

  const handleDeleteCustomOrder = async (id: string) => {
    setCustomOrders(prev => prev.filter(o => o.id !== id));
    try {
      await fetch(`/api/custom-orders/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete custom order:', e);
    }
  };

  // --- Backup & Restore Handlers ---

  const handleUpdateBackupSchedule = async (scheduleUpdates: Partial<BackupScheduleConfig>) => {
    setBackupSchedule(prev => ({ ...prev, ...scheduleUpdates }));
    try {
      const res = await fetch('/api/backup/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleUpdates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.schedule) setBackupSchedule(data.schedule);
      }
    } catch (e) {
      console.error('Failed to update backup schedule on server:', e);
    }
  };

  const handleCreateBackupSnapshot = async (customName?: string): Promise<BackupSnapshot | null> => {
    try {
      const res = await fetch('/api/backup/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.snapshot) {
          setBackupSnapshots(prev => [data.snapshot, ...prev]);
          return data.snapshot;
        }
      }
    } catch (e) {
      console.error('Failed to create snapshot on server:', e);
    }
    return null;
  };

  const handleRestoreBackupSnapshot = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/backup/snapshots/${id}/restore`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh all local states
        const snap = backupSnapshots.find(s => s.id === id);
        if (snap?.payload?.data) {
          const d = snap.payload.data;
          if (d.products) setProducts(d.products);
          if (d.orders) setOrders(d.orders);
          if (d.customOrders) setCustomOrders(d.customOrders);
          if (d.customers) setCustomers(d.customers);
          if (d.walletTransactions) setWalletTransactions(d.walletTransactions);
          if (d.discounts) setDiscounts(d.discounts);
          if (d.supportTickets) setSupportTickets(d.supportTickets);
          if (d.botSettings) setBotSettings(d.botSettings);
        }
        alert(data.message || 'بازیابی با موفقیت انجام شد.');
        return true;
      }
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
    }
    return false;
  };

  const handleDeleteBackupSnapshot = async (id: string): Promise<boolean> => {
    setBackupSnapshots(prev => prev.filter(s => s.id !== id));
    try {
      const res = await fetch(`/api/backup/snapshots/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to delete snapshot:', e);
    }
    return false;
  };

  const handleImportBackup = async (payload: MasterBackupPayload, mode: 'overwrite' | 'merge'): Promise<boolean> => {
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, mode })
      });
      if (res.ok) {
        const data = await res.json();
        const d = payload.data;
        if (mode === 'overwrite') {
          if (d.products) setProducts(d.products);
          if (d.orders) setOrders(d.orders);
          if (d.customOrders) setCustomOrders(d.customOrders);
          if (d.customers) setCustomers(d.customers);
          if (d.walletTransactions) setWalletTransactions(d.walletTransactions);
          if (d.discounts) setDiscounts(d.discounts);
          if (d.supportTickets) setSupportTickets(d.supportTickets);
          if (d.botSettings) setBotSettings(d.botSettings);
        } else {
          // Merge
          if (d.products) {
            setProducts(prev => {
              const ids = new Set(prev.map(p => p.id));
              const toAdd = d.products.filter(p => !ids.has(p.id));
              return [...toAdd, ...prev];
            });
          }
          if (d.orders) {
            setOrders(prev => {
              const ids = new Set(prev.map(o => o.id));
              const toAdd = d.orders.filter(o => !ids.has(o.id));
              return [...toAdd, ...prev];
            });
          }
          if (d.customOrders) {
            setCustomOrders(prev => {
              const ids = new Set(prev.map(o => o.id));
              const toAdd = d.customOrders!.filter(o => !ids.has(o.id));
              return [...toAdd, ...prev];
            });
          }
          if (d.customers) {
            setCustomers(prev => {
              const ids = new Set(prev.map(c => c.id));
              const toAdd = d.customers.filter(c => !ids.has(c.id));
              return [...toAdd, ...prev];
            });
          }
          if (d.walletTransactions) {
            setWalletTransactions(prev => {
              const ids = new Set(prev.map(w => w.id));
              const toAdd = d.walletTransactions.filter(w => !ids.has(w.id));
              return [...toAdd, ...prev];
            });
          }
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to import backup payload:', e);
    }
    return false;
  };

  const handleAdjustWallet = async (customerId: string, amount: number, description: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/wallet-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          setCustomers(prev => prev.map(c => c.id === customerId ? data.customer : c));
        }
        if (data.transaction) {
          setWalletTransactions(prev => [data.transaction, ...prev]);
        }
      }
    } catch (e) {
      console.error('Failed to adjust wallet:', e);
    }
  };

  return (
    <div 
      dir="rtl" 
      className="min-h-screen flex font-sans bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950"
    >
      
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        botSettings={botSettings}
        ordersCount={orders.filter(o => o.status === 'paid_checking' || o.status === 'baking').length}
        productsCount={products.length}
        customOrdersCount={customOrders.length}
        pendingCustomOrdersCount={customOrders.filter(o => o.status === 'pending_review').length}
        discountsCount={discounts.filter(d => d.isActive).length}
        openTicketsCount={supportTickets.filter(t => t.status === 'open').length}
        simulatorRole={simulatorRole}
        setSimulatorRole={setSimulatorRole}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
        sidebarExpanded ? 'mr-64' : 'mr-16'
      }`}>
        <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        {activeTab === 'simulator' && (
          <TelegramSimulator
            products={products}
            orders={orders}
            customOrders={customOrders}
            discounts={discounts}
            botSettings={botSettings}
            role={simulatorRole}
            setRole={setSimulatorRole}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddDiscount={handleAddDiscount}
            onUpdateDiscount={handleUpdateDiscount}
            onDeleteDiscount={handleDeleteDiscount}
            onCreateOrder={handleCreateOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onAddCustomOrder={handleAddCustomOrder}
            onQuoteCustomOrder={handleQuoteCustomOrder}
            onUpdateCustomOrderStatus={handleUpdateCustomOrderStatus}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'products' && (
          <ProductManager
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'orders' && (
          <OrderManager
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {activeTab === 'custom_orders' && (
          <CustomPastryManager
            customOrders={customOrders}
            onAddCustomOrder={handleAddCustomOrder}
            onUpdateStatus={handleUpdateCustomOrderStatus}
            onQuotePrice={handleQuoteCustomOrder}
            onSendChatMessage={handleSendCustomOrderChatMessage}
            onDeleteOrder={handleDeleteCustomOrder}
          />
        )}

        {activeTab === 'support' && (
          <SupportManager
            tickets={supportTickets}
            botSettings={botSettings}
            onAddTicket={handleAddSupportTicket}
            onReplyTicket={handleReplySupportTicket}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onDeleteTicket={handleDeleteSupportTicket}
          />
        )}

        {activeTab === 'texts' && (
          <BotTextsCustomizer
            settings={botSettings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'discounts' && (
          <DiscountManager
            discounts={discounts}
            orders={orders}
            onAddDiscount={handleAddDiscount}
            onUpdateDiscount={handleUpdateDiscount}
            onDeleteDiscount={handleDeleteDiscount}
          />
        )}

        {activeTab === 'analytics' && (
          <SalesAnalytics
            products={products}
            orders={orders}
          />
        )}

        {activeTab === 'backup' && (
          <BackupManager
            products={products}
            orders={orders}
            customers={customers}
            walletTransactions={walletTransactions}
            discounts={discounts}
            supportTickets={supportTickets}
            botSettings={botSettings}
            backupSchedule={backupSchedule}
            backupSnapshots={backupSnapshots}
            onUpdateSchedule={handleUpdateBackupSchedule}
            onCreateSnapshot={handleCreateBackupSnapshot}
            onRestoreSnapshot={handleRestoreBackupSnapshot}
            onDeleteSnapshot={handleDeleteBackupSnapshot}
            onImportBackup={handleImportBackup}
            onAdjustWallet={handleAdjustWallet}
          />
        )}

        {activeTab === 'settings' && (
          <BotSettingsComponent
            settings={botSettings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager
            customers={customers}
            walletTransactions={walletTransactions}
            onAdjustWallet={handleAdjustWallet}
          />
        )}
        </main>

        {/* App Footer */}
        <footer className="border-t border-slate-800 bg-slate-900/80 py-4 text-center text-xs text-slate-500">
          <p>
            سامانه هوشمند ربات تلگرام قنادی و شیرینی‌پزی • با پشتیبانی از دکمه‌های شیشه‌ای و اتصال به Bot API تلگرام
          </p>
        </footer>
      </div>

    </div>
  );
}
