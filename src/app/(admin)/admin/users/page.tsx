"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  planName?: string;
  planExpiresAt?: string | null;
};

type Plan = {
  _id: string;
  name: string;
  durationDays: number;
  price: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [planId, setPlanId] = useState("");
  const [days, setDays] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const token = getAdminToken();
      const data = await apiGet("/api/v1/admin/users", token);
      setUsers((data as { users?: AdminUser[] }).users || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      setError(msg);
    }
  };

  const loadPlans = async () => {
    try {
      const token = getAdminToken();
      const data = await apiGet("/api/v1/admin/plans", token);
      setPlans((data as { plans?: Plan[] }).plans || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load plans";
      setError(msg);
    }
  };

  useEffect(() => {
    loadUsers();
    loadPlans();
  }, []);

  const openModal = (userId: string) => {
    setSelectedUser(userId);
    setPlanId("");
    setDays("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleUpdatePlan = async () => {
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      await apiPost(
        "/api/v1/admin/users/plan",
        {
          userId: selectedUser,
          planId,
          days: days ? Number(days) : undefined,
        },
        token
      );
      setMessage("Plan updated.");
      setShowModal(false);
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update plan";
      setError(msg);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="helper">Manage plans and access</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card">
        <div className="page-title">All users</div>
        <div className="table">
          <div className="table-row table-head users-row">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Plan</span>
            <span>Action</span>
          </div>
          {users.length === 0 ? (
            <div className="helper">No users found yet.</div>
          ) : (
            users.map((user) => (
              <div className="table-row users-row" key={user._id}>
                <span data-label="Name">{user.name}</span>
                <span data-label="Email">{user.email}</span>
                <span data-label="Role">{user.role}</span>
                <span data-label="Plan">
                  {user.planName || "-"}{" "}
                  {user.planExpiresAt
                    ? `(${new Date(user.planExpiresAt).toLocaleDateString()})`
                    : ""}
                </span>
                <div className="table-cell" data-label="Action">
                  <div className="cta-row">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => openModal(user._id)}
                    >
                      Update plan
                    </button>
                    <Link
                      className="btn btn-ghost"
                      href={`/admin/signals?userId=${user._id}`}
                    >
                      View signals
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal ? (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Update plan</div>
            <div className="form" style={{ marginTop: "16px" }}>
              <div className="input-group">
                <label className="label">Plan</label>
                <select
                  className="select"
                  value={planId}
                  onChange={(event) => setPlanId(event.target.value)}
                >
                  <option value="">Select plan</option>
                  {plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} ({plan.durationDays} days)
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Days (optional override)</label>
                <input
                  className="input"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  placeholder="Leave blank for default"
                />
              </div>
              <div className="cta-row">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleUpdatePlan}
                  disabled={!selectedUser || !planId}
                >
                  Save plan
                </button>
                <button className="btn btn-ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
              </div>
              {plans.length === 0 ? (
                <div className="helper">
                  No plans found. Create a plan first in the Plans page.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
