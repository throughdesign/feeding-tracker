import {
  breastfeedingDurationMs,
  finishSegments,
  isSegmentPaused,
  openBreastSegment,
  pauseBreast,
  resumeBreast,
  startBreast,
  stopBreast,
  summarizeFeeding,
  switchBreast,
  type BreastSide,
  type FeedingSegmentInput,
  type FeedingWithSummary,
  type UpdateFeedingSessionInput,
} from "@isaac/shared";
import {
  ArrowLeftRight,
  Baby,
  Check,
  Milk,
  Pause,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Badge,
  Button,
  Card,
  Divider,
  FormControl,
  Icon,
  Loader,
  Modal,
  Text,
  TextArea,
  View,
  useToast,
} from "reshaped";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ErrorAlert } from "../../components/ErrorAlert";
import { PageHeader } from "../../components/PageHeader";
import { useNow } from "../../hooks/useNow";
import {
  breastLabel,
  formatClock,
  formatMinutes,
  formatMl,
  formatTime,
  formatTimeRange,
  milkTypeLabel,
} from "../../lib/format";
import { useDeleteFeeding, useFeeding, useUpdateFeeding } from "../../lib/queries";
import { feedingTitle } from "../timeline/describe";
import { BottleForm, BreastForm } from "./SegmentForms";

type Editing = { type: "bottle" | "breastfeeding"; index: number | null } | null;

export function FeedingSessionPage() {
  const { id } = useParams();
  const query = useFeeding(id);
  if (query.isPending) return <Loader ariaLabel="Loading feeding" />;
  if (query.isError) return <ErrorAlert error={query.error} title="Could not load feeding" />;
  return <FeedingSession feeding={query.data} />;
}

