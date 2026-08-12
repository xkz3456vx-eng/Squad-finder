import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAccount()) redirect("/me");

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Se connecter</h1>
        <p className="mt-2 text-muted">
          Entre le numéro de compte reçu à l&apos;inscription.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
