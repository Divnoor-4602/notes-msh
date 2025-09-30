import PricingTable from "@/components/autumn/pricing-table";
import { productDetails } from "@/constants/autumn";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center w-full">
      {/* Pricing Table */}
      <PricingTable productDetails={productDetails} />
    </div>
  );
}
