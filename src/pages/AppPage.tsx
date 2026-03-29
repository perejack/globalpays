import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Send, ArrowDownToLine, CreditCard,
  Bell, Search, Plus, ArrowUpRight, ArrowDownLeft,
  Globe, Zap, ChevronRight, QrCode, Users, Wallet, TrendingUp,
  ArrowUp, ArrowDown, Eye, EyeOff, Banknote, X, Phone, DollarSign,
  Loader2, AlertTriangle, Mail, LogOut, Copy
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, type Transaction as DbTransaction } from "@/lib/supabase";
import { toast } from "sonner";
import cardBg from "@/assets/card-bg.jpg";
import globalPayLogo from "@/assets/globalpay-logo.png";
import { initiateSTKPush, pollTransactionStatus, isValidPhoneNumber, convertKesToUsd } from "@/lib/hashback-api";

type TabKey = "home" | "send" | "receive" | "cards" | "withdraw";

const KSH_RATE = 129.50;

// Exchange rates (USD base)
const EXCHANGE_RATES = {
  USD: { rate: 1, symbol: '$', name: 'US Dollar' },
  KSH: { rate: 129.50, symbol: 'KSh', name: 'Kenyan Shilling' },
  EUR: { rate: 0.85, symbol: '€', name: 'Euro' },
  GBP: { rate: 0.73, symbol: '£', name: 'British Pound' },
};

const WHATSAPP_URL = "https://wa.me/254748479739?text=Hello%20GlobalPay%20Support%2C%20I%20need%20assistance%20with%20my%20withdrawal.";
const GMAIL_ICON = "https://images.icon-icons.com/2642/PNG/512/google_mail_gmail_logo_icon_159346.png";
const WHATSAPP_ICON = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpQY6_HwS0r6Q3Si502YwVbrwK8RNF9iJmNg&s";

// Local transaction type for UI
interface Transaction {
  id: string;
  name: string;
  type: "sent" | "received";
  amount: number;
  currency: string;
  date: string;
  avatar: string;
  status: "completed" | "pending" | "failed";
  description?: string;
}

const quickActions = [
  { icon: Send, label: "Send", color: "from-[hsl(12,90%,62%)] to-[hsl(340,80%,58%)]" },
  { icon: ArrowDownToLine, label: "Receive", color: "from-[hsl(172,50%,45%)] to-[hsl(200,70%,50%)]" },
  { icon: QrCode, label: "QR Pay", color: "from-[hsl(262,70%,58%)] to-[hsl(290,60%,55%)]" },
  { icon: Users, label: "Split", color: "from-[hsl(30,80%,55%)] to-[hsl(12,90%,62%)]" },
];

const currencies = [
  { code: "USD", name: "US Dollar", balance: 0, symbol: "$", gradient: "from-[hsl(145,60%,45%)] to-[hsl(160,70%,40%)]", textColor: "text-[hsl(145,60%,35%)]", bgColor: "bg-[hsl(145,60%,95%)]" },
  { code: "EUR", name: "Euro", balance: 0, symbol: "€", gradient: "from-[hsl(220,80%,55%)] to-[hsl(240,70%,50%)]", textColor: "text-[hsl(220,80%,45%)]", bgColor: "bg-[hsl(220,80%,95%)]" },
  { code: "KSH", name: "Kenyan Shilling", balance: 0, symbol: "KSh", gradient: "from-[hsl(12,90%,55%)] to-[hsl(340,80%,50%)]", textColor: "text-[hsl(12,90%,45%)]", bgColor: "bg-[hsl(12,90%,95%)]" },
];


