import { redirect } from "next/navigation";

export default function AdminPage() {
  // Client-side auth is handled by AdminLayout
  // Simply redirect to analytics dashboard
  redirect("/admin/analytics");
}
