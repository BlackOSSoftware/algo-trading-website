"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type Plan = {
  _id: string;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
};

type PlanRequest = {
  _id: string;
  userId: string;
  planId: string;
  status: string;
  createdAt: string;
  amount?: number;
};

type AdminUser = {
  _id: string;
  name: string;
  email: string;
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const token = getAdminToken();
      const plansData = await apiGet("/api/v1/admin/plans", token);
      const requestPath =
        statusFilter && statusFilter !== "all"
          ? `/api/v1/admin/plan-requests?status=${statusFilter}`
          : "/api/v1/admin/plan-requests";
      const requestData = await apiGet(requestPath, token);
      const usersData = await apiGet("/api/v1/admin/users", token);
      setPlans((plansData as { plans?: Plan[] }).plans || []);
      setRequests((requestData as { requests?: PlanRequest[] }).requests || []);
      setUsers((usersData as { users?: AdminUser[] }).users || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreatePlan = async () => {
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      await apiPost(
        "/api/v1/admin/plans",
        {
          name,
          price: Number(price || 0),
          durationDays: Number(durationDays || 0),
        },
        token
      );
      setName("");
      setPrice("");
      setDurationDays("");
      setMessage("Plan created.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      setError(msg);
    }
  };

  const handleApprove = async (requestId: string) => {
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      await apiPost(
        `/api/v1/admin/plan-request/${requestId}/approve`,
        {},
        token
      );
      setMessage("Request updated.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    }
  };

  const handleReject = async (requestId: string) => {
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      await apiPost(
        `/api/v1/admin/plan-request/${requestId}/reject`,
        {},
        token
      );
      setMessage("Request updated.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Plans</div>
          <div className="helper">Create plans and approve requests</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="grid-2">
        <div className="card">
          <div className="page-title">Create plan</div>
          <div className="form" style={{ marginTop: "16px" }}>
            <div className="input-group">
              <label className="label">Plan name</label>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Pro"
              />
            </div>
            <div className="input-group">
              <label className="label">Price</label>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="999"
              />
            </div>
            <div className="input-group">
              <label className="label">Duration (days)</label>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                placeholder="30"
              />
            </div>
            <button className="btn btn-primary" type="button" onClick={handleCreatePlan}>
              Create plan
            </button>
          </div>
        </div>

        <div className="card">
          <div className="page-title">Active plans</div>
          <div className="table">
            <div className="table-row table-head">
              <span>Name</span>
              <span>Price</span>
              <span>Days</span>
              <span>Status</span>
            </div>
            {plans.map((plan) => (
              <div className="table-row" key={plan._id}>
                <span data-label="Name">{plan.name}</span>
                <span data-label="Price">Rs. {plan.price}</span>
                <span data-label="Days">{plan.durationDays}</span>
                <span data-label="Status">{plan.active ? "Active" : "Inactive"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Plan requests</div>
        <div className="list" style={{ margin: "12px 0" }}>
          <div className="list-item" style={{ justifyContent: "space-between" }}>
            <span>Filter</span>
            <select
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="active">Active</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>User</span>
            <span>Plan</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {requests.length === 0 ? (
            <div className="helper">No requests yet.</div>
          ) : (
            requests.map((req) => {
              const isPaid = req.status === "paid";
              const canReject = req.status === "pending" || req.status === "paid";
              return (
                <div className="table-row" key={req._id}>
                  <span data-label="User">
                    {users.find((u) => u._id === req.userId)?.email || req.userId}
                  </span>
                  <span data-label="Plan">
                    {plans.find((p) => p._id === req.planId)?.name || req.planId}
                  </span>
                  <span data-label="Status">{req.status}</span>
                  <div className="table-cell" data-label="Action">
                    <div className="cta-row">
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => handleApprove(req._id)}
                        disabled={!isPaid}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => handleReject(req._id)}
                        disabled={!canReject}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
