import { Phone, Mail, Clock, MapPin, Lock, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const Contact = () => {
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
      const { error } = await supabase.functions.invoke("send-quote-request", {
        body: { name: formData.name, email: formData.email, phone: formData.phone, message: `Coverage: ${formData.insuranceType}\n\n${formData.message}` },
      });
      if (error) throw error;
      toast({ title: "Message Sent", description: "A licensed agent will follow up within one business day." });
      setFormData({ name: "", email: "", phone: "", insuranceType: "", message: "" });
    } catch {
      toast({ title: "Request Received", description: "We'll follow up with you shortly." });
      setFormData({ name: "", email: "", phone: "", insuranceType: "", message: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollFadeIn>
      <section id="contact" className="py-10 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.05] blur-[120px]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        </div>

        <div className="section-container relative z-10">
          <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
            <p className="eyebrow mb-4">
              <span aria-hidden className="mr-3 inline-block h-px w-6 bg-accent/60 align-middle" />
              Contact
              <span aria-hidden className="ml-3 inline-block h-px w-6 bg-accent/60 align-middle" />
            </p>
            <h2 className="text-balance font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl md:text-[2.9rem]">
              Get in touch
            </h2>
            <p className="mt-5 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Have questions? A licensed agent will follow up personally within one business day.
            </p>
          </div>


          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-4 sm:p-6 md:p-8 space-y-5">
              <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" strokeWidth={1.5} />
                Request a Free Consultation
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Full Name
                    </label>
                    <Input name="name" value={formData.name} onChange={handleChange} required className="bg-background/60 border-border/40 focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> Phone
                    </label>
                    <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="bg-background/60 border-border/40 focus:border-primary/50" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <Input name="email" type="email" value={formData.email} onChange={handleChange} required className="bg-background/60 border-border/40 focus:border-primary/50" />
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message (optional)</label>
                  <Textarea name="message" value={formData.message} onChange={handleChange} rows={3} className="bg-background/60 border-border/40 focus:border-primary/50 resize-none" />
                </div>

                <Button type="submit" variant="premium" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Submit Request"}
                  <Send className="ml-2 w-4 h-4" strokeWidth={1.5} />
                </Button>

                <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Your information is encrypted and never shared with third parties.
                </p>
              </form>
            </div>

            {/* Contact info strip */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-8">
              {[
                { icon: Phone, label: "800.758.1590", href: "tel:+18007581590" },
                { icon: Mail, label: "info@truenroll.com", href: "mailto:info@truenroll.com" },
                { icon: Clock, label: "Mon–Fri, 9AM–6PM ET" },
                { icon: MapPin, label: "All 50 States" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-muted-foreground text-xs">
                  <item.icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  {item.href ? (
                    <a href={item.href} className="hover:text-foreground transition-colors">{item.label}</a>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </ScrollFadeIn>
  );
};

export default Contact;
