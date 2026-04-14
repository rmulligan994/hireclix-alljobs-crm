import { Suspense } from "react";
import Campaigns from "@/views/Campaigns";

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <Campaigns />
    </Suspense>
  );
}
