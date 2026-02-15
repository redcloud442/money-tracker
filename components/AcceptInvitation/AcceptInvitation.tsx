"use client";
import { authClient } from "@/lib/better-auth/auth-client";
import { IconAlertCircle, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface AcceptInvitationProps {
  action: "accept" | "reject";
}

const AcceptInvitation = ({ action }: AcceptInvitationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const handleInvite = async () => {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        if (action === "accept") {
          await authClient.organization.acceptInvitation({
            invitationId: token,
          });
        } else {
          await authClient.organization.rejectInvitation({
            invitationId: token,
          });
        }
        setStatus("success");
      } catch (err) {
        console.error("Failed to process invitation:", err);
        setStatus("error");
      }
    };

    handleInvite();
  }, [token, action]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        {/* LOADING STATE */}
        {status === "loading" && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <IconLoader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              Processing Request
            </h2>
            <p className="mt-2 text-slate-500">
              Please wait while we {action === "accept" ? "accept" : "reject"}{" "}
              your invitation...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {status === "error" && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <IconAlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              Something went wrong
            </h2>
            <p className="mt-2 text-slate-500">
              The invitation link is either invalid, expired, or has already
              been used.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-8 w-full px-6 py-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm"
            >
              Back to Login
            </button>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === "success" && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <IconCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              Successfully {action === "accept" ? "Accepted" : "Rejected"}
            </h2>
            <p className="mt-2 text-slate-500">
              Your request has been processed. You can now continue to the
              application.
            </p>
            <button
              onClick={() =>
                router.push(action === "accept" ? "/dashboard" : "/login")
              }
              className="mt-8 w-full px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              {action === "accept" ? "Go to Dashboard" : "Return to Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
