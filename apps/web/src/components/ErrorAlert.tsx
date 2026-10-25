import { CircleAlert } from "lucide-react";
import { Alert, View } from "reshaped";
import { ApiError } from "../lib/api";

export function ErrorAlert({
  error,
  title = "Could not save",
}: {
  error: unknown;
  title?: string;
}) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong";
  const issues = error instanceof ApiError ? error.issues : [];
  return (
    <Alert color="critical" icon={CircleAlert} title={title}>
      <View gap={1}>
        <span>{message}</span>
        {issues.map((issue) => (
          <span key={`${issue.path}:${issue.message}`}>{issue.message}</span>
        ))}
      </View>
    </Alert>
  );
}
