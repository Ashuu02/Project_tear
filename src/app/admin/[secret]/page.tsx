import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie, isRouteSecretCorrect } from "@/lib/adminAuth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage({ params }: { params: { secret: string } }) {
  if (!process.env.ADMIN_ROUTE_SECRET || !isRouteSecretCorrect(params.secret)) {
    notFound();
  }

  const cookieStore = cookies();
  const authed = isValidAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!authed) {
    return <AdminLoginForm secret={params.secret} />;
  }

  return <AdminDashboard />;
}