function FeedingSession({ feeding }: { feeding: FeedingWithSummary }) {
  const navigate = useNavigate();
  const toast = useToast();
  const update = useUpdateFeeding(feeding.id);
  const remove = useDeleteFeeding();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState(feeding.notes ?? "");

  const isActive = feeding.status === "active";
  const now = useNow(1000, isActive);
  const segments = feeding.segments as FeedingSegmentInput[];
  const summary = summarizeFeeding(feeding, now);

  const save = (input: UpdateFeedingSessionInput) => update.mutateAsync(input);
  /** Applies a timer transition at the moment of the tap and persists it. */
  const act = (
    transition: (segments: FeedingSegmentInput[], at: string) => FeedingSegmentInput[],
  ) => {
    if (update.isPending) return;
    update.mutate({ segments: transition(segments, new Date().toISOString()) });
  };

  const saveSegment = async (segment: FeedingSegmentInput) => {
    const index = editing?.index ?? null;
    let next =
      index === null ? [...segments, segment] : segments.map((s, i) => (i === index ? segment : s));
    // Starting a live breast while another is open: stop the other one first.
    if (segment.type === "breastfeeding" && segment.endedAt === null) {
      next = next.map((s) =>
        s !== segment && s.type === "breastfeeding" && s.endedAt === null
          ? stopBreast([s], segment.startedAt)[0]!
          : s,
      );
    }
    await save({ segments: next });
    setEditing(null);
    toast.show({ color: "positive", icon: Check, text: "Saved", timeout: "short" });
  };

  const removeSegment = (index: number) => {
    update.mutate(
      { segments: segments.filter((_, i) => i !== index) },
      { onSettled: () => setRemoveIndex(null) },
    );
  };

  const finish = () =>
    update.mutate(
      { status: "completed", segments: finishSegments(segments, new Date().toISOString()) },
      {
        onSuccess: () => {
          toast.show({ color: "positive", icon: Check, text: "Feeding saved", timeout: "short" });
          navigate("/", { replace: true });
        },
      },
    );

  const editingSegment = editing?.index != null ? segments[editing.index] : undefined;

  return (
    <View gap={6}>
      <PageHeader
        title={isActive ? "Feeding in progress" : feedingTitle(feeding)}
        subtitle={`Started ${formatTime(feeding.startedAt)}${feeding.endedAt ? ` · ended ${formatTime(feeding.endedAt)}` : ""}`}
        endSlot={
          <Button
            variant="ghost"
            color="critical"
            icon={Trash2}
            attributes={{ "aria-label": "Delete feeding" }}
            onClick={() => setConfirmDelete(true)}
          />
        }
      />

      {isActive && (
        <LivePanel
          segments={segments}
          now={now}
          busy={update.isPending}
          onPause={() => act(pauseBreast)}
          onResume={() => act(resumeBreast)}
          onSwitch={() => act(switchBreast)}
          onStop={() => act(stopBreast)}
          onStart={(breast) => act((s, at) => startBreast(s, breast, at))}
          onFinish={finish}
        />
      )}

      <ErrorAlert error={update.error} />

      <View gap={3}>
        <View direction="row" justify="space-between" align="center">
          <Text as="h2" variant="featured-3" weight="bold">
            Details
          </Text>
          <Text variant="body-2" color="neutral-faded" numeric>
            {summary.hasBreastfeeding && `Breast ${formatMinutes(summary.breastfeeding.totalMs)}`}
            {summary.hasBreastfeeding && summary.hasBottle && " · "}
            {summary.hasBottle && `Bottle ${formatMl(summary.bottle.consumedMl)}`}
          </Text>
        </View>
        <View as="ol" gap={2}>
          {segments.map((segment, index) => (
            <View as="li" key={segment.id ?? index}>
              <SegmentRow
                segment={segment}
                now={now}
                canRemove={segments.length > 1}
                onEdit={() => setEditing({ type: segment.type, index })}
                onRemove={() => setRemoveIndex(index)}
              />
            </View>
          ))}
        </View>
        <View direction="row" gap={2}>
          <View.Item grow>
            <Button
              fullWidth
              size="large"
              variant="outline"
              icon={Plus}
              onClick={() => setEditing({ type: "bottle", index: null })}
            >
              Add bottle
            </Button>
          </View.Item>
          <View.Item grow>
            <Button
              fullWidth
              size="large"
              variant="outline"
              icon={Plus}
              onClick={() => setEditing({ type: "breastfeeding", index: null })}
            >
              Add breast
            </Button>
          </View.Item>
        </View>
      </View>

      <FormControl>
        <FormControl.Label>Notes</FormControl.Label>
        <TextArea name="notes" value={notes} onChange={({ value }) => setNotes(value)} />
        {notes !== (feeding.notes ?? "") && (
          <View paddingTop={2}>
            <Button
              size="large"
              variant="outline"
              loading={update.isPending}
              onClick={() => update.mutate({ notes })}
            >
              Save notes
            </Button>
          </View>
        )}
      </FormControl>

      <Modal
        active={editing !== null}
        onClose={() => setEditing(null)}
        position={{ s: "bottom", m: "center" }}
        size="480px"
      >
        {editing && (
          <View gap={4}>
            <Modal.Title>
              {editing.index === null ? "Add" : "Edit"}{" "}
              {editing.type === "bottle" ? "bottle" : "breastfeeding"}
            </Modal.Title>
            <ErrorAlert error={update.error} />
            {editing.type === "bottle" ? (
              <BottleForm
                initial={editingSegment?.type === "bottle" ? editingSegment : undefined}
                defaultMilkType={summary.hasBreastfeeding ? "formula" : "expressed_breast_milk"}
                submitLabel="Save bottle"
                onSubmit={saveSegment}
              />
            ) : (
              <BreastForm
                initial={editingSegment?.type === "breastfeeding" ? editingSegment : undefined}
                allowOpen={
                  isActive &&
                  (editingSegment?.type === "breastfeeding"
                    ? editingSegment.endedAt === null
                    : false)
                }
                submitLabel="Save breastfeeding"
                onSubmit={saveSegment}
              />
            )}
          </View>
        )}
      </Modal>

      <ConfirmModal
        active={removeIndex !== null}
        title="Remove this part of the feeding?"
        text="The rest of the feeding is kept."
        confirmLabel="Remove"
        loading={update.isPending}
        onClose={() => setRemoveIndex(null)}
        onConfirm={() => removeIndex !== null && removeSegment(removeIndex)}
      />

      <ConfirmModal
        active={confirmDelete}
        title="Delete this feeding?"
        text="All breast and bottle details of this feeding will be removed. This cannot be undone."
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(feeding.id, {
            onSuccess: () => {
              toast.show({ text: "Feeding deleted", timeout: "short" });
              navigate("/", { replace: true });
            },
            onError: (error) => {
              setConfirmDelete(false);
              toast.show({ color: "critical", text: error.message });
            },
          })
        }
      />
    </View>
  );
}

