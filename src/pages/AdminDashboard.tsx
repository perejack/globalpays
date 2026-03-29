import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Wallet, Bell, ArrowLeft, Search, Plus, Minus, Edit3,
  Trash2, Send, X, Check, ChevronDown, ChevronRight, TrendingUp,
  TrendingDown, DollarSign, CreditCard, Activity, Shield, LogOut,
  MoreVertical, Filter, Download, RefreshCw, AlertCircle, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Settings, Sparkles,
  BarChart3, PieChartIcon, LineChart, Menu, ChevronLeft, Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, type Profile, type Transaction as DbTransaction, type Notification as DbNotification } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  balance: number;
  currency: string;
  status: "active" | "suspended" | "pending";
  joinedAt: string;
  lastActive: string;
}

interface Transaction {
  id: string;
  userId: string;
  userName?: string;
  name: string;
  type: "sent" | "received";
  amount: number;
  currency: string;
  date: string;
  avatar: string;
  status: "completed" | "pending" | "failed";
  description?: string;
  timestamp?: number;
}

interface Notification {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "transaction";
  read: boolean;
  createdAt: string;
}

// Simple Chart Components
const BarChart = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((val, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(val / max) * 100}%` }}
          transition={{ duration: 0.5, delay: i * 0.05 }}
          className={`flex-1 rounded-t-lg ${color}`}
        />
      ))}
    </div>
  );
};

const DonutChart = ({ segments }: { segments: { label: string; value: number; color: string }[] }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let currentAngle = 0;
  
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {segments.map((segment, i) => {
          const angle = (segment.value / total) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          const endAngle = currentAngle;
          
          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArc = angle > 180 ? 1 : 0;
          
          return (
            <motion.path
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={segment.color}
              stroke="rgba(15, 23, 42, 0.8)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{total}</p>
          <p className="text-[10px] text-slate-400">Total</p>
        </div>
      </div>
    </div>
  );
};

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "transactions" | "notifications">("dashboard");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [balanceChange, setBalanceChange] = useState({ amount: "", type: "add" as "add" | "reduce" });
  const [newTransaction, setNewTransaction] = useState({
    name: "",
    type: "received" as "sent" | "received",
    amount: "",
    description: ""
  });
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "success" | "warning" | "transaction"
  });
  const [newDeposit, setNewDeposit] = useState({
    amount: "",
    description: "",
    senderName: "Bank Transfer"
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Fetch data from Supabase
  useEffect(() => {
    console.log('useEffect triggered - starting fetchData');
    
    // Safety timeout - force loading to false after 5 seconds
    const timeoutId = setTimeout(() => {
      console.log('Safety timeout triggered - forcing isLoading to false');
      setIsLoading(false);
    }, 5000);
    
    fetchData().then(() => {
      clearTimeout(timeoutId);
    });
    
    return () => clearTimeout(timeoutId);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    console.log('Starting fetchData...');
    try {
      // Fetch users (profiles)
      console.log('Fetching profiles...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }

      console.log('Fetched profiles:', profilesData);

      // Map profiles to users (without email for now)
      const mappedUsers: User[] = (profilesData || []).map((profile: Profile) => {
        const balance = typeof profile.balance === 'string' ? parseFloat(profile.balance) : (profile.balance || 0);
        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: 'N/A',
          avatar: profile.avatar || profile.name?.substring(0, 2).toUpperCase() || 'UN',
          balance: balance,
          currency: 'USD',
          status: profile.status || 'active',
          joinedAt: profile.joined_at ? new Date(profile.joined_at).toLocaleDateString() : 'N/A',
          lastActive: profile.last_active ? new Date(profile.last_active).toLocaleDateString() : 'Never'
        };
      });

      console.log('Mapped users:', mappedUsers);
      setUsers(mappedUsers);

      // Fetch transactions
      console.log('Fetching transactions...');
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (transactionsError) {
        console.error('Transactions error:', transactionsError);
        throw transactionsError;
      }

      const mappedTransactions: Transaction[] = (transactionsData || []).map((t: DbTransaction) => ({
        id: t.id,
        userId: t.user_id,
        userName: mappedUsers.find(u => u.id === t.user_id)?.name,
        name: t.name,
        type: t.type,
        amount: t.amount,
        currency: 'USD',
        date: t.date,
        avatar: t.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'UN',
        status: t.status,
        description: t.description,
        timestamp: t.timestamp
      }));

      console.log('Mapped transactions:', mappedTransactions);
      setTransactions(mappedTransactions);

      // Fetch notifications
      console.log('Fetching notifications...');
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Notifications error:', notificationsError);
        throw notificationsError;
      }

      const mappedNotifications: Notification[] = (notificationsData || []).map((n: DbNotification) => ({
        id: n.id,
        userId: n.user_id,
        userName: mappedUsers.find(u => u.id === n.user_id)?.name,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'
      }));

      console.log('Mapped notifications:', mappedNotifications);
      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      console.log('fetchData complete, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === "active").length;
  const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);

  // Filter users
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter transactions for selected user
  const userTransactions = selectedUser
    ? transactions.filter(t => t.userId === selectedUser.id)
    : [];

  // Handle balance update
  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceChange.amount) return;
    const amount = parseFloat(balanceChange.amount);
    const currentBalance = selectedUser.balance;
    const newBalance = balanceChange.type === "add" 
      ? currentBalance + amount 
      : Math.max(0, currentBalance - amount);
    
    console.log('Balance update:', { currentBalance, amount, newBalance, userId: selectedUser.id });
    
    try {
      // Update profile in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        toast.error(`Failed to update: ${error.message}`);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No rows returned from update - checking if RLS is blocking');
        toast.error('Update may have been blocked. Check admin permissions.');
        return;
      }

      // Create transaction record
      const transaction: Omit<DbTransaction, 'id'> = {
        user_id: selectedUser.id,
        name: balanceChange.type === "add" ? "Balance Added" : "Balance Reduced",
        description: `Admin ${balanceChange.type === "add" ? "added" : "reduced"} $${amount}`,
        amount: balanceChange.type === "add" ? amount : -amount,
        type: balanceChange.type === "add" ? "received" : "sent",
        status: "completed",
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
        timestamp: Date.now(),
        category: 'admin_adjustment'
      };

      const { error: transError } = await supabase
        .from('transactions')
        .insert(transaction);

      if (transError) {
        console.error('Transaction insert error:', transError);
        throw transError;
      }

      // Update local state immediately for better UX
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === selectedUser.id ? { ...u, balance: newBalance } : u
      ));

      // Refresh data from server
      await fetchData();
      
      setShowBalanceModal(false);
      setBalanceChange({ amount: "", type: "add" });
      toast.success(`Balance ${balanceChange.type === "add" ? "added" : "reduced"} successfully`);
    } catch (error: any) {
      console.error('Error updating balance:', error);
      toast.error(`Failed to update balance: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!selectedUser || !newDeposit.amount) return;
    const amount = parseFloat(newDeposit.amount);
    
    try {
      // Update user balance
      const newBalance = selectedUser.balance + amount;
      const { data: updateData, error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id)
        .select();

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        toast.error(`Failed to update balance: ${balanceError.message}`);
        throw balanceError;
      }

      if (!updateData || updateData.length === 0) {
        console.warn('No rows returned from deposit update - RLS may be blocking');
        toast.error('Deposit may have been blocked. Check admin permissions.');
        return;
      }
      
      // Create transaction record
      const transaction: Omit<DbTransaction, 'id'> = {
        user_id: selectedUser.id,
        name: newDeposit.senderName,
        type: "received",
        amount: amount,
        status: "completed",
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
        timestamp: Date.now(),
        category: 'deposit',
        description: newDeposit.description || "Deposit"
      };
      
      const { error: transError } = await supabase
        .from('transactions')
        .insert(transaction);

      if (transError) {
        console.error('Transaction insert error:', transError);
        throw transError;
      }
      
      // Create notification
      const notification: Omit<DbNotification, 'id'> = {
        user_id: selectedUser.id,
        title: "Deposit Received",
        message: `You received a deposit of $${amount.toFixed(2)} from ${newDeposit.senderName}`,
        type: "success",
        read: false,
        created_at: new Date().toISOString()
      };
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notification);

      if (notifError) {
        console.error('Notification insert error:', notifError);
        // Don't throw - notification failure shouldn't block the deposit
      }
      
      // Update local state immediately
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === selectedUser.id ? { ...u, balance: newBalance } : u
      ));
      
      // Refresh data
      await fetchData();
      
      setShowDepositModal(false);
      setNewDeposit({ amount: "", description: "", senderName: "Bank Transfer" });
      toast.success('Deposit completed successfully');
    } catch (error: any) {
      console.error('Error processing deposit:', error);
      toast.error(`Failed to process deposit: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle add transaction
  const handleAddTransaction = async () => {
    if (!selectedUser || !newTransaction.name || !newTransaction.amount) return;
    
    const amount = newTransaction.type === "received" 
      ? parseFloat(newTransaction.amount) 
      : -parseFloat(newTransaction.amount);
    
    try {
      // Create transaction in Supabase
      const transaction: Omit<DbTransaction, 'id'> = {
        user_id: selectedUser.id,
        name: newTransaction.name,
        type: newTransaction.type,
        amount: amount,
        status: "completed",
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
        timestamp: Date.now(),
        category: 'transfer',
        description: newTransaction.description
      };
      
      const { error: transError } = await supabase
        .from('transactions')
        .insert(transaction);

      if (transError) throw transError;
      
      // Update user balance
      const newBalance = selectedUser.balance + amount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id);

      if (balanceError) throw balanceError;
      
      // Refresh data
      await fetchData();
      
      setShowTransactionModal(false);
      setNewTransaction({ name: "", type: "received", amount: "", description: "" });
      toast.success('Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };

  // Handle edit transaction
  const handleEditTransaction = async () => {
    if (!editingTransaction) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          name: editingTransaction.name,
          description: editingTransaction.description,
          amount: editingTransaction.amount,
          type: editingTransaction.type,
          status: editingTransaction.status
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      // Refresh data
      await fetchData();
      
      setShowTransactionModal(false);
      setEditingTransaction(null);
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      // Delete from Supabase
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Reverse the balance change
      if (transaction) {
        const user = users.find(u => u.id === transaction.userId);
        if (user) {
          const newBalance = Math.max(0, user.balance - transaction.amount);
          const { error: balanceError } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', transaction.userId);

          if (balanceError) throw balanceError;
        }
      }

      // Refresh data
      await fetchData();
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  // Handle send notification
  const handleSendNotification = async () => {
    if (!selectedUser || !newNotification.title || !newNotification.message) return;
    
    try {
      const notification: Omit<DbNotification, 'id'> = {
        user_id: selectedUser.id,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        read: false,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;

      // Refresh data
      await fetchData();
      
      setShowNotificationModal(false);
      setNewNotification({ title: "", message: "", type: "info" });
      toast.success('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "suspended": return "bg-rose-500";
      case "pending": return "bg-amber-500";
      case "completed": return "bg-emerald-500";
      case "failed": return "bg-rose-500";
      default: return "bg-slate-500";
    }
  };

  // Notification type colors
  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success": return "from-emerald-500 to-teal-500";
      case "warning": return "from-amber-500 to-orange-500";
      case "transaction": return "from-violet-500 to-purple-500";
      default: return "from-blue-500 to-cyan-500";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Admin Pro</h1>
              <p className="text-[10px] text-slate-400">Superuser</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-[68px] bottom-0 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 p-4 z-50 overflow-y-auto"
            >
              {/* Mobile Navigation */}
              <nav className="space-y-2">
                {[
                  { id: "dashboard", icon: Activity, label: "Dashboard", color: "from-blue-500 to-cyan-500" },
                  { id: "users", icon: Users, label: "Users", color: "from-violet-500 to-purple-500" },
                  { id: "transactions", icon: CreditCard, label: "Transactions", color: "from-emerald-500 to-teal-500" },
                  { id: "notifications", icon: Bell, label: "Notifications", color: "from-amber-500 to-orange-500" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setSelectedUser(null); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      activeTab === item.id
                        ? "bg-gradient-to-r " + item.color + " text-white shadow-lg"
                        : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === "notifications" && notifications.filter(n => !n.read).length > 0 && (
                      <span className="ml-auto bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Mobile Bottom Section */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">Admin Mode</p>
                    <p className="text-xs text-slate-400">Full Access</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 p-6 z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-white">Admin Pro</h1>
            <p className="text-xs text-slate-400">Superuser Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {[
            { id: "dashboard", icon: Activity, label: "Dashboard", color: "from-blue-500 to-cyan-500" },
            { id: "users", icon: Users, label: "Users", color: "from-violet-500 to-purple-500" },
            { id: "transactions", icon: CreditCard, label: "Transactions", color: "from-emerald-500 to-teal-500" },
            { id: "notifications", icon: Bell, label: "Notifications", color: "from-amber-500 to-orange-500" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setSelectedUser(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeTab === item.id
                  ? "bg-gradient-to-r " + item.color + " text-white shadow-lg"
                  : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
              <span className="font-medium">{item.label}</span>
              {item.id === "notifications" && notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Admin Mode</p>
                <p className="text-xs text-slate-400">Full Access</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="mt-4 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-[68px] lg:pt-0 p-4 lg:p-8 min-h-screen">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-slate-400">Loading data...</p>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">
              {selectedUser ? (
                <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 hover:text-violet-400 transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                  {selectedUser.name}
                </button>
              ) : (
                activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
              )}
            </h2>
            <p className="text-slate-400">
              {selectedUser ? "Manage user account" : `Overview of all ${activeTab}`}
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
            {selectedUser && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDepositModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Deposit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBalanceModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/20"
                >
                  <DollarSign className="w-4 h-4" />
                  Edit Balance
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTransactionModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium shadow-lg shadow-violet-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowNotificationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                  Send Notification
                </motion.button>
              </>
            )}
            
            {!selectedUser && activeTab === "users" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-80 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
            )}
          </div>

          {/* Mobile Actions Button */}
          {selectedUser && (
            <div className="lg:hidden relative">
              <button
                onClick={() => setShowMobileActions(!showMobileActions)}
                className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showMobileActions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <button
                      onClick={() => { setShowDepositModal(true); setShowMobileActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">Deposit</span>
                    </button>
                    <button
                      onClick={() => { setShowBalanceModal(true); setShowMobileActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">Edit Balance</span>
                    </button>
                    <button
                      onClick={() => { setShowTransactionModal(true); setShowMobileActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">Add Transaction</span>
                    </button>
                    <button
                      onClick={() => { setShowNotificationModal(true); setShowMobileActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                        <Send className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">Send Notification</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mobile Search */}
          {!selectedUser && activeTab === "users" && (
            <div className="lg:hidden relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-40 sm:w-56 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          )}
        </header>

        {/* Dashboard View with All Users Activity */}
        {!selectedUser && activeTab === "dashboard" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
              {[
                { label: "Total Users", value: totalUsers.toString(), icon: Users, change: "+12%", color: "from-violet-500 to-purple-500" },
                { label: "Active Users", value: activeUsers.toString(), icon: Activity, change: "+8%", color: "from-emerald-500 to-teal-500" },
                { label: "Total Balance", value: `$${totalBalance.toLocaleString()}`, icon: Wallet, change: "+23%", color: "from-blue-500 to-cyan-500" },
                { label: "Total Transactions", value: transactions.length.toString(), icon: CreditCard, change: "+45%", color: "from-amber-500 to-orange-500" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm hover:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2 lg:mb-4">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <span className="text-[10px] lg:text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-xl lg:text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-xs lg:text-sm text-slate-400">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Transaction Volume Chart */}
              <motion.div
                variants={itemVariants}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Transaction Volume</h3>
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
                <BarChart 
                  data={[12, 19, 15, 25, 22, 30, 28]} 
                  color="bg-gradient-to-t from-violet-500 to-fuchsia-500" 
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </motion.div>

              {/* User Status Distribution */}
              <motion.div
                variants={itemVariants}
                className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">User Status</h3>
                  <PieChartIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <DonutChart 
                    segments={[
                      { label: "Active", value: activeUsers, color: "#10b981" },
                      { label: "Suspended", value: users.filter(u => u.status === "suspended").length, color: "#f43f5e" },
                      { label: "Pending", value: users.filter(u => u.status === "pending").length, color: "#f59e0b" },
                    ]} 
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-400">Active ({activeUsers})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-xs text-slate-400">Suspended ({users.filter(u => u.status === "suspended").length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs text-slate-400">Pending ({users.filter(u => u.status === "pending").length})</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                variants={itemVariants}
                className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
              >
                <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Total Sent</span>
                    <span className="text-rose-400 font-semibold">
                      -${Math.abs(transactions.filter(t => t.type === "sent").reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Total Received</span>
                    <span className="text-emerald-400 font-semibold">
                      +${transactions.filter(t => t.type === "received").reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Avg Transaction</span>
                    <span className="text-white font-semibold">
                      ${transactions.length > 0 ? (transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Completed</span>
                    <span className="text-emerald-400 font-semibold">
                      {transactions.filter(t => t.status === "completed").length} / {transactions.length}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* All Users Recent Activity */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg lg:text-xl font-semibold text-white">All Users Activity</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs lg:text-sm text-slate-400">Live updates</span>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-emerald-500"
                  />
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  transactions
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 lg:p-4 rounded-lg lg:rounded-xl bg-slate-900/50 border border-slate-800/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-slate-700/50 transition-all"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 ${
                          transaction.type === "received"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}>
                          {transaction.type === "received" ? (
                            <ArrowDownLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="font-medium text-white text-sm lg:text-base">{transaction.name}</p>
                            <span className="text-xs text-slate-500">•</span>
                            <p className="text-xs text-violet-400">{transaction.userName || users.find(u => u.id === transaction.userId)?.name}</p>
                          </div>
                          <p className="text-xs lg:text-sm text-slate-400">{transaction.description || transaction.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <p className={`font-semibold text-sm lg:text-base ${transaction.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">{transaction.date}</p>
                        </div>
                        <div className="flex items-center gap-1 lg:gap-2">
                          <button
                            onClick={() => { setEditingTransaction(transaction); setShowTransactionModal(true); }}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-violet-400 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Users List */}
        {!selectedUser && activeTab === "users" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                variants={itemVariants}
                onClick={() => setSelectedUser(user)}
                className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm hover:border-violet-500/30 hover:bg-slate-800/50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-base lg:text-lg shadow-lg flex-shrink-0">
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                      <h3 className="font-semibold text-base lg:text-lg text-white truncate">{user.name}</h3>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(user.status)} flex-shrink-0`} />
                      <span className="text-[10px] lg:text-xs text-slate-400 uppercase">{user.status}</span>
                    </div>
                    <p className="text-xs lg:text-sm text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-base lg:text-lg text-white">${user.balance.toLocaleString()}</p>
                    <p className="text-[10px] lg:text-xs text-slate-400">{user.lastActive}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* User Detail View */}
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 lg:space-y-6"
          >
            {/* User Info Card */}
            <div className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl lg:text-2xl shadow-xl flex-shrink-0">
                  {selectedUser.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-1">{selectedUser.name}</h3>
                  <p className="text-slate-400 mb-2 lg:mb-3 text-sm lg:text-base">{selectedUser.email}</p>
                  <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                    <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                      selectedUser.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      selectedUser.status === "suspended" ? "bg-rose-500/20 text-rose-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {selectedUser.status.toUpperCase()}
                    </span>
                    <span className="text-xs lg:text-sm text-slate-500">Joined: {selectedUser.joinedAt}</span>
                    <span className="text-xs lg:text-sm text-slate-500">Last active: {selectedUser.lastActive}</span>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs lg:text-sm text-slate-400 mb-1">Current Balance</p>
                  <p className="text-2xl lg:text-4xl font-bold text-white">${selectedUser.balance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div>
              <h4 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4">Recent Activity</h4>
              <div className="space-y-3">
                {userTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  userTransactions.map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 lg:p-4 rounded-lg lg:rounded-xl bg-slate-900/50 border border-slate-800/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 group hover:border-slate-700/50 transition-all"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 ${
                          transaction.type === "received"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}>
                          {transaction.type === "received" ? (
                            <ArrowDownLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm lg:text-base">{transaction.name}</p>
                          <p className="text-xs lg:text-sm text-slate-400">{transaction.description || transaction.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <p className={`font-semibold text-sm lg:text-base ${transaction.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">{transaction.date}</p>
                        </div>
                        <div className="flex items-center gap-1 lg:gap-2">
                          <button
                            onClick={() => { setEditingTransaction(transaction); setShowTransactionModal(true); }}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-violet-400 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div>
              <h4 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4">Notifications</h4>
              <div className="space-y-3">
                {notifications.filter(n => n.userId === selectedUser.id).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No notifications sent yet</p>
                  </div>
                ) : (
                  notifications.filter(n => n.userId === selectedUser.id).map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 lg:p-4 rounded-lg lg:rounded-xl bg-gradient-to-r ${getNotificationColor(notification.type)} bg-opacity-10 border border-white/10`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-white" /> :
                           notification.type === "warning" ? <AlertCircle className="w-5 h-5 text-white" /> :
                           <Bell className="w-5 h-5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm lg:text-base">{notification.title}</p>
                          <p className="text-xs lg:text-sm text-white/70">{notification.message}</p>
                          <p className="text-xs text-white/50 mt-1">{notification.createdAt}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${notification.read ? "bg-white/20 text-white/70" : "bg-white text-slate-900 font-medium"}`}>
                          {notification.read ? "Read" : "Unread"}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Transactions Tab */}
        {!selectedUser && activeTab === "transactions" && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3 lg:space-y-4">
            {transactions.map((t) => (
              <motion.div
                key={t.id}
                variants={itemVariants}
                className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 ${
                      t.type === "received" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {t.type === "received" ? <ArrowDownLeft className="w-4 h-4 lg:w-5 lg:h-5" /> : <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm lg:text-base">{t.name}</p>
                      <p className="text-xs lg:text-sm text-slate-400 truncate">{t.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <p className={`font-semibold text-sm lg:text-base ${t.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">{t.date}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Notifications Tab */}
        {!selectedUser && activeTab === "notifications" && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3 lg:space-y-4">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                variants={itemVariants}
                className={`p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-gradient-to-r ${getNotificationColor(n.type)} bg-opacity-10 border border-white/10`}
              >
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    {n.type === "success" ? <CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> :
                     n.type === "warning" ? <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> :
                     <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm lg:text-base">{n.title}</p>
                    <p className="text-xs lg:text-sm text-white/70">{n.message}</p>
                    <p className="text-xs text-white/50 mt-2">User: {users.find(u => u.id === n.userId)?.name} • {n.createdAt}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        </>
        )}
      </main>

      {/* Balance Modal */}
      <AnimatePresence>
        {showBalanceModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-bold text-white">Edit Balance</h3>
                <button onClick={() => setShowBalanceModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4 lg:mb-6 p-3 lg:p-4 rounded-lg lg:rounded-xl bg-slate-800/50">
                <p className="text-xs lg:text-sm text-slate-400 mb-1">Current Balance</p>
                <p className="text-2xl lg:text-3xl font-bold text-white">${selectedUser.balance.toLocaleString()}</p>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setBalanceChange(prev => ({ ...prev, type: "add" }))}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                    balanceChange.type === "add"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-1 lg:mr-2" />
                  Add
                </button>
                <button
                  onClick={() => setBalanceChange(prev => ({ ...prev, type: "reduce" }))}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                    balanceChange.type === "reduce"
                      ? "bg-rose-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Minus className="w-4 h-4 inline mr-1 lg:mr-2" />
                  Reduce
                </button>
              </div>

              <div className="mb-4 lg:mb-6">
                <label className="block text-xs lg:text-sm text-slate-400 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  value={balanceChange.amount}
                  onChange={(e) => setBalanceChange(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-base"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBalanceUpdate}
                  disabled={!balanceChange.amount}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTransactionModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-bold text-white">
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
                </h3>
                <button onClick={() => { setShowTransactionModal(false); setEditingTransaction(null); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Sender/Receiver Name</label>
                  <input
                    type="text"
                    value={editingTransaction ? editingTransaction.name : newTransaction.name}
                    onChange={(e) => editingTransaction
                      ? setEditingTransaction({ ...editingTransaction, name: e.target.value })
                      : setNewTransaction({ ...newTransaction, name: e.target.value })
                    }
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-base"
                  />
                </div>

                {!editingTransaction && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewTransaction(prev => ({ ...prev, type: "received" }))}
                      className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                        newTransaction.type === "received"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4 inline mr-1" />
                      Received
                    </button>
                    <button
                      onClick={() => setNewTransaction(prev => ({ ...prev, type: "sent" }))}
                      className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                        newTransaction.type === "sent"
                          ? "bg-rose-500 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4 inline mr-1" />
                      Sent
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    value={editingTransaction ? Math.abs(editingTransaction.amount) : newTransaction.amount}
                    onChange={(e) => editingTransaction
                      ? setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })
                      : setNewTransaction({ ...newTransaction, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={editingTransaction ? editingTransaction.description : newTransaction.description}
                    onChange={(e) => editingTransaction
                      ? setEditingTransaction({ ...editingTransaction, description: e.target.value })
                      : setNewTransaction({ ...newTransaction, description: e.target.value })
                    }
                    placeholder="e.g. Payment for services"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-base"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4 lg:mt-6">
                <button
                  onClick={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTransaction ? handleEditTransaction : handleAddTransaction}
                  disabled={editingTransaction ? !editingTransaction.name : (!newTransaction.name || !newTransaction.amount)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {editingTransaction ? "Save Changes" : "Add Transaction"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-bold text-white">Send Notification</h3>
                <button onClick={() => setShowNotificationModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-slate-800/50">
                <p className="text-xs lg:text-sm text-slate-400">Sending to:</p>
                <p className="font-medium text-white text-sm lg:text-base truncate">{selectedUser.name} ({selectedUser.email})</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["info", "success", "warning", "transaction"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewNotification(prev => ({ ...prev, type: type as any }))}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        newNotification.type === type
                          ? type === "info" ? "bg-blue-500 text-white" :
                            type === "success" ? "bg-emerald-500 text-white" :
                            type === "warning" ? "bg-amber-500 text-white" :
                            "bg-violet-500 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Payment Received"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Message</label>
                  <textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter notification message..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none text-base"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4 lg:mt-6">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={!newNotification.title || !newNotification.message}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-bold text-white">Make Deposit</h3>
                <button onClick={() => setShowDepositModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 lg:mb-6 p-3 lg:p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <p className="text-xs lg:text-sm text-blue-400 mb-1">Deposit to</p>
                <p className="font-semibold text-white text-sm lg:text-base">{selectedUser.name}</p>
                <p className="text-xs lg:text-sm text-slate-400">Current Balance: ${selectedUser.balance.toLocaleString()}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                    <input
                      type="number"
                      value={newDeposit.amount}
                      onChange={(e) => setNewDeposit(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">From (Sender Name)</label>
                  <input
                    type="text"
                    value={newDeposit.senderName}
                    onChange={(e) => setNewDeposit(prev => ({ ...prev, senderName: e.target.value }))}
                    placeholder="e.g. Bank Transfer, PayPal, etc."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs lg:text-sm text-slate-400 mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    value={newDeposit.description}
                    onChange={(e) => setNewDeposit(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Salary payment, Refund, etc."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4 lg:mt-6">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={!newDeposit.amount}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
