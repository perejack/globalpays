import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, UserPlus, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const AdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();

  const createAdminUser = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "admin@admin.com",
        password: "admin9408",
        options: {
          data: {
            name: "Admin",
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          // User exists, just sign in to get the user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: "admin@admin.com",
            password: "admin9408",
          });
          
          if (signInError) throw signInError;
          
          if (signInData.user) {
            // Update profile to be admin
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ 
                is_admin: true,
                name: "Admin",
                status: "active"
              })
              .eq("id", signInData.user.id);
            
            if (updateError) throw updateError;
          }
          
          setCreated(true);
          toast.success("Admin user updated successfully!");
          
          // Sign out after setup
          await supabase.auth.signOut();
          
          setTimeout(() => {
            navigate("/login");
          }, 2000);
          
          return;
        }
        throw authError;
      }

      if (authData.user) {
        // Step 2: Update the profile to set is_admin = true
        // The trigger should have created the profile, so we update it
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            is_admin: true,
            name: "Admin",
            status: "active"
          })
          .eq("id", authData.user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          // If update fails, the trigger might not have run yet
          // Let's try inserting instead
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: authData.user.id,
              name: "Admin",
              avatar: "AD",
              balance: 0,
              is_admin: true,
              status: "active",
              joined_at: new Date().toISOString(),
            });
          
          if (insertError) throw insertError;
        }

        setCreated(true);
        toast.success("Admin user created successfully!");
        
        // Sign out after setup so they can log in fresh
        await supabase.auth.signOut();
        
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 flex items-center justify-center shadow-lg shadow-violet-500/20"
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Admin Setup</h1>
          <p className="text-slate-400">
            Create the administrator account
          </p>
        </div>

        {created ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
          >
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Admin Created!</h2>
            <p className="text-slate-400 mb-4">
              Email: <span className="text-emerald-400 font-mono">admin@admin.com</span><br />
              Password: <span className="text-emerald-400 font-mono">admin9408</span>
            </p>
            <p className="text-sm text-slate-500">
              Redirecting to login...
            </p>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Email</p>
                <p className="text-white font-mono">admin@admin.com</p>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Password</p>
                <p className="text-white font-mono">admin9408</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createAdminUser}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500 text-white font-semibold text-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Admin User
                </>
              )}
            </motion.button>

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AdminSetup;
