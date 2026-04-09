import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-super-secret-jwt-key-min-32-chars");

export default async function AdminPage() {
  // Check if user has admin token
  const cookieStore = await cookies();
  const token = cookieStore.get("sy_session")?.value;
  
  if (!token) {
    redirect("/app");
  }
  
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload?.role === "ADMIN") {
      redirect("/admin/analytics");
    }
  } catch (error) {
    // Token invalid or expired
  }
  
  redirect("/app");
}
