import { MessageCircle, Phone } from "lucide-react";

export function MobileContactBar({ phone, whatsappHref, hidden }: { phone: string; whatsappHref: string; hidden: boolean }) {
  if (hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <a href={`tel:+${phone}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand/40 text-brand font-bold"><Phone className="h-5 w-5" /> اتصال</a>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold"><MessageCircle className="h-5 w-5" /> واتساب</a>
      </div>
    </div>
  );
}
