import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, stagger, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = HTMLMotionProps<"div"> & {
  /** Distance in px the element travels up as it fades in. */
  y?: number;
  delay?: number;
};

/** Single scroll-triggered reveal. Transform and opacity only. */
export const Reveal = ({ y = 18, delay = 0, className, children, ...rest }: RevealProps) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={viewportOnce}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    className={cn(className)}
    {...rest}
  >
    {children}
  </motion.div>
);

/** Parent that staggers any `RevealItem` children as the group enters view. */
export const RevealGroup = ({
  gap = 0.07,
  className,
  children,
  ...rest
}: HTMLMotionProps<"div"> & { gap?: number }) => (
  <motion.div
    initial="hidden"
    whileInView="show"
    viewport={viewportOnce}
    variants={stagger(gap)}
    className={cn(className)}
    {...rest}
  >
    {children}
  </motion.div>
);

export const RevealItem = ({ className, children, ...rest }: HTMLMotionProps<"div">) => (
  <motion.div variants={fadeUp} className={cn(className)} {...rest}>
    {children}
  </motion.div>
);
