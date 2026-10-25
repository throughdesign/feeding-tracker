import { startBreast, type BreastSide } from "@isaac/shared";
import { Baby, Check, History, Milk, X } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button, Divider, Icon, Loader, Tabs, Text, View, useToast } from "reshaped";
import { ErrorAlert } from "../../components/ErrorAlert";
import { PageHeader } from "../../components/PageHeader";
import { useActiveFeeding, useCreateFeeding } from "../../lib/queries";
import { BottleForm, BreastForm } from "./SegmentForms";

type Mode = "bottle" | "breast";

export function NewFeedingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const active = useActiveFeeding();
  const create = useCreateFeeding();
  const [mode, setMode] = useState<Mode>("bottle");
  const [loggingEarlier, setLoggingEarlier] = useState(false);
  const [startingSide, setStartingSide] = useState<BreastSide | null>(null);

  if (active.isPending) return <Loader ariaLabel="Loading" />;
  // Only one feeding can run at a time; resume it instead of starting another.
  if (active.data) return <Navigate to={`/feeding/${active.data.id}`} replace />;

  const startLive = (breast: BreastSide) => {
    setStartingSide(breast);
    create.mutate(
      { status: "active", segments: startBreast([], breast, new Date().toISOString()) },
      { onSuccess: (feeding) => navigate(`/feeding/${feeding.id}`, { replace: true }) },
    );
  };

  const saved = (text: string) => {
    toast.show({ color: "positive", icon: Check, text, timeout: "short" });
    navigate("/", { replace: true });
  };

  return (
    <View gap={6}>
      <PageHeader title="New feeding" subtitle="How is Isaac being fed?" />

      <Tabs
        value={mode}
        onChange={({ value }) => setMode(value as Mode)}
        variant="pills-raised"
        itemWidth="equal"
      >
        <Tabs.List>
          <Tabs.Item value="bottle" icon={Milk}>
            Bottle
          </Tabs.Item>
          <Tabs.Item value="breast" icon={Baby}>
            Breast
          </Tabs.Item>
        </Tabs.List>
      </Tabs>

      <ErrorAlert
        error={create.error}
        title={mode === "breast" && !loggingEarlier ? "Could not start" : "Could not save"}
      />

      {mode === "breast" && (
        <View gap={4}>
          <Text color="neutral-faded">
            Start the timer on the first breast. You can pause, switch sides and add a bottle
            afterwards.
          </Text>
          <View direction="row" gap={3}>
            {(["left", "right"] as const).map((breast) => (
              <View.Item columns={6} key={breast}>
                <Button
                  size="xlarge"
                  color="primary"
                  fullWidth
                  loading={create.isPending && startingSide === breast}
                  disabled={create.isPending}
                  onClick={() => startLive(breast)}
                >
                  <View gap={1} align="center" paddingBlock={3}>
                    <Icon svg={Baby} size={6} />
                    <span>Start {breast}</span>
                  </View>
                </Button>
              </View.Item>
            ))}
          </View>

          {loggingEarlier ? (
            <View gap={4} paddingTop={2}>
              <Divider />
              <View direction="row" align="center" gap={2}>
                <View.Item grow>
                  <Text variant="body-1" weight="bold">
                    Log earlier breastfeeding
                  </Text>
                </View.Item>
                <Button
                  variant="ghost"
                  icon={X}
                  attributes={{ "aria-label": "Close earlier breastfeeding form" }}
                  onClick={() => setLoggingEarlier(false)}
                />
              </View>
              <Text variant="body-2" color="neutral-faded">
                Forgot to start the timer? Enter the times here. You can add the other breast or a
                bottle on the next screen.
              </Text>
              <BreastForm
                submitLabel="Save breastfeeding"
                onSubmit={async (segment) => {
                  const feeding = await create.mutateAsync({
                    status: "completed",
                    segments: [segment],
                  });
                  toast.show({
                    color: "positive",
                    icon: Check,
                    text: "Breastfeeding saved",
                    timeout: "short",
                  });
                  navigate(`/feeding/${feeding.id}`, { replace: true });
                }}
              />
            </View>
          ) : (
            <Button
              size="large"
              variant="outline"
              fullWidth
              icon={History}
              onClick={() => setLoggingEarlier(true)}
            >
              Log earlier
            </Button>
          )}
        </View>
      )}

      {mode === "bottle" && (
        <BottleForm
          draftKey="feeding:bottle"
          submitLabel="Save bottle"
          onSubmit={async (segment) => {
            await create.mutateAsync({ status: "completed", segments: [segment] });
            saved("Bottle feeding saved");
          }}
        />
      )}
    </View>
  );
}
