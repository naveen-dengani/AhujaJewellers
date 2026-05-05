// import { auth } from "@/lib/auth";
// import { NextResponse } from "next/server";

// export default auth((req) => {
//   const isLoggedIn = !!req.auth;
//   const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
//   const isOnLogin = req.nextUrl.pathname.startsWith("/login");

//   if (isOnDashboard && !isOnLogin) {
//     if (!isLoggedIn) {
//       return NextResponse.redirect(new URL("/login", req.nextUrl));
//     }
//   }

//   return NextResponse.next();
// });

// export const config = {
//   matcher: ["/dashboard/:path*", "/login"],
// };

export function middleware() {}