/* ========== WITHDRAW MODAL ========== */
const WithdrawModal = ({ isOpen, onClose, balance, userName }: { isOpen: boolean; onClose: () => void; balance: number; userName: string }) => {
  const [step, setStep] = useState<"method" | "details" | "loading" | "paused">("method");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const methods = [
    { id: "bank", name: "Bank Transfer", desc: "1-3 business days", icon: "🏦", isImage: false, placeholder: "Enter bank account number" },
    { id: "mpesa", name: "M-Pesa", desc: "Instant withdrawal", icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRBTlNLjv9zJWMLXLA1DH_F5lfyV957_3G2g&s", isImage: true, placeholder: "Enter M-Pesa phone number" },
    { id: "airtel", name: "Airtel Money", desc: "Instant transfer", icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbtnOWST4RtneU4tHYLmaG4Z2ejYQe6Qhq8w&s", isImage: true, placeholder: "Enter Airtel number" },
    { id: "cashapp", name: "Cash App", desc: "Instant to Cash App", icon: "💵", isImage: false, placeholder: "Enter Cash App $tag" },
  ];

  useEffect(() => {
    if (!isOpen) {
      setStep("method");
      setSelectedMethod(null);
      setAccountNumber("");
      setWithdrawAmount("");
    }
  }, [isOpen]);

  const handleWithdraw = () => {
    setStep("loading");
    setTimeout(() => {
      setStep("paused");
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl"
        >
          {/* Handle bar */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4 sm:hidden" />

          {step === "method" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-foreground">Withdraw Funds</h2>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Balance display with KSH */}
              <div className="rounded-2xl bg-gradient-to-r from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] p-4 text-white">
                <p className="text-xs font-medium text-white/70">Withdrawable Balance</p>
                <p className="text-2xl font-display font-bold">${balance.toLocaleString()}</p>
                <p className="text-sm text-[hsl(145,70%,55%)] mt-0.5">≈ KSh {(balance * KSH_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (USD)</label>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-display text-muted-foreground">$</span>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-muted text-xl font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {withdrawAmount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ KSh {(parseFloat(withdrawAmount || "0") * KSH_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Method</p>
              <div className="space-y-2">
                {methods.map((m) => (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedMethod(m.id); setStep("details"); }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    {m.isImage ? (
                      <img src={m.icon} alt={m.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="text-2xl">{m.icon}</span>
                    )}
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "details" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("method")} className="text-sm font-medium text-primary">← Back</button>
                <h2 className="text-xl font-display font-bold text-foreground">
                  {methods.find(m => m.id === selectedMethod)?.name}
                </h2>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {methods.find(m => m.id === selectedMethod)?.placeholder?.replace("Enter ", "")}
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={methods.find(m => m.id === selectedMethod)?.placeholder}
                  className="w-full px-4 py-3.5 rounded-2xl bg-muted text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {withdrawAmount && (
                <div className="rounded-2xl bg-muted p-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-foreground">${parseFloat(withdrawAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">KSH Equivalent</span>
                    <span className="font-semibold text-[hsl(12,90%,45%)]">KSh {(parseFloat(withdrawAmount || "0") * KSH_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-semibold text-foreground">$0.00</span>
                  </div>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleWithdraw}
                disabled={!accountNumber}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(262,70%,58%)] to-[hsl(220,80%,55%)] text-white font-semibold text-lg disabled:opacity-50 shadow-lg transition-all"
              >
                Withdraw Now
              </motion.button>
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary"
              />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-display font-bold text-foreground">Transferring Funds</h3>
                <p className="text-sm text-muted-foreground">Please wait while we process your withdrawal...</p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === "paused" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 space-y-5">
              <div className="flex flex-col items-center text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="w-16 h-16 rounded-full bg-[hsl(30,90%,95%)] flex items-center justify-center"
                >
                  <AlertTriangle className="w-8 h-8 text-[hsl(30,90%,50%)]" />
                </motion.div>
                <h3 className="text-xl font-display font-bold text-foreground">Transfer Paused</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  To complete your withdrawal, you need to have funded your wallet at least once. Please top up your account to enable withdrawals.
                </p>
              </div>

              {/* Contact Support */}
              <div className="rounded-2xl bg-gradient-to-br from-[hsl(220,80%,97%)] to-[hsl(262,70%,97%)] border border-[hsl(220,80%,90%)] p-5 space-y-4">
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-sm">Contact Support</p>
                  <p className="text-xs text-muted-foreground mt-1">For instant withdrawal assistance</p>
                </div>
                <div className="flex gap-3">
                  <motion.a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white font-semibold text-sm shadow-lg transition-all"
                  >
                    <img src={WHATSAPP_ICON} alt="WhatsApp" className="w-5 h-5 rounded" />
                    WhatsApp
                  </motion.a>
                  <motion.a
                    href="mailto:support@globalpay.com"
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-white hover:bg-muted border border-border text-foreground font-semibold text-sm shadow-sm transition-all"
                  >
                    <img src={GMAIL_ICON} alt="Gmail" className="w-5 h-5" />
                    Email
                  </motion.a>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
              >
                Close
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ========== TOP UP MODAL ========== */
const TopUpModal = ({ isOpen, onClose, onTopUpSuccess, userId, currentBalance }: { isOpen: boolean; onClose: () => void; onTopUpSuccess: () => void; userId: string; currentBalance: number }) => {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [usdAmount, setUsdAmount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setPhone("");
      setAmount("");
      setErrorMessage("");
      setUsdAmount(0);
    }
  }, [isOpen]);

  const handleTopUp = async () => {
    if (!isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid M-Pesa phone number (e.g., 0712345678)");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const kesAmount = parseFloat(amount);
    const usdEquivalent = convertKesToUsd(kesAmount);
    setUsdAmount(usdEquivalent);
    setStep("processing");

    try {
      // Generate unique reference
      const reference = `TOPUP-${userId.slice(0, 8)}-${Date.now()}`;

      // Create pending transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          name: "M-Pesa Top Up",
          description: `Top up via M-Pesa - KSh ${kesAmount.toLocaleString()}`,
          amount: usdEquivalent,
          type: 'received',
          status: 'pending',
          date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
          timestamp: Date.now(),
          category: 'topup',
          reference: reference
        })
        .select()
        .single();

      if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);

      // Initiate STK Push
      const response = await initiateSTKPush(String(kesAmount), phone, reference);

      if (!response.CheckoutRequestID) {
        throw new Error(response.ResponseDescription || "Failed to initiate STK Push");
      }

      // Poll for transaction status
      const pollResult = await pollTransactionStatus(response.CheckoutRequestID, 30, 3000);

      if (pollResult.ResultCode === "0") {
        // Payment successful - update transaction status
        const { error: updateTxError } = await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', transaction.id);

        if (updateTxError) console.error('Error updating transaction:', updateTxError);

        // Update user balance
        const newBalance = currentBalance + usdEquivalent;
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

        if (balanceError) throw new Error(`Failed to update balance: ${balanceError.message}`);

        // Success!
        setStep("success");
        toast.success(`Top up successful! $${usdEquivalent.toFixed(2)} added to your wallet`);
        onTopUpSuccess();
      } else {
        // Payment failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        throw new Error(pollResult.ResultDesc || "Payment failed or was cancelled");
      }
    } catch (error: any) {
      console.error('Top up error:', error);
      setErrorMessage(error.message || "Payment failed. Please try again.");
      setStep("error");
      toast.error(error.message || "Payment failed");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4 sm:hidden" />

          {step === "form" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-foreground">Top Up via M-Pesa</h2>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-[hsl(145,60%,45%)] to-[hsl(172,50%,45%)] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">M-Pesa STK Push</p>
                    <p className="text-white/70 text-xs">You'll receive a prompt on your phone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full mt-2 px-4 py-3.5 rounded-2xl bg-muted text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(145,60%,45%)]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (KSH)</label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-display text-muted-foreground">KSh</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted text-xl font-display font-bold focus:outline-none focus:ring-2 focus:ring-[hsl(145,60%,45%)]/30"
                    />
                  </div>
                  {amount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${(parseFloat(amount || "0") / KSH_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                  )}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleTopUp}
                disabled={!phone || !amount}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(145,60%,45%)] to-[hsl(172,50%,45%)] text-white font-semibold text-lg disabled:opacity-50 shadow-lg transition-all"
              >
                Top Up
              </motion.button>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-16 h-16 rounded-full border-4 border-[hsl(145,60%,45%)]/20 border-t-[hsl(145,60%,45%)]"
              />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-display font-bold text-foreground">STK Push Sent</h3>
                <p className="text-sm text-muted-foreground">Check your phone and enter your M-Pesa PIN to complete the top up</p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-[hsl(145,60%,45%)]"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="w-20 h-20 rounded-full bg-[hsl(145,60%,95%)] flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-12 h-12 rounded-full bg-[hsl(145,60%,45%)] flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              </motion.div>
              <h3 className="text-xl font-display font-bold text-foreground">Top Up Successful!</h3>
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">KSh {parseInt(amount).toLocaleString()} paid via M-Pesa</p>
                <p className="text-lg font-semibold text-[hsl(145,60%,45%)]">${usdAmount.toFixed(2)} USD added</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[hsl(145,60%,45%)] to-[hsl(172,50%,45%)] text-white font-semibold text-sm"
              >
                Done
              </motion.button>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="w-20 h-20 rounded-full bg-[hsl(12,90%,95%)] flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-12 h-12 rounded-full bg-[hsl(12,90%,55%)] flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.div>
              </motion.div>
              <h3 className="text-xl font-display font-bold text-foreground">Payment Failed</h3>
              <p className="text-sm text-muted-foreground text-center px-4">{errorMessage}</p>
              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("form")}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[hsl(145,60%,45%)] to-[hsl(172,50%,45%)] text-white font-semibold text-sm"
                >
                  Try Again
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-2xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const AppPage = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [sendStep, setSendStep] = useState(0);
  const [sendAmount, setSendAmount] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Fetch transactions
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async (retries = 3) => {
    try {
      // Small delay to avoid concurrent lock issues with profile fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedTransactions: Transaction[] = (data || []).map((t: DbTransaction) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        amount: t.amount,
        currency: 'USD',
        date: t.date,
        avatar: t.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        status: t.status,
        description: t.description,
      }));

      setTransactions(formattedTransactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      
      // Check if it's a lock error and retry
      const isLockError = error?.message?.includes('Lock') || 
                          error?.message?.includes('NavigatorLockAcquireTimeoutError');
      
      if (isLockError && retries > 0) {
        console.log(`Retrying fetchTransactions, ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchTransactions(retries - 1);
      }
      
      toast.error('Failed to load transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleSend = async () => {
    if (!user || !selectedRecipient || !sendAmount) return;

    const amount = parseFloat(sendAmount);
    if (amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    const recipient = recipients.find(r => r.id === selectedRecipient);
    if (!recipient) return;

    try {
      // Create transaction in database
      const newTransaction: Omit<DbTransaction, 'id'> = {
        user_id: user.id,
        name: recipient.name,
        description: `Sent to ${recipient.tag}`,
        amount: -amount,
        type: 'sent',
        status: 'completed',
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
        timestamp: Date.now(),
        category: 'transfer',
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(newTransaction);

      if (transactionError) throw transactionError;

      // Update user balance (deduct)
      const newBalance = (profile?.balance || 0) - amount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // Refresh profile and transactions
      await refreshProfile();
      await fetchTransactions();

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSendStep(0);
        setSendAmount("");
        setSelectedRecipient(null);
        setActiveTab("home");
      }, 2500);

      toast.success(`Sent $${amount} to ${recipient.name}`);
    } catch (error) {
      console.error('Error sending money:', error);
      toast.error('Failed to send money');
    }
  };

  const handleTopUpSuccess = async () => {
    // In a real implementation, this would be handled by a webhook
    // For demo, we just refresh the profile
    await refreshProfile();
    await fetchTransactions();
  };

  const handleSignOut = async () => {
    console.log('handleSignOut called');
    try {
      console.log('Calling signOut...');
      await signOut();
      console.log('signOut completed, navigating to login...');
      navigate('/login');
      console.log('Navigation called');
    } catch (error) {
      console.error('Error in handleSignOut:', error);
      // Force navigation even if signOut fails
      navigate('/login');
    }
  };

  const tabs: { key: TabKey; icon: typeof Home; label: string; color: string }[] = [
    { key: "home", icon: Home, label: "Home", color: "bg-[hsl(217,91%,60%)]" },
    { key: "send", icon: Send, label: "Send", color: "bg-[hsl(0,84%,60%)]" },
    { key: "receive", icon: ArrowDownToLine, label: "Receive", color: "bg-[hsl(160,60%,45%)]" },
    { key: "cards", icon: CreditCard, label: "Cards", color: "bg-[hsl(260,60%,55%)]" },
    { key: "withdraw", icon: Banknote, label: "Withdraw", color: "bg-[hsl(25,90%,55%)]" },
  ];

  const userBalance = profile?.balance || 0;
  const userName = profile?.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = profile?.avatar || userName.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[hsl(220,30%,97%)] flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={globalPayLogo} alt="GlobalPay" className="w-10 h-10 object-contain" />
          <span className="font-display font-bold text-foreground text-lg">GlobalPay</span>
        </Link>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[hsl(12,90%,55%)]" />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] flex items-center justify-center text-sm font-bold text-white">
              {userAvatar}
            </button>
            <button 
              onClick={() => {
                console.log('Logout button clicked');
                handleSignOut();
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-medium text-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <HomeTab 
              key="home" 
              onTopUp={() => setShowTopUp(true)} 
              onWithdraw={() => setShowWithdraw(true)}
              balance={userBalance}
              userName={userName}
              userAvatar={userAvatar}
              transactions={transactions}
              isLoading={isLoadingTransactions}
            />
          )}
          {activeTab === "send" && (
            <SendTab
              key="send"
              step={sendStep}
              setStep={setSendStep}
              amount={sendAmount}
              setAmount={setSendAmount}
              selectedRecipient={selectedRecipient}
              setSelectedRecipient={setSelectedRecipient}
              onSend={handleSend}
              maxAmount={userBalance}
            />
          )}
          {activeTab === "receive" && <ReceiveTab key="receive" userName={userName} />}
          {activeTab === "cards" && <CardsTab key="cards" userName={userName} />}
          {activeTab === "withdraw" && <WithdrawTabInline key="withdraw" onOpenModal={() => setShowWithdraw(true)} balance={userBalance} />}
        </AnimatePresence>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-[hsl(145,60%,95%)] flex items-center justify-center mx-auto"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-12 h-12 rounded-full bg-[hsl(145,60%,45%)] flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-foreground">Money Sent!</h2>
              <p className="text-muted-foreground">Your transfer is being processed</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-border/50 px-2 py-3 z-50 max-w-md mx-auto">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === "withdraw") {
                    setShowWithdraw(true);
                    return;
                  }
                  setActiveTab(tab.key);
                  if (tab.key === "send") { setSendStep(0); setSendAmount(""); setSelectedRecipient(null); }
                }}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 hover:opacity-80"
              >
                <div className={`w-10 h-10 rounded-full ${tab.color} flex items-center justify-center transition-all duration-200`}>
                  <tab.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-[10px] font-semibold transition-colors duration-200 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <WithdrawModal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} balance={userBalance} userName={userName} />
      <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} onTopUpSuccess={handleTopUpSuccess} userId={user?.id || ''} currentBalance={userBalance} />
    </div>
  );
};

/* ========== HOME TAB ========== */
const HomeTab = ({ 
  onTopUp, 
  onWithdraw, 
  balance, 
  userName, 
  userAvatar,
  transactions,
  isLoading 
}: { 
  onTopUp: () => void; 
  onWithdraw: () => void;
  balance: number;
  userName: string;
  userAvatar: string;
  transactions: Transaction[];
  isLoading: boolean;
}) => {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KSH' | 'EUR' | 'GBP'>('USD');

  const formatCurrency = (amount: number, currency: keyof typeof EXCHANGE_RATES) => {
    const { symbol, rate } = EXCHANGE_RATES[currency];
    if (currency === 'KSH') {
      return `${symbol} ${Math.round(amount * rate).toLocaleString()}`;
    }
    return `${symbol}${(amount * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const currencyOptions: { code: 'USD' | 'KSH' | 'EUR' | 'GBP'; name: string; gradient: string }[] = [
    { code: 'USD', name: 'US Dollar', gradient: 'from-[hsl(145,60%,45%)] to-[hsl(160,70%,40%)]' },
    { code: 'KSH', name: 'Kenyan Shilling', gradient: 'from-[hsl(12,90%,55%)] to-[hsl(340,80%,50%)]' },
    { code: 'EUR', name: 'Euro', gradient: 'from-[hsl(220,80%,55%)] to-[hsl(240,70%,50%)]' },
    { code: 'GBP', name: 'British Pound', gradient: 'from-[hsl(262,70%,58%)] to-[hsl(290,60%,55%)]' },
  ];

  // Update currency balances based on actual user balance
  const userCurrencies = currencies.map(c => ({
    ...c,
    balance: c.code === "USD" ? balance : c.code === "KSH" ? balance * KSH_RATE : balance * 0.85
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
      {/* Balance card */}
      <motion.div
        className="rounded-3xl overflow-hidden relative shadow-xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        style={{ minHeight: 300 }}
      >
        <img src={cardBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,80%,30%)]/85 via-[hsl(240,70%,35%)]/75 to-[hsl(262,70%,40%)]/80" />

        <div className="relative z-10 p-6">
          {/* Logo */}
          <div className="flex items-center justify-between mb-3">
            <img src={globalPayLogo} alt="GlobalPay" className="w-20 h-20 object-contain drop-shadow-lg" />
            <div className="flex items-center gap-2">
              {/* Account Number - Copyable */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Account Number</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('884729103456');
                    toast.success('Account number copied!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white font-mono text-sm"
                >
                  <span>884729103456</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                {balanceVisible ? <Eye className="w-5 h-5 text-white/70" /> : <EyeOff className="w-5 h-5 text-white/70" />}
              </button>
            </div>
          </div>

          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Total Balance</p>
          <div className="flex items-center gap-3">
            <motion.p
              key={`${balanceVisible}-${selectedCurrency}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-display font-bold text-white mt-1"
            >
              {balanceVisible ? formatCurrency(balance, selectedCurrency) : "••••••••"}
            </motion.p>
            {/* Convert Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCurrencyModal(true)}
              className="mt-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[hsl(30,90%,55%)] to-[hsl(45,90%,55%)] text-white text-xs font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              Convert
            </motion.button>
          </div>
          <p className="text-xs text-white/50 mt-1">
            {selectedCurrency !== 'USD' && `≈ ${EXCHANGE_RATES.USD.symbol}${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <span className="text-xs font-medium text-white/80 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full inline-flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3" /> +5.2% this month
          </span>

          {/* Top Up & Withdraw */}
          <div className="flex gap-3 mt-5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onTopUp}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[hsl(145,60%,45%)] hover:bg-[hsl(145,60%,40%)] text-white font-semibold text-sm shadow-lg transition-all"
            >
              <ArrowUp className="w-4 h-4" />
              Top Up
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onWithdraw}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[hsl(262,70%,58%)] hover:bg-[hsl(262,70%,52%)] text-white font-semibold text-sm shadow-lg transition-all"
            >
              <ArrowDown className="w-4 h-4" />
              Withdraw
            </motion.button>
          </div>

          {/* Currency cards */}
          <div className="flex gap-2 mt-4">
            {userCurrencies.map((c, i) => (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className={`flex-1 rounded-2xl p-3 border border-white/15 bg-gradient-to-br ${c.gradient} shadow-md`}
              >
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{c.code}</p>
                <p className="text-sm font-bold text-white mt-1">
                  {balanceVisible
                    ? c.code === "KSH"
                      ? `KSh ${c.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : `${c.symbol}${c.balance.toLocaleString()}`
                    : "••••"
                  }
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-border/50 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-foreground">Recent Activity</h3>
          <button className="text-xs font-semibold text-[hsl(220,80%,55%)]">See all</button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[hsl(220,80%,55%)] animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Start by sending or receiving money</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${
                  tx.type === "received"
                    ? "bg-[hsl(145,60%,95%)] text-[hsl(145,60%,40%)]"
                    : "bg-[hsl(12,90%,95%)] text-[hsl(12,90%,55%)]"
                }`}>
                  {tx.type === "received"
                    ? <ArrowDownLeft className="w-5 h-5" />
                    : <ArrowUpRight className="w-5 h-5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p className={`font-display font-bold text-sm ${tx.amount > 0 ? "text-[hsl(145,60%,40%)]" : "text-foreground"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} {tx.currency}
                  </p>
                  {tx.status === "pending" && (
                    <span className="text-[10px] font-medium text-[hsl(30,90%,50%)]">Pending</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Currency Converter Modal */}
      <AnimatePresence>
        {showCurrencyModal && (
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
              className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-br from-[hsl(220,80%,35%)] via-[hsl(240,70%,40%)] to-[hsl(262,70%,45%)] border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-white">Convert Currency</h3>
                <button onClick={() => setShowCurrencyModal(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/70 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-white/60 mb-4">Select your preferred currency to view your balance:</p>

              <div className="space-y-3">
                {currencyOptions.map((currency) => (
                  <motion.button
                    key={currency.code}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedCurrency(currency.code);
                      setShowCurrencyModal(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      selectedCurrency === currency.code
                        ? 'bg-white/20 border-2 border-white/40'
                        : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currency.gradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-xl font-bold text-white">{EXCHANGE_RATES[currency.code].symbol}</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-white">{currency.code}</p>
                      <p className="text-xs text-white/60">{EXCHANGE_RATES[currency.code].name}</p>
                    </div>
                    {selectedCurrency === currency.code && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-[hsl(145,60%,45%)] flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 text-center">
                  Balance: {formatCurrency(balance, selectedCurrency)}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ========== SEND TAB ========== */
const recipients = [
  { id: "1", name: "Sarah Johnson", tag: "@sarah", avatar: "SJ" },
  { id: "2", name: "Alex Chen", tag: "@alexc", avatar: "AC" },
  { id: "3", name: "Maria Santos", tag: "@maria", avatar: "MS" },
  { id: "4", name: "James Wilson", tag: "@james", avatar: "JW" },
];

const SendTab = ({ step, setStep, amount, setAmount, selectedRecipient, setSelectedRecipient, onSend, maxAmount }: {
  step: number; setStep: (s: number) => void;
  amount: string; setAmount: (a: string) => void;
  selectedRecipient: string | null; setSelectedRecipient: (r: string | null) => void;
  onSend: () => void;
  maxAmount: number;
}) => {
  const numPad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

  const handleNumPad = (key: string) => {
    if (key === "⌫") setAmount(amount.slice(0, -1));
    else if (key === "." && amount.includes(".")) return;
    else if (amount.length < 10) setAmount(amount + key);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Send Money</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search name, @tag, or email"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,80%,55%)]/30 placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
              {recipients.map((r) => (
                <motion.button
                  key={r.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedRecipient(r.id); setStep(1); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    selectedRecipient === r.id ? "bg-[hsl(220,80%,95%)] border-[hsl(220,80%,80%)] border" : "bg-white border border-border/50 hover:shadow-md"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] flex items-center justify-center text-sm font-bold text-white">
                    {r.avatar}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.tag}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <button onClick={() => setStep(0)} className="text-sm font-medium text-[hsl(220,80%,55%)]">← Back</button>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Sending to {recipients.find(r => r.id === selectedRecipient)?.name}</p>
              <div className="flex items-center justify-center">
                <span className="text-3xl text-muted-foreground/40 font-display">$</span>
                <span className="text-6xl font-display font-bold text-foreground min-w-[60px]">
                  {amount || "0"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">USD</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {numPad.map((key) => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNumPad(key)}
                  className="py-4 rounded-2xl text-xl font-display font-semibold text-foreground bg-white border border-border/50 hover:bg-muted active:bg-muted transition-colors"
                >
                  {key}
                </motion.button>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onSend}
              disabled={!amount || parseFloat(amount) === 0 || parseFloat(amount) > maxAmount}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] text-white font-semibold text-lg shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
            >
              Send ${amount || "0"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ========== RECEIVE TAB ========== */
const ReceiveTab = ({ userName }: { userName: string }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
    <h2 className="text-2xl font-display font-bold text-foreground">Receive Money</h2>
    <div className="rounded-3xl bg-white border border-border/50 p-8 flex flex-col items-center space-y-6 shadow-sm">
      <div className="w-48 h-48 rounded-2xl bg-[hsl(220,30%,97%)] border-2 border-dashed border-border flex items-center justify-center">
        <div className="text-center">
          <QrCode className="w-16 h-16 text-foreground/20 mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Your QR Code</p>
        </div>
      </div>
      <div className="text-center">
        <p className="font-display font-bold text-foreground">@{userName.toLowerCase().replace(/\s+/g, '')}</p>
        <p className="text-sm text-muted-foreground">Share your tag or QR code</p>
      </div>
      <div className="flex gap-3 w-full">
        <button className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] text-white font-semibold text-sm shadow-lg">
          Share Link
        </button>
        <button className="flex-1 py-3 rounded-2xl border-2 border-border font-semibold text-sm text-foreground hover:border-[hsl(220,80%,70%)] transition-colors">
          Copy Tag
        </button>
      </div>
    </div>
    <div>
      <h3 className="font-display font-bold text-foreground mb-3">Request Money</h3>
      <div className="rounded-2xl bg-white border border-border/50 p-4 space-y-3 shadow-sm">
        <input placeholder="Amount" className="w-full px-4 py-3 rounded-xl bg-[hsl(220,30%,97%)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,80%,55%)]/30" />
        <input placeholder="From (email or @tag)" className="w-full px-4 py-3 rounded-xl bg-[hsl(220,30%,97%)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,80%,55%)]/30" />
        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(145,60%,45%)] to-[hsl(172,50%,45%)] text-white font-semibold text-sm">
          Send Request
        </button>
      </div>
    </div>
  </motion.div>
);

/* ========== CARDS TAB ========== */
const CardsTab = ({ userName }: { userName: string }) => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const cards = [
    {
      id: 1,
      number: "4829 1234 5678 9012",
      last4: "4829",
      holder: userName,
      expires: "09/28",
      cvv: "123",
      type: "Visa",
      gradient: "from-[hsl(220,80%,30%)] via-[hsl(240,70%,35%)] to-[hsl(262,70%,40%)]",
      bgImage: cardBg,
    },
    {
      id: 2,
      number: "7312 9876 5432 1098",
      last4: "7312",
      holder: userName,
      expires: "03/27",
      cvv: "456",
      type: "Mastercard",
      gradient: "from-[hsl(12,90%,55%)] to-[hsl(340,80%,50%)]",
      bgImage: null,
    },
  ];

  const selectedCardData = selectedCard !== null ? cards[selectedCard] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-foreground">My Cards</h2>
        <button className="p-2 rounded-xl bg-white border border-border/50 hover:shadow-md transition-all">
          <Plus className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Card 1 */}
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { setSelectedCard(0); setShowDetails(true); }}
        className="rounded-3xl overflow-hidden relative shadow-2xl aspect-[1.6/1] flex flex-col justify-between cursor-pointer group"
      >
        <img src={cardBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,80%,30%)]/90 via-[hsl(240,70%,35%)]/70 to-[hsl(262,70%,40%)]/80 group-hover:from-[hsl(220,80%,30%)]/95 group-hover:via-[hsl(240,70%,35%)]/75 group-hover:to-[hsl(262,70%,40%)]/85 transition-all duration-500" />
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="relative z-10 p-6 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-10 h-7 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-6 h-4 rounded-sm bg-gradient-to-r from-yellow-400 to-yellow-600" />
              </div>
              <span className="text-white/80 text-xs font-medium">VISA</span>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium"
            >
              View Details
            </motion.div>
          </div>
          
          <div>
            <p className="font-mono text-xl text-white/90 tracking-widest mb-4">•••• •••• •••• {cards[0].last4}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Cardholder</p>
                <p className="text-sm font-semibold text-white">{userName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Expires</p>
                <p className="text-sm font-semibold text-white">09/28</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* View Details Button - Card 1 */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { setSelectedCard(0); setShowDetails(true); }}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 -mt-3"
      >
        <Eye className="w-4 h-4" />
        Click to View Details
      </motion.button>

      {/* Card 2 */}
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { setSelectedCard(1); setShowDetails(true); }}
        className="rounded-3xl overflow-hidden relative shadow-2xl aspect-[1.6/1] flex flex-col justify-between cursor-pointer group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(12,90%,55%)] via-[hsl(340,80%,50%)] to-[hsl(300,70%,45%)] group-hover:from-[hsl(12,90%,58%)] group-hover:via-[hsl(340,80%,53%)] group-hover:to-[hsl(300,70%,48%)] transition-all duration-500" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[length:20px_20px]" />
        
        <div className="relative z-10 p-6 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-10 h-7 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-6 h-4 rounded-sm bg-gradient-to-r from-red-500 to-orange-500" />
              </div>
              <span className="text-white/80 text-xs font-medium">MASTERCARD</span>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium"
            >
              View Details
            </motion.div>
          </div>
          
          <div>
            <p className="font-mono text-xl text-white/90 tracking-widest mb-4">•••• •••• •••• {cards[1].last4}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Cardholder</p>
                <p className="text-sm font-semibold text-white">{userName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Expires</p>
                <p className="text-sm font-semibold text-white">03/27</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* View Details Button - Card 2 */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { setSelectedCard(1); setShowDetails(true); }}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-[hsl(12,90%,55%)] to-[hsl(340,80%,50%)] text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 -mt-3"
      >
        <Eye className="w-4 h-4" />
        Click to View Details
      </motion.button>

      <div className="space-y-3">
        <h3 className="font-display font-bold text-foreground">Card Settings</h3>
        {["Spending Limits", "Freeze Card", "PIN Management"].map((item) => (
          <button key={item} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-border/50 hover:shadow-md transition-all">
            <span className="text-sm font-medium text-foreground">{item}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Card Details Modal */}
      <AnimatePresence>
        {showDetails && selectedCardData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card Reveal */}
              <motion.div
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div 
                  className={`rounded-3xl overflow-hidden shadow-2xl aspect-[1.6/1] flex flex-col justify-between ${
                    selectedCardData.bgImage ? '' : selectedCardData.gradient
                  }`}
                  style={{ background: selectedCardData.bgImage ? undefined : undefined }}
                >
                  {selectedCardData.bgImage && (
                    <img src={selectedCardData.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {selectedCardData.bgImage && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${selectedCardData.gradient}/90`} />
                  )}
                  {!selectedCardData.bgImage && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${selectedCardData.gradient}`} />
                  )}
                  
                  {/* Holographic effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50" />
                  
                  <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-7 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <div className={`w-6 h-4 rounded-sm ${selectedCard === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-orange-500'}`} />
                        </div>
                        <span className="text-white/80 text-xs font-medium">{selectedCardData.type.toUpperCase()}</span>
                      </div>
                      <button
                        onClick={() => setShowDetails(false)}
                        className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    <div>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-mono text-xl text-white tracking-widest mb-4"
                      >
                        {selectedCardData.number}
                      </motion.p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">Cardholder</p>
                          <p className="text-sm font-semibold text-white">{selectedCardData.holder}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">Expires</p>
                          <p className="text-sm font-semibold text-white">{selectedCardData.expires}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">CVV</p>
                          <motion.p 
                            initial={{ opacity: 0, filter: "blur(10px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            transition={{ delay: 0.6 }}
                            className="text-sm font-semibold text-white"
                          >
                            {selectedCardData.cvv}
                          </motion.p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-foreground font-semibold text-sm shadow-lg"
                  >
                    <Eye className="w-4 h-4" />
                    Show PIN
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm backdrop-blur-sm border border-white/20"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Number
                  </motion.button>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDetails(false)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] text-white font-semibold text-sm shadow-lg"
                >
                  Done
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ========== WITHDRAW TAB (INLINE) ========== */
const WithdrawTabInline = ({ onOpenModal, balance }: { onOpenModal: () => void; balance: number }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
      <h2 className="text-2xl font-display font-bold text-foreground">Withdraw</h2>

      <div className="rounded-3xl bg-gradient-to-br from-[hsl(220,80%,55%)] to-[hsl(262,70%,58%)] p-6 shadow-xl">
        <p className="text-sm text-white/70">Available Balance</p>
        <p className="text-3xl font-display font-bold text-white">${balance.toLocaleString()}</p>
        <p className="text-sm text-white/60 mt-1">≈ KSh {(balance * KSH_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onOpenModal}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(262,70%,58%)] to-[hsl(220,80%,55%)] text-white font-semibold text-lg shadow-lg transition-all"
      >
        Start Withdrawal
      </motion.button>

      <div className="rounded-2xl bg-white border border-border/50 p-5 space-y-3 shadow-sm">
        <h3 className="font-display font-bold text-foreground text-sm">Withdrawal Methods</h3>
        {[
          { name: "Bank Transfer", desc: "1-3 business days", icon: "🏦", isImage: false },
          { name: "M-Pesa", desc: "Instant withdrawal", icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRBTlNLjv9zJWMLXLA1DH_F5lfyV957_3G2g&s", isImage: true },
          { name: "Airtel Money", desc: "Instant transfer", icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbtnOWST4RtneU4tHYLmaG4Z2ejYQe6Qhq8w&s", isImage: true },
          { name: "Cash App", desc: "Instant to Cash App", icon: "💵", isImage: false },
        ].map((m) => (
          <div key={m.name} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(220,30%,97%)]">
            {m.isImage ? (
              <img src={m.icon} alt={m.name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <span className="text-2xl">{m.icon}</span>
            )}
            <div>
              <p className="font-semibold text-sm text-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AppPage;
