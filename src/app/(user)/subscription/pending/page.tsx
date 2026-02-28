"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";

type PlanRequest = {
  _id: string;
  planId: string;
  status: string;
  createdAt: string;
  startDate?: string | null;
  endDate?: string | null;
  razorpayOrderId?: string | null;
};

type Plan = {
  _id: string;
  name: string;
  durationDays: number;
};

export default function SubscriptionPendingPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const [requestsData, plansData] = await Promise.all([
        apiGet("/api/v1/plans/requests", token),
        apiGet("/api/v1/plans"),
      ]);
      setRequests((requestsData as { requests?: PlanRequest[] }).requests || []);
      setPlans((plansData as { plans?: Plan[] }).plans || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load payment status";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const latestRequest = useMemo(() => {
    if (requests.length === 0) return null;
    return [...requests].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];
  }, [requests]);

  const getPlanName = (planId: string) =>
    plans.find((plan) => plan._id === planId)?.name || planId;

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Payment Status</div>
          <div className="helper">We will activate your plan after payment confirmation.</div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadData}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="page-title">Latest payment</div>
        {latestRequest ? (
          <div className="list" style={{ marginTop: "12px" }}>
            <div className="list-item">
              <span>Plan</span>
              <span className="badge">{getPlanName(latestRequest.planId)}</span>
            </div>
            <div className="list-item">
              <span>Status</span>
              <span className="badge">{latestRequest.status}</span>
            </div>
            <div className="list-item">
              <span>Order</span>
              <span>{latestRequest.razorpayOrderId || "-"}</span>
            </div>
            <div className="list-item">
              <span>Start</span>
              <span>
                {latestRequest.startDate
                  ? new Date(latestRequest.startDate).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="list-item">
              <span>End</span>
              <span>
                {latestRequest.endDate
                  ? new Date(latestRequest.endDate).toLocaleDateString()
                  : "-"}
              </span>
            </div>
          </div>
        ) : (
          <div className="helper" style={{ marginTop: "12px" }}>
            No payment activity yet.
          </div>
        )}
      </div>

      <div className="card">
        <div className="page-title">What happens next?</div>
        <div className="list" style={{ marginTop: "12px" }}>
          <div className="list-item">If status is "paid", activation happens via Razorpay webhook.</div>
          <div className="list-item">If status is "pending", reopen the payment from Subscription page.</div>
          <div className="list-item">If status is "failed", start a new purchase.</div>
        </div>
      </div>
    </div>
  );
}
