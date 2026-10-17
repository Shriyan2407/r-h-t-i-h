import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingMarket } from "@/lib/services/landingMarket";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  // Real market data only. `null` makes the landing page omit the live sections.
  const market = await getLandingMarket();
  return <LandingPage market={market} />;
}
