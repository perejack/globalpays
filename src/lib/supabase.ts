import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cyoousrbbhqhzjgqmsga.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5b291c3JiYmhxaHpqZ3Ftc2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjMyMTIsImV4cCI6MjA5MDMzOTIxMn0.pKX8vxSyz8fHVCOSoxcJvpZlAEsy6In1PiBoVTEVvh8';

// Simple promise-based lock to replace navigator.lock API
class SimpleLock {
  private promise: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const newPromise = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const waitOn = this.promise;
    this.promise = this.promise.then(() => newPromise);
    await waitOn;
    return release!;
  }
}

// Custom lock implementation that works in all environments
const customLock = async (name: string, acquireTimeout: number, callback: () => Promise<any>) => {
  const lock = new SimpleLock();
  const release = await lock.acquire();
  try {
    return await callback();
  } finally {
    release();
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use custom lock implementation instead of navigator.lock API
    lock: customLock,
  },
});

export type Profile = {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  status: 'active' | 'suspended' | 'pending';
  joined_at: string;
  last_active: string;
  is_admin: boolean;
};

export type Transaction = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  amount: number;
  type: 'sent' | 'received';
  status: 'pending' | 'completed' | 'failed';
  date: string;
  timestamp: number;
  category: string;
  reference?: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'transaction';
  read: boolean;
  created_at: string;
};
