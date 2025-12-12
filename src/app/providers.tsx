"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/hooks/useLanguage";
 
 export function Providers({
   children,
 }: {
   children: React.ReactNode;
 }) {
   return (
     <SessionProvider>
       <LanguageProvider>{children}</LanguageProvider>
     </SessionProvider>
   );
 }

