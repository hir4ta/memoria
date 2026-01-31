import { Navigate } from "react-router";

// Redirect to decisions list - detail is now shown in Dialog
export function DecisionDetailPage() {
  return <Navigate to="/decisions" replace />;
}
