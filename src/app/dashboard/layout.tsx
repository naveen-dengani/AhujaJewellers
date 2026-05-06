import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";
import prisma from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true },
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <Sidebar userName={user?.name || "User"} />
        <main className="main-content flex-1">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}