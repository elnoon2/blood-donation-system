import { MapPin, Phone, Droplet } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface DonorCardProps {
  name: string;
  bloodType: string;
  governorate: string;
  phone: string;
  lastDonation?: string;
  isAvailable?: boolean;
  matchingScore?: number;
}

export function DonorCard({ name, bloodType, governorate, phone, lastDonation, isAvailable = true, matchingScore }: DonorCardProps) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : "#";

  const handleContact = () => {
    toast.success(`Contacting ${name}`, {
      description: `Phone: ${phone}`,
      duration: 3000,
    });
  };

  return (
    <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-3">
            <Droplet className="w-6 h-6 text-primary" fill="currentColor" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isAvailable ? "default" : "secondary"}>
                {isAvailable ? "Available" : "Not Available"}
              </Badge>
              {typeof matchingScore === "number" && (
                <Badge variant="outline" className="font-bold text-primary border-primary/30">
                  Match {matchingScore}%
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="bg-primary text-white rounded-lg px-4 py-2 font-bold text-lg">
          {bloodType}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-primary" />
          <span>{governorate}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-primary" />
          <span>{phone}</span>
        </div>
        {lastDonation && (
          <p className="text-xs text-gray-500 mt-2">Last donation: {lastDonation}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="w-full" disabled={!isAvailable} onClick={handleContact} asChild>
          <a href={cleanPhone ? `tel:${cleanPhone}` : "#"}>Call Now</a>
        </Button>
        <Button className="w-full" disabled={!isAvailable || !cleanPhone} variant="outline" asChild>
          <a href={whatsappLink} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </Button>
      </div>
    </Card>
  );
}