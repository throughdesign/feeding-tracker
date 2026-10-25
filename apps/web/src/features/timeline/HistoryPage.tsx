import { addDays, dateKeyInZone, isValidDateKey, type TimelineItem } from "@isaac/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Loader, Text, TextField, View, useToast } from "reshaped";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ErrorAlert } from "../../components/ErrorAlert";
import { useNow } from "../../hooks/useNow";
import { PageHeader } from "../../components/PageHeader";
import { formatDateKey, formatTime } from "../../lib/format";
import { useDashboard, useDeleteFeeding, useDeletePumping } from "../../lib/queries";
import { DaySummary } from "../dashboard/DashboardPage";
import { Timeline } from "./Timeline";

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const today = dateKeyInZone(useNow(60_000));
  const requested = params.get("date");
  const date = requested && isValidDateKey(requested) ? requested : today;
  const query = useDashboard(date);
  const toast = useToast();
  const deleteFeeding = useDeleteFeeding();
  const deletePumping = useDeletePumping();
  const [pendingDelete, setPendingDelete] = useState<TimelineItem | null>(null);

  const goTo = (next: string) => setParams(next === today ? {} : { date: next }, { replace: true });
  const deleting = deleteFeeding.isPending || deletePumping.isPending;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const mutation = pendingDelete.kind === "feeding" ? deleteFeeding : deletePumping;
    mutation.mutate(pendingDelete.id, {
      onSuccess: () => toast.show({ text: "Entry deleted", timeout: "short" }),
      onError: (error) => toast.show({ color: "critical", text: error.message }),
      onSettled: () => setPendingDelete(null),
    });
  };

  return (
    <View gap={6}>
      <PageHeader title="History" back={false} />

      <View direction="row" gap={2} align="center">
        <Button
          size="large"
          variant="outline"
          icon={ChevronLeft}
          attributes={{ "aria-label": "Previous day" }}
          onClick={() => goTo(addDays(date, -1))}
        />
        <View.Item grow>
          <TextField
            name="date"
            size="large"
            value={date}
            onChange={({ value }) => isValidDateKey(value) && goTo(value)}
            inputAttributes={{ type: "date", max: today, "aria-label": "Date" }}
          />
        </View.Item>
        <Button
          size="large"
          variant="outline"
          icon={ChevronRight}
          disabled={date >= today}
          attributes={{ "aria-label": "Next day" }}
          onClick={() => goTo(addDays(date, 1))}
        />
      </View>

      <Text as="h2" variant="featured-3" weight="bold">
        {date === today ? "Today" : formatDateKey(date)}
      </Text>

      {query.isPending && <Loader ariaLabel="Loading day" />}
      <ErrorAlert error={query.error} title="Could not load this day" />
      {query.data && (
        <>
          <Timeline
            items={query.data.timeline}
            emptyText="Nothing logged on this day."
            onDelete={setPendingDelete}
          />
          {query.data.timeline.length > 0 && <DaySummary dashboard={query.data} />}
        </>
      )}

      <ConfirmModal
        active={pendingDelete !== null}
        title={`Delete ${pendingDelete?.kind === "pumping" ? "pumping session" : "feeding"}?`}
        text={
          pendingDelete
            ? `The entry from ${formatTime(pendingDelete.startedAt)} will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}
