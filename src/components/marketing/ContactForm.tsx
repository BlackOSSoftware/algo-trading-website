"use client";

import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";

type ContactStatus = {
  tone: "success" | "error";
  message: string;
} | null;

export function ContactForm({ source = "website" }: { source?: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ContactStatus>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
      source,
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus({
        tone: "error",
        message: "Please fill in your name, email, and message.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/v1/contact", payload);
      setForm({ name: "", email: "", message: "" });
      setStatus({
        tone: "success",
        message: "Your message has been sent. We will get back to you within 24 hours.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to send your message right now.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="input-group">
        <label className="label" htmlFor="contact-name">
          Name
        </label>
        <input
          className="input"
          id="contact-name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Your name"
        />
      </div>
      <div className="input-group">
        <label className="label" htmlFor="contact-email">
          Email
        </label>
        <input
          className="input"
          id="contact-email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="you@example.com"
        />
      </div>
      <div className="input-group">
        <label className="label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          className="textarea"
          id="contact-message"
          rows={6}
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          placeholder="Tell us what you need help with."
        />
      </div>

      {status ? (
        <div className={`alert ${status.tone === "success" ? "alert-success" : "alert-error"}`}>
          {status.message}
        </div>
      ) : null}

      <button className="btn btn-primary btn-glow" type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
