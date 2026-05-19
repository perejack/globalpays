import { motion } from "framer-motion";
import { Send, ArrowDownToLine, Globe, CreditCard, PieChart, Shield, Smartphone, Repeat } from "lucide-react";

const features = [
  {
    icon: Send,
    title: "Instant Send",
    description: "Send money to anyone in seconds. No waiting, no delays.",
    gradient: "bg-gradient-primary",
  },
  {
    icon: ArrowDownToLine,
    title: "Easy Receive",
    description: "Share your GlobalPay link and receive funds from anywhere.",
    gradient: "bg-gradient-secondary",
  },
  {
    icon: Globe,
    title: "200+ Countries",
    description: "Transfer across borders with real-time exchange rates.",
    gradient: "bg-gradient-accent",
  },
  {
    icon: CreditCard,
    title: "Virtual Cards",
    description: "Generate virtual cards for secure online payments.",
    gradient: "bg-gradient-warm",
  },
  {
    icon: PieChart,
    title: "Smart Analytics",
    description: "Track spending habits with beautiful visual insights.",
    gradient: "bg-gradient-primary",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "256-bit encryption and biometric authentication.",
    gradient: "bg-gradient-secondary",
  },
  {
    icon: Smartphone,
    title: "QR Payments",
    description: "Scan and pay instantly with dynamic QR codes.",
    gradient: "bg-gradient-accent",
  },
  {
    icon: Repeat,
    title: "Auto Split",
    description: "Split bills with friends automatically and fairly.",
    gradient: "bg-gradient-warm",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-28 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Features</span>
          <h2 className="mt-4 text-4xl md:text-5xl font-display font-bold text-foreground">
            Everything you need,{" "}
            <span className="text-gradient-primary">nothing you don't</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete payment ecosystem designed to make your financial life effortless.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-2xl ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
