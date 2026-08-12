import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { ListingForm } from "@/components/listing-form";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  if (!(await getCurrentAccount())) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Publier une annonce</h1>
        <p className="mt-2 text-muted">
          Décris ce que tu cherches. Tu valides ensuite chaque joueur qui
          demande à rejoindre.
        </p>
      </div>
      <ListingForm />
    </div>
  );
}
