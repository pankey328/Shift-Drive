"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/redux/hooks";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const router = useRouter();
  const { user, token, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !token) {
        router.replace("/login");
        return;
      }

      if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        router.replace("/");
        return;
      }
    }
  }, [loading, isAuthenticated, token, user, allowedRoles, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-xs text-neutral-400 font-medium">Verifying access...</span>
      </div>
    );
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
