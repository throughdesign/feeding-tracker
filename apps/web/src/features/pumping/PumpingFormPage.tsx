import { zodResolver } from "@hookform/resolvers/zod";
import { pumpingTotal, toZonedInputValue, type PumpingWithTotal } from "@isaac/shared";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { Button, FormControl, Loader, Text, TextArea, View, useToast } from "reshaped";
import { z } from "zod";
import { ConfirmModal } from "../../components/ConfirmModal";
import { DateTimeField } from "../../components/DateTimeField";
import { ErrorAlert } from "../../components/ErrorAlert";
import { PageHeader } from "../../components/PageHeader";
import { VolumeField } from "../../components/VolumeField";
import { clearDraft, loadDraft, useDraft } from "../../hooks/useDraft";
import { formatPumpingTotal } from "../../lib/format";
import {
  endNotBeforeStart,
  localDateTime,
  optionalVolume,
  parseVolume,
  toIsoKeeping,
} from "../../lib/form-schemas";
import {
  useCreatePumping,
  useDeletePumping,
  usePumping,
  useUpdatePumping,
} from "../../lib/queries";

const FormSchema = z
  .object({
    startedAt: localDateTime,
    endedAt: localDateTime,
    left: optionalVolume,
    right: optionalVolume,
    notes: z.string().max(2000),
  })
  .superRefine(endNotBeforeStart);

type FormValues = z.infer<typeof FormSchema>;

const DRAFT_KEY = "pumping:new";

function defaults(session?: PumpingWithTotal): FormValues {
  if (session) {
    return {
      startedAt: toZonedInputValue(session.startedAt),
      endedAt: toZonedInputValue(session.endedAt ?? session.startedAt),
      left: session.leftVolumeMl?.toString() ?? "",
      right: session.rightVolumeMl?.toString() ?? "",
      notes: session.notes ?? "",
    };
  }
  const now = Date.now();
  return (
    loadDraft<FormValues>(DRAFT_KEY) ?? {
      startedAt: toZonedInputValue(new Date(now - 20 * 60_000).toISOString()),
      endedAt: toZonedInputValue(new Date(now).toISOString()),
      left: "",
      right: "",
      notes: "",
    }
  );
}

export function PumpingFormPage() {
  const { id } = useParams();
  const query = usePumping(id);
  if (id && query.isPending) return <Loader ariaLabel="Loading" />;
  if (id && query.isError) return <ErrorAlert error={query.error} title="Could not load session" />;
  return <PumpingForm key={id ?? "new"} session={query.data} />;
}

function PumpingForm({ session }: { session?: PumpingWithTotal }) {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreatePumping();
  const update = useUpdatePumping(session?.id ?? "");
  const remove = useDeletePumping();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaults(session),
  });
  useDraft(session ? null : DRAFT_KEY, form);
  const { control, handleSubmit, formState } = form;

  const [left, right] = useWatch({ control, name: ["left", "right"] });
  const total = pumpingTotal({
    leftVolumeMl: optionalVolume.safeParse(left).success ? parseVolume(left) : null,
    rightVolumeMl: optionalVolume.safeParse(right).success ? parseVolume(right) : null,
  });

  const mutation = session ? update : create;

  const onSubmit = handleSubmit(async (values) => {
    const input = {
      startedAt: toIsoKeeping(values.startedAt, session?.startedAt),
      endedAt: toIsoKeeping(values.endedAt, session?.endedAt),
      leftVolumeMl: parseVolume(values.left),
      rightVolumeMl: parseVolume(values.right),
      notes: values.notes.trim() || undefined,
    };
    try {
      await mutation.mutateAsync(input);
    } catch {
      return; // Rendered by <ErrorAlert>.
    }
    if (!session) clearDraft(DRAFT_KEY);
    toast.show({
      color: "positive",
      icon: Check,
      text: session ? "Pumping session updated" : "Pumping session saved",
      timeout: "short",
    });
    navigate(-1);
  });

  return (
    <View gap={6}>
      <PageHeader
        title={session ? "Edit pumping" : "Log pumping"}
        subtitle="Milk expressed by Mother"
        endSlot={
          session && (
            <Button
              variant="ghost"
              color="critical"
              icon={Trash2}
              attributes={{ "aria-label": "Delete pumping session" }}
              onClick={() => setConfirmDelete(true)}
            />
          )
        }
      />

      <form onSubmit={onSubmit} noValidate>
        <View gap={5}>
          <View direction="row" gap={3}>
            <View.Item columns={6}>
              <Controller
                control={control}
                name="startedAt"
                render={({ field, fieldState }) => (
                  <DateTimeField
                    name={field.name}
                    label="Start"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View.Item>
            <View.Item columns={6}>
              <Controller
                control={control}
                name="endedAt"
                render={({ field, fieldState }) => (
                  <DateTimeField
                    name={field.name}
                    label="End"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View.Item>
          </View>

          <View direction="row" gap={3}>
            {(["left", "right"] as const).map((side) => (
              <View.Item columns={6} key={side}>
                <Controller
                  control={control}
                  name={side}
                  render={({ field, fieldState }) => (
                    <VolumeField
                      name={field.name}
                      label={side === "left" ? "Left breast" : "Right breast"}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Not measured"
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View.Item>
            ))}
          </View>
          <Text variant="caption-1" color="neutral-faded">
            Leave a side empty if it was not measured. Enter 0 if nothing was expressed.
          </Text>

          <View
            padding={4}
            borderRadius="medium"
            backgroundColor="neutral-faded"
            direction="row"
            justify="space-between"
            align="center"
            attributes={{ "aria-live": "polite" }}
          >
            <Text variant="body-1" weight="medium">
              {total.kind === "complete" ? "Total" : "Total (incomplete)"}
            </Text>
            <Text variant="featured-3" weight="bold" numeric>
              {formatPumpingTotal(total)}
            </Text>
          </View>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormControl>
                <FormControl.Label>Notes (optional)</FormControl.Label>
                <TextArea
                  name={field.name}
                  value={field.value}
                  onChange={({ value }) => field.onChange(value)}
                />
              </FormControl>
            )}
          />

          <ErrorAlert error={mutation.error} />

          <Button
            type="submit"
            color="primary"
            size="xlarge"
            fullWidth
            icon={Check}
            loading={formState.isSubmitting}
          >
            {session ? "Save changes" : "Save pumping"}
          </Button>
        </View>
      </form>

      {session && (
        <ConfirmModal
          active={confirmDelete}
          title="Delete this pumping session?"
          text="This cannot be undone."
          confirmLabel="Delete"
          loading={remove.isPending}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() =>
            remove.mutate(session.id, {
              onSuccess: () => {
                toast.show({ text: "Pumping session deleted", timeout: "short" });
                navigate("/", { replace: true });
              },
              onError: (error) => {
                setConfirmDelete(false);
                toast.show({ color: "critical", text: error.message });
              },
            })
          }
        />
      )}
    </View>
  );
}
