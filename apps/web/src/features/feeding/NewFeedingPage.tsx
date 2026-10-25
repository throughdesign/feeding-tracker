import { startBreast, type BreastSide } from "@isaac/shared";
import { Baby, Check, Milk, Timer } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button, Divider, Icon, Loader, Tabs, Text, View, useToast } from "reshaped";
import { ErrorAlert } from "../../components/ErrorAlert";
import { PageHeader } from "../../components/PageHeader";
import { useActiveFeeding, useCreateFeeding } from "../../lib/queries";
import { BottleForm, BreastForm } from "./SegmentForms";

type Mode = "breast" | "bottle" | "past";

export function NewFeedingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const active = useActiveFeeding();
  const create = useCreateFeeding();
  const [mode, setMode] = useState<Mode>("breast");
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
      <PageHeader title="Log feeding" subtitle="What did Isaac have?" />

      <Tabs
        value={mode}
        onChange={({ value }) => setMode(value as Mode)}
        variant="pills-raised"
        itemWidth="equal"
      >
        <Tabs.List>
          <Tabs.Item value="breast" icon={Baby}>
            Breast
          </Tabs.Item>
          <Tabs.Item value="bottle" icon={Milk}>
            Bottle
          </Tabs.Item>
          <Tabs.Item value="past" icon={Timer}>
            Earlier
          </Tabs.Item>
        </Tabs.List>
      </Tabs>

      <ErrorAlert
        error={create.error}
        title={mode === "breast" ? "Could not start" : "Could not save"}
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

      {mode === "past" && (
        <View gap={4}>
          <Text color="neutral-faded">
            Forgot to start the timer? Enter the times here. You can add the other breast or a
            bottle on the next screen.
          </Text>
          <Divider />
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
      )}
    </View>
  );
}
