import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroPhone from "@/assets/hero-phone.png";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[100dvh] md:min-h-screen bg-gradient-hero overflow-hidden pt-20 md:pt-0">
      {/* Decorative orbs */}
      <div className="absolute top-20 right-[15%] w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-20 left-[10%] w-96 h-96 rounded-full bg-secondary/10 blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-accent/5 blur-3xl animate-pulse-soft" style={{ animationDelay: "3s" }} />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left content */}
          <div className="space-y-4 md:space-y-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight"
            >
              Ready to move money{" "}
              <span className="text-[hsl(12,90%,55%)]">freely</span>?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed mx-auto"
            >
              Join millions of people who trust GlobalPay for fast, secure, and borderless payments.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative z-50 flex justify-center"
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/signup')}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 md:px-10 md:py-5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-lg shadow-glow hover:shadow-xl transition-all duration-200 min-h-[56px] min-w-[160px] cursor-pointer select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="pointer-events-none">Open App</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform pointer-events-none" />
              </motion.button>
            </motion.div>
          </div>

          {/* Right phone image */}
          <motion.div
            initial={{ opacity: 0, x: 60, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              <motion.img
                src={heroPhone}
                alt="GlobalPay mobile payment app"
                className="w-[300px] md:w-[380px] lg:w-[420px] drop-shadow-2xl"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Floating cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -left-12 top-[15%] glass-strong rounded-2xl p-3 shadow-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-secondary flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-secondary-foreground rotate-[-45deg]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Received</p>
                    <p className="font-display font-bold text-foreground text-sm">+$2,450.00</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="absolute -right-8 bottom-[15%] glass-strong rounded-2xl p-3 shadow-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-success">Secured</p>
                    <p className="text-xs text-muted-foreground">256-bit encryption</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
