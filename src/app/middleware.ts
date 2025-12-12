import { withAuth } from "next-auth/middleware";

const middleware = withAuth({
  callbacks: {
    authorized: ({ token }) => {
      if (!token) return false;
      return !!(token as any).emailVerified;
    },
  },
});

export default middleware;

export const config = {
  matcher: ["/dashboard/:path*"],
};
