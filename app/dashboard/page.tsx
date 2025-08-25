"use client";

import React from "react";

// Import components statically instead of using dynamic imports
import DashboardConsolidated from "../../components/dashboard/dashboard-consolidated";
// Removed detailed charts to improve responsivity and performance per user request

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto w-full">
      <DashboardConsolidated />
    </div>
  );
}

