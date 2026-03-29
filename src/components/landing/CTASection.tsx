import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-28 px-6 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto shadow-glow">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground">
            Ready to move money{" "}
            <span className="text-gradient-primary">freely?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join millions of people who trust GlobalPay for fast, secure, and borderless payments.
          </p>
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-lg shadow-glow hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            Start Sending Money
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
