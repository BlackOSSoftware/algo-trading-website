"use client";

import { useEffect, useState } from "react";
import { fetchSession, type SessionUser } from "@/lib/session";

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const session = await fetchSession(undefined, () => {});
      if (!active) return;
      setUser(session);
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Profile</div>
          <div className="helper">Manage account and notification settings</div>
        </div>
        <button className="btn btn-primary" type="button">
          Save changes
        </button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="page-title">User Details</div>
          <div className="form" style={{ marginTop: "16px" }}>
            <div className="input-group">
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                className="input"
                id="name"
                value={user?.name ?? ""}
                readOnly
              />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                className="input"
                id="email"
                value={user?.email ?? ""}
                readOnly
              />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="phone">
                Phone
              </label>
              <input
                className="input"
                id="phone"
                value={user?.phone ?? ""}
                placeholder="+91 90000 00000"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="page-title">Notification Rules</div>
          <div className="list">
            <div className="list-item">
              <span>Webhook alerts</span>
              <span className="badge">Enabled</span>
            </div>
            <div className="list-item">
              <span>Telegram alerts</span>
              <span className="badge">Linked</span>
            </div>
            <div className="list-item">
              <span>Daily summary</span>
              <span className="badge">On</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

