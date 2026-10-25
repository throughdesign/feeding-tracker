import { useNavigate } from "react-router";
import { Button, Text, View } from "reshaped";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <View gap={4} align="start">
      <Text as="h1" variant="featured-2" weight="bold">
        Page not found
      </Text>
      <Button size="large" onClick={() => navigate("/")}>
        Back to today
      </Button>
    </View>
  );
}
