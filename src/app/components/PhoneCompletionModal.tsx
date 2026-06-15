import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

/**
 * Phase 17 — first-login phone capture.
 *
 * Renders when an authenticated user is missing a phone number. Cannot be
 * dismissed (no close button, ignores escape / outside-click). On success the
 * phone is saved server-side, the local user object is refreshed from /auth/me,
 * and the modal unmounts. The phone column is also rendered read-only on the
 * profile page so it cannot be edited later via UI.
 */
const EGY_PHONE = /^(?:\+?20|0)?1[0-2,5]\d{8}$/;

export function PhoneCompletionModal() {
  const { user, login, token } = useAuth();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsPhone = !!user && (!user.phone || user.phone.trim() === "");
  if (!needsPhone) return null;

  const valid = EGY_PHONE.test(phone.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/complete-profile", { phone: phone.trim() });
      // Refresh local user object so the modal unmounts and other pages see the phone.
      if (token) login(token as string, data);
      toast.success("Phone saved — thanks!");
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      let msg = "Could not save phone. Please try again.";
      if (status === 409 && body?.message) msg = body.message;
      else if (status === 400 && body && typeof body === "object") {
        const fieldErrs = Object.entries(body)
          .filter(([k, v]) => typeof v === "string"
            && k !== "timestamp" && k !== "status" && k !== "path" && k !== "error")
          .map(([, v]) => v as string);
        if (fieldErrs.length) msg = fieldErrs.join(" • ");
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>One more thing — your phone number</DialogTitle>
          <DialogDescription>
            We need a valid Egyptian mobile number so hospitals and donors can reach
            you for urgent blood requests. This is required before you can continue.
            Once saved, it cannot be changed from the app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="phone-input">
              Phone (Egyptian format)
            </label>
            <Input
              id="phone-input"
              autoFocus
              type="tel"
              inputMode="tel"
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={phone.length > 0 && !valid}
              aria-describedby="phone-help"
            />
            <p id="phone-help" className="mt-1 text-xs text-gray-500">
              Accepted: 01XXXXXXXXX, +201XXXXXXXXX, or 201XXXXXXXXX
            </p>
            {phone.length > 0 && !valid && (
              <p className="mt-1 text-xs text-red-600">
                Not a valid Egyptian mobile number.
              </p>
            )}
          </div>
          <Button type="submit" disabled={!valid || submitting} className="w-full">
            {submitting ? "Saving…" : "Save phone & continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
