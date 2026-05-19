import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/globalpay-logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="GlobalPay" className="h-10 w-auto" />
          <span className="font-display font-bold text-xl text-foreground">GlobalPay</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Security", "Global", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/app"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            Open App
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border/50 glass-strong overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              {["Features", "Security", "Global", "Pricing"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="py-2 text-sm font-medium text-muted-foreground">
                  {item}
                </a>
              ))}
              <Link
                to="/app"
                className="mt-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-primary text-primary-foreground text-center"
              >
                Open App
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
