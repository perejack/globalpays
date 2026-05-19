import { motion } from "framer-motion";

const stats = [
  { value: "$12B+", label: "Transferred globally" },
  { value: "5M+", label: "Active users" },
  { value: "200+", label: "Countries covered" },
  { value: "0.3s", label: "Avg. transfer time" },
];

const StatsSection = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-gradient-primary p-12 md:p-16"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-display font-bold text-primary-foreground">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-primary-foreground/70">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
