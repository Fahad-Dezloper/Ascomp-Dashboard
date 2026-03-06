import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AddFieldWorkerModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddFieldWorkerModal({
  onClose,
  onSuccess,
}: AddFieldWorkerModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "FIELD_WORKER",
    accessLevel: "FULL",
    pvrAccess: "BOTH",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [credentialsSent, setCredentialsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError("Name and email are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/field-workers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create field worker");
      }

      setCreatedUser(result.user);
      setCredentialsSent(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!createdUser) return;

    setSendingCredentials(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/field-workers/send-credentials",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: createdUser.id }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send credentials");
      }

      setCredentialsSent(true);
      toast.success("Credentials sent successfully", {
        description: `Login credentials have been sent to ${createdUser.email}`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send credentials",
      );
      toast.error("Failed to send credentials", {
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while sending credentials",
      });
    } finally {
      setSendingCredentials(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      role: "FIELD_WORKER",
      accessLevel: "FULL",
      pvrAccess: "BOTH",
    });
    setCreatedUser(null);
    setCredentialsSent(false);
    setError(null);
    onClose();
  };

  const pvrOptions = [
    { value: "PVR", label: "PVR Only" },
    { value: "NonPVR", label: "Non-PVR Only" },
    { value: "BOTH", label: "Both" },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>{createdUser ? "User Added!" : "Invite User"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!createdUser ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="email@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  An invitation email with login credentials will be sent to
                  this address.
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FIELD_WORKER">Field Worker</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Admin access level — only when role is ADMIN */}
              {formData.role === "ADMIN" && (
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Admin Access Level
                  </label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, accessLevel: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="FULL">Full Access</option>
                    <option value="READ_ONLY">Read Only Admin Access</option>
                  </select>
                </div>
              )}

              {/* Projector Type (PVR) Access */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Projector Type Access
                </label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Restrict which projector types this user can be assigned to.
                </p>
                <div className="flex gap-2">
                  {pvrOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, pvrAccess: value })
                      }
                      className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                        formData.pvrAccess === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="border-border bg-transparent"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Sending Invite..." : "Send Invite"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    User created successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {createdUser.name} ({createdUser.email})
                  </p>
                </div>
              </div>

              {/* Credentials Status */}
              {credentialsSent && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ✓ Login credentials have been sent to {createdUser.email}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="border-border bg-transparent"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleSendCredentials}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={sendingCredentials}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendingCredentials ? "Sending..." : "Resend Credentials"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
