import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeroEntryPanel } from "@/components/hero/HeroEntryPanel";
import { HeroBackgroundVideo } from "@/components/hero/HeroBackgroundVideo";



const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const dragControls = useDragControls();

  return (
    <>
      <section
        ref={sectionRef}
        className="relative min-h-[78svh] sm:min-h-[70vh] md:min-h-[86vh] flex flex-col items-start pt-16 overflow-hidden"
      >
        {/* Background video (mobile gets a small portrait encode, loads on idle) */}
        <HeroBackgroundVideo />



        {/* Overlay: keeps copy legible while leaving the center of the footage clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />


        <div className="relative section-container w-full pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-24 md:pb-16">
          <div className="max-w-3xl text-left">

            {/* Headline */}
            <h1 className="font-display text-[2.9rem] sm:text-6xl md:text-7xl lg:text-[5.25rem] font-semibold tracking-[-0.04em] text-white leading-[0.94] drop-shadow-[0_2px_28px_rgba(0,0,0,0.55)]">
              Health coverage you can <span className="text-accent">trust.</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-5 sm:mt-6 max-w-xl text-base sm:text-lg md:text-xl text-white/75 font-light leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)]">
              Compare plans, check your subsidy, and enroll with a licensed agent at no extra cost.
            </p>

            {/* Primary actions */}
            <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button asChild variant="premium" size="lg">
                <Link to="/compare-plans">Enroll in your plan</Link>
              </Button>

              <Button asChild variant="premium-outline" size="lg">
                <Link to="/contact">Speak with a specialist</Link>
              </Button>
            </div>

          </div>
        </div>


        {/* Floating, draggable eligibility form */}
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={sectionRef}
          dragMomentum={false}
          dragElastic={0.05}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("[data-drag-handle]")) dragControls.start(event);
          }}
          className="relative z-20 mx-4 mb-8 w-[calc(100%-2rem)] md:absolute md:right-8 md:bottom-10 md:mx-0 md:mb-0 md:w-[min(26rem,calc(100%-2rem))]"
        >
          <HeroEntryPanel draggable />
        </motion.div>
      </section>
      
    </>
  );
};

export default Hero;