function LivePanel(props: {
  segments: FeedingSegmentInput[];
  now: number;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onSwitch: () => void;
  onStop: () => void;
  onStart: (breast: BreastSide) => void;
  onFinish: () => void;
}) {
  const { segments, now, busy } = props;
  const open = openBreastSegment(segments);
  const paused = open ? isSegmentPaused(open) : false;
  const totals = { left: 0, right: 0 };
  for (const s of segments) {
    if (s.type === "breastfeeding") totals[s.breast] += breastfeedingDurationMs(s, now);
  }
  const other: BreastSide = open?.breast === "left" ? "right" : "left";

  return (
    <View padding={5} borderRadius="large" backgroundColor="primary-faded" gap={5}>
      <View gap={1} align="center" attributes={{ "aria-live": "polite" }}>
        <View direction="row" gap={2} align="center">
          <Text variant="body-1" weight="medium">
            {open ? `${breastLabel[open.breast]} breast` : "Timer stopped"}
          </Text>
          {paused && (
            <Badge color="warning" icon={Pause} size="small">
              Paused
            </Badge>
          )}
        </View>
        <Text
          variant="headline-2"
          weight="bold"
          numeric
          color={paused ? "neutral-faded" : undefined}
          attributes={{
            role: "timer",
            "aria-label": open ? `${breastLabel[open.breast]} breast elapsed time` : "Elapsed time",
          }}
        >
          {formatClock(open ? breastfeedingDurationMs(open, now) : 0)}
        </Text>
        <Text variant="body-2" color="neutral-faded" numeric>
          Left {formatClock(totals.left)} · Right {formatClock(totals.right)}
        </Text>
      </View>

      {open ? (
        <View gap={3}>
          <View direction="row" gap={3}>
            <View.Item columns={6}>
              <Button
                fullWidth
                size="xlarge"
                variant="outline"
                icon={paused ? Play : Pause}
                disabled={busy}
                onClick={paused ? props.onResume : props.onPause}
              >
                {paused ? "Resume" : "Pause"}
              </Button>
            </View.Item>
            <View.Item columns={6}>
              <Button
                fullWidth
                size="xlarge"
                variant="outline"
                icon={ArrowLeftRight}
                disabled={busy}
                onClick={props.onSwitch}
              >
                Switch to {other}
              </Button>
            </View.Item>
          </View>
          <Button
            fullWidth
            size="large"
            variant="ghost"
            icon={Square}
            disabled={busy}
            onClick={props.onStop}
          >
            Stop timer (e.g. before a bottle)
          </Button>
        </View>
      ) : (
        <View direction="row" gap={3}>
          {(["left", "right"] as const).map((breast) => (
            <View.Item columns={6} key={breast}>
              <Button
                fullWidth
                size="xlarge"
                variant="outline"
                icon={Play}
                disabled={busy}
                onClick={() => props.onStart(breast)}
              >
                Start {breast}
              </Button>
            </View.Item>
          ))}
        </View>
      )}

      <Divider />
      <Button
        fullWidth
        size="xlarge"
        color="primary"
        icon={Check}
        loading={busy}
        onClick={props.onFinish}
      >
        Finish feeding
      </Button>
    </View>
  );
}

function SegmentRow({
  segment,
  now,
  canRemove,
  onEdit,
  onRemove,
}: {
  segment: FeedingSegmentInput;
  now: number;
  canRemove: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const isBreast = segment.type === "breastfeeding";
  const paused = isBreast && isSegmentPaused(segment);
  const title = isBreast
    ? `${breastLabel[segment.breast]} breast`
    : `${milkTypeLabel[segment.milkType]} bottle`;
  const detail = isBreast
    ? `${formatMinutes(breastfeedingDurationMs(segment, now))}${segment.pauses.length ? ` · ${segment.pauses.length} pause${segment.pauses.length > 1 ? "s" : ""}` : ""} · volume not measured`
    : `Drank ${formatMl(segment.consumedMl)} of ${formatMl(segment.offeredMl)} offered`;

  return (
    <Card padding={3}>
      <View direction="row" gap={3} align="center">
        <Icon svg={isBreast ? Baby : Milk} size={5} color="primary" />
        <View.Item grow>
          <View gap={0}>
            <View direction="row" gap={2} align="center">
              <Text variant="body-1" weight="medium">
                {title}
              </Text>
              {segment.endedAt === null && (
                <Badge size="small" color={paused ? "warning" : "positive"} variant="faded">
                  {paused ? "Paused" : "Running"}
                </Badge>
              )}
            </View>
            <Text variant="body-2" color="neutral-faded" numeric>
              {formatTimeRange(segment.startedAt, segment.endedAt)} · {detail}
            </Text>
          </View>
        </View.Item>
        <Button
          variant="ghost"
          icon={Pencil}
          attributes={{ "aria-label": `Edit ${title}` }}
          onClick={onEdit}
        />
        {canRemove && (
          <Button
            variant="ghost"
            icon={Trash2}
            attributes={{ "aria-label": `Remove ${title}` }}
            onClick={onRemove}
          />
        )}
      </View>
    </Card>
  );
}
