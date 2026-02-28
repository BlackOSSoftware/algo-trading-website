"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";

type UserPlan = {
  planName?: string;
  planExpiresAt?: string | null;
};

type Plan = {
  _id: string;
  name: string;
  price: number;
  durationDays: number;
};

type PlanRequest = {
  _id: string;
  planId: string;
  status: string;
  createdAt: string;
  amount?: number;
  razorpayOrderId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<UserPlan>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const now = Date.now();
  const planExpiryTs = plan.planExpiresAt ? new Date(plan.planExpiresAt).getTime() : null;
  const remainingDays =
    planExpiryTs !== null ? Math.max(0, Math.ceil((planExpiryTs - now) / 86400000)) : null;
  const isExpired = planExpiryTs !== null ? planExpiryTs <= now : false;

  const loadPlan = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/auth/me", token);
      const user = (data as { user?: UserPlan }).user || {};
      setPlan({
        planName: user.planName,
        planExpiresAt: user.planExpiresAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load plan";
      setError(msg);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await apiGet("/api/v1/plans");
      setPlans((data as { plans?: Plan[] }).plans || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load plans";
      setError(msg);
    }
  };

  const loadRequests = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/plans/requests", token);
      setRequests((data as { requests?: PlanRequest[] }).requests || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load requests";
      setError(msg);
    }
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if (window.Razorpay) return resolve(true);
      const existing = document.getElementById("razorpay-sdk");
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const startCheckout = async (
    order: RazorpayOrder,
    planItem: Plan,
    keyId: string,
    token: string
  ) => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError("Unable to load Razorpay checkout. Please try again.");
      return;
    }

    const options: RazorpayOptions = {
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Market Maya",
      description: `${planItem.name} plan`,
      order_id: order.id,
      handler: async (response) => {
        try {
          await apiPost(
            "/api/v1/plans/verify-payment",
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
            token
          );
          setMessage("Payment verified. Activation will be confirmed shortly.");
          await loadRequests();
          router.push("/subscription/pending");
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Payment verification failed";
          setError(msg);
        }
      },
      theme: { color: "#1f7a8c" },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on("payment.failed", (response) => {
      const msg = response.error?.description || "Payment failed.";
      setError(msg);
    });
    razorpay.open();
  };

  const handlePurchase = async (planItem: Plan) => {
    setError(null);
    setMessage(null);
    setRequestingPlanId(planItem._id);
    try {
      const token = getToken();
      if (!token) {
        setError("Please sign in to continue.");
        return;
      }

      const data = await apiPost(
        "/api/v1/plans/create-order",
        { planId: planItem._id },
        token
      );

      const order = (data as { order?: RazorpayOrder }).order;
      const keyId = (data as { keyId?: string }).keyId;
      if (!order || !keyId) {
        throw new Error("Unable to start payment");
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("wt_razorpay_key_id", keyId);
      }

      await startCheckout(order, planItem, keyId, token);
      await loadRequests();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
    }
    setRequestingPlanId(null);
  };

  const handleResume = async (planItem: Plan, request: PlanRequest) => {
    setError(null);
    setMessage(null);
    setRequestingPlanId(planItem._id);
    try {
      const token = getToken();
      if (!token) {
        setError("Please sign in to continue.");
        return;
      }
      if (!request.razorpayOrderId) {
        setError("Payment order not found. Please start a new purchase.");
        return;
      }

      const order: RazorpayOrder = {
        id: request.razorpayOrderId,
        amount: Math.round((planItem.price || 0) * 100),
        currency: "INR",
      };
      const storedKey =
        typeof window !== "undefined"
          ? localStorage.getItem("wt_razorpay_key_id")
          : "";
      const keyId =
        storedKey || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      if (!keyId) {
        setError("Payment key is not configured.");
        return;
      }
      await startCheckout(order, planItem, keyId, token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to resume payment";
      setError(msg);
    } finally {
      setRequestingPlanId(null);
    }
  };

  useEffect(() => {
    loadPlan();
    loadPlans();
    loadRequests();
  }, []);

  const latestRequest = useMemo(() => {
    if (requests.length === 0) return null;
    return [...requests].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];
  }, [requests]);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Subscription</div>
          <div className="helper">Manage plans and billing</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="plan-grid">
        {plans.length === 0 ? (
          <div className="card">No plans available.</div>
        ) : (
          plans.map((item) => {
            const request = requests.find((req) => req.planId === item._id);
            const isPending = request?.status === "pending";
            const isPaid = request?.status === "paid";
            const isActive = request?.status === "active";
            return (
              <div className="plan-card" key={item._id}>
                <h4>{item.name}</h4>
                <div className="plan-price">Rs. {item.price}</div>
                <div className="helper">{item.durationDays} days access</div>
                <div className="list" style={{ marginTop: "16px" }}>
                  <div className="list-item">Alerts + strategies</div>
                  <div className="list-item">Telegram access</div>
                </div>
                {request ? (
                  <div className="helper" style={{ marginTop: "10px" }}>
                    Status: <span className="badge">{request.status}</span>
                  </div>
                ) : null}
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() =>
                    isPending && request?.razorpayOrderId
                      ? handleResume(item, request)
                      : handlePurchase(item)
                  }
                  style={{ marginTop: "16px" }}
                  disabled={isActive || isPaid || requestingPlanId === item._id}
                >
                  {requestingPlanId === item._id
                    ? "Processing..."
                    : isPending
                    ? "Continue payment"
                    : isPaid
                    ? "Payment verified"
                    : isActive
                    ? "Active"
                    : "Buy now"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {latestRequest ? (
        <div className="card">
          <div className="page-title">Latest payment</div>
          <div className="helper">
            Status: <span className="badge">{latestRequest.status}</span>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            style={{ marginTop: "12px" }}
            onClick={() => router.push("/subscription/pending")}
          >
            View payment status
          </button>
        </div>
      ) : null}

      <div className="card">
        <div className="page-title">Current plan</div>
        <div className="list">
          <div className="list-item">
            <span>Plan</span>
            <span className="badge">
              {plan.planName ? (isExpired ? "Expired" : plan.planName) : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Expires on</span>
            <span>
              {plan.planExpiresAt
                ? new Date(plan.planExpiresAt).toLocaleDateString()
                : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Remaining days</span>
            <span>{remainingDays !== null ? remainingDays : "-"}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Your requests</div>
        {requests.length === 0 ? (
          <div className="helper">No plan requests yet.</div>
        ) : (
          <div className="list">
            {requests.map((req) => (
              <div className="list-item" key={req._id}>
                <span>{plans.find((p) => p._id === req.planId)?.name || req.planId}</span>
                <span className="badge">{req.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
