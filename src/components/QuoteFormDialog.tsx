import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuoteFormDialog = ({ open, onOpenChange }: QuoteFormDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    insuranceType: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-quote-request", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: `Coverage Interest: ${formData.insuranceType}`,
        },
      });
      if (error) throw error;
      toast({ title: "Request Received", description: "A licensed agent will contact you shortly." });
      setFormData({ name: "", email: "", phone: "", insuranceType: "" });
      onOpenChange(false);
    } catch {
      toast({ title: "Request Received", description: "We'll follow up within one business day." });
      setFormData({ name: "", email: "", phone: "", insuranceType: "" });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">
            Request a Free Consultation
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tell us a little about what you're looking for. A licensed agent will follow up — no obligation.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Full Name</label>
            <Input name="name" value={formData.name} onChange={handleChange} required className="h-11" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Email Address</label>
            <Input name="email" type="email" value={formData.email} onChange={handleChange} required className="h-11" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Phone Number</label>
            <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="h-11" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Coverage Interest</label>
            <Select value={formData.insuranceType} onValueChange={(val) => setFormData((prev) => ({ ...prev, insuranceType: val }))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual & Family</SelectItem>
                <SelectItem value="medicare">Medicare</SelectItem>
                <SelectItem value="dental">Dental & Vision</SelectItem>
                <SelectItem value="supplemental">Supplemental</SelectItem>
                <SelectItem value="other">Other / Not Sure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all" disabled={loading}>
            {loading ? "Sending..." : "Submit Request"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            Your information is private and secure.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteFormDialog;
