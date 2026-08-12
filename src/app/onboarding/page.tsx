import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { AccountForm } from "@/components/account-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (await getCurrentAccount()) redirect("/me");

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Créer ton profil</h1>
        <p className="mt-2 text-muted">
          Pas d&apos;e-mail, pas de mot de passe : tu reçois un numéro de compte
          unique à la fin. Seul le nom d&apos;utilisateur est obligatoire.
        </p>
      </div>

      <AccountForm mode="register" />

      <p className="text-center text-sm text-muted">
        Tu as déjà un numéro de compte ?{" "}
        <Link href="/login" className="focus-ring rounded text-accent">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
