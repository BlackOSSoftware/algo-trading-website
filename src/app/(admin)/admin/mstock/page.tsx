"use client";

import MStockTypeBSessionCard from "@/components/admin/MStockTypeBSessionCard";

export default function AdminMStockPage() {
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">mStock Access</div>
          <div className="helper">
            Admin-only page for generating mStock Type B session tokens. This is used for
            candle data access, not for placing trades.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Why This Page Exists</div>
        <div className="helper" style={{ marginTop: "8px" }}>
          Keep mStock login separate from Market Maya manual trading. Use this page only
          when you need a fresh JWT token for candle-based price lookups.
        </div>
      </div>

      <MStockTypeBSessionCard />
    </div>
  );
}
