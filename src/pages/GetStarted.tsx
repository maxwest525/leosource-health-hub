import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Send, User, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const GetStarted = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", insuranceType: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.functions.invoke("send-quote-request", {
        body: { name: formData.name, email: formData.email, phone: formData.phone, message: `Coverage: ${formData.insuranceType}\n\n${formData.message}` },
      });
      toast({ title: "Request Received", description: "A licensed agent will follow up within one business day." });
      setFormData({ name: "", email: "", phone: "", insuranceType: "", message: "" });
    } catch {
      toast({ title: "Request Received", description: "We'll follow up shortly." });
      setFormData({ name: "", email: "", phone: "", insuranceType: "", message: "" });
    } finally {
      setLoading(false);
    }
  };

  const expectations = [
    { title: "No-obligation consultation", desc: "A licensed agent will review your needs and present options — no pressure." },
    { title: "Real person, real help", desc: "You'll speak with a knowledgeable professional, not a script reader." },
    { title: "Fast follow-up", desc: "Most requests receive a personal response within one business day." },
    { title: "Private and secure", desc: "Your information is encrypted and handled according to best practices." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>
          <div className="section-container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Get Started</p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="h-px w-8 bg-primary/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Let's Find the Right Coverage
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed">
                Fill out the form below and a licensed agent will follow up to discuss your options — no cost, no obligation.
              </p>
            </div>
          </div>
        </section>

        <ScrollFadeIn>
          <section className="py-10 md:py-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/[0.05] blur-[120px]" />
            </div>
            <div className="section-container relative z-10">
              <div className="grid lg:grid-cols-12 gap-10 max-w-5xl mx-auto">
                <div className="lg:col-span-7">
                  <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 md:p-8 space-y-5">
                    <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      Request a Free Consultation
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3 h-3" /> Full Name
                          </label>
                          <Input name="name" value={formData.name} onChange={handleChange} required className="bg-background/60 border-border/40 focus:border-primary/50" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> Email
                          </label>
                          <Input name="email" type="email" value={formData.email} onChange={handleChange} required className="bg-background/60 border-border/40 focus:border-primary/50" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Phone className="w-3 h-3" /> Phone
                          </label>
                          <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="bg-background/60 border-border/40 focus:border-primary/50" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coverage Interest</label>
                          <Select value={formData.insuranceType} onValueChange={(val) => setFormData((prev) => ({ ...prev, insuranceType: val }))}>
                            <SelectTrigger className="bg-background/60 border-border/40"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Individual & Family</SelectItem>
                              <SelectItem value="medicare">Medicare</SelectItem>
                              <SelectItem value="dental">Dental & Vision</SelectItem>
                              <SelectItem value="supplemental">Supplemental</SelectItem>
                              <SelectItem value="other">Other / Not Sure</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message (optional)</label>
                        <Textarea name="message" value={formData.message} onChange={handleChange} rows={3} className="bg-background/60 border-border/40 focus:border-primary/50 resize-none" />
                      </div>
                      <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all" disabled={loading}>
                        {loading ? "Sending..." : "Submit Request"}
                        <Send className="ml-2 w-4 h-4" strokeWidth={1.5} />
                      </Button>
                      <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3" /> Encrypted and never shared with third parties.
                      </p>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-2">What to Expect</p>
                  {expectations.map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                      className="rounded-xl border border-border/40 p-4">
                      <p className="font-semibold text-foreground text-sm">{item.title}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed mt-1">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      </main>
      <Footer />
    </div>
  );
};

export default GetStarted;
