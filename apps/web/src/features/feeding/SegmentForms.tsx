import { zodResolver } from "@hookform/resolvers/zod";
import {
  BottleMilkTypeSchema,
  BreastSideSchema,
  breastfeedingDurationMs,
  fromZonedInputValue,
  toZonedInputValue,
  type BottleMilkType,
  type BreastSide,
  type FeedingSegmentInput,
} from "@isaac/shared";
import { Check } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button, FormControl, Text, ToggleButton, ToggleButtonGroup, View } from "reshaped";
import { z } from "zod";
import { DateTimeField } from "../../components/DateTimeField";
import { VolumeField } from "../../components/VolumeField";
import { clearDraft, loadDraft, useDraft } from "../../hooks/useDraft";
import { breastLabel, formatMinutes, milkTypeLabel } from "../../lib/format";
import {
  endNotBeforeStart,
  localDateTime,
  requiredVolume,
  toIsoKeeping,
} from "../../lib/form-schemas";

type BottleInput = Extract<FeedingSegmentInput, { type: "bottle" }>;
type BreastInput = Extract<FeedingSegmentInput, { type: "breastfeeding" }>;

function Choice<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <FormControl group>
      <FormControl.Label>{label}</FormControl.Label>
      <ToggleButtonGroup
        value={[value]}
        selectionMode="single"
        selectedColor="primary"
        attributes={{ "aria-label": label, role: "radiogroup", id: name }}
        onChange={({ value: next }) => {
          if (next[0]) onChange(next[0] as T);
        }}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value} size="large" fullWidth>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </FormControl>
  );
}

// ---------------------------------------------------------------------------
// Bottle
// ---------------------------------------------------------------------------

const BottleSchema = z
  .object({
    milkType: BottleMilkTypeSchema,
    offered: requiredVolume,
    consumed: requiredVolume,
    at: localDateTime,
  })
  .refine((v) => Number(v.consumed) <= Number(v.offered), {
    path: ["consumed"],
    message: "Cannot be more than was offered",
  });

type BottleValues = z.infer<typeof BottleSchema>;

const milkTypeOptions = (["expressed_breast_milk", "formula"] as const).map((value) => ({
  value,
  label: milkTypeLabel[value],
}));

export function BottleForm({
  initial,
  defaultMilkType = "expressed_breast_milk",
  draftKey,
  submitLabel,
  onSubmit,
}: {
  initial?: BottleInput;
  defaultMilkType?: BottleMilkType;
  /** Persist unsaved input for new entries. */
  draftKey?: string;
  submitLabel: string;
  onSubmit: (segment: BottleInput) => Promise<unknown>;
}) {
  const [createdAt] = useState(() => new Date().toISOString());
  const form = useForm<BottleValues>({
    resolver: zodResolver(BottleSchema),
    defaultValues: initial
      ? {
          milkType: initial.milkType,
          offered: String(initial.offeredMl),
          consumed: String(initial.consumedMl),
          at: toZonedInputValue(initial.startedAt),
        }
      : (draftKey && loadDraft<BottleValues>(draftKey)) || {
          milkType: defaultMilkType,
          offered: "",
          consumed: "",
          at: toZonedInputValue(createdAt),
        },
  });
  useDraft(draftKey ?? null, form);
  const { control, handleSubmit, formState } = form;

  const submit = handleSubmit(async (values) => {
    const at = toIsoKeeping(values.at, initial?.startedAt ?? createdAt);
    const ok = await onSubmit({
      ...initial,
      type: "bottle",
      milkType: values.milkType,
      offeredMl: Number(values.offered),
      consumedMl: Number(values.consumed),
      startedAt: at,
      endedAt:
        initial?.endedAt && initial.startedAt !== initial.endedAt
          ? new Date(
              Date.parse(at) + Date.parse(initial.endedAt) - Date.parse(initial.startedAt),
            ).toISOString()
          : at,
      // Changing the milk type would invalidate a batch link.
      milkBatchId: initial?.milkType === values.milkType ? initial.milkBatchId : null,
    }).then(
      () => true,
      () => false, // The caller renders the error.
    );
    if (ok && draftKey) clearDraft(draftKey);
  });

  return (
    <form onSubmit={submit} noValidate>
      <View gap={5}>
        <Controller
          control={control}
          name="milkType"
          render={({ field }) => (
            <Choice
              label="Milk"
              name={field.name}
              options={milkTypeOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <View direction="row" gap={3}>
          <View.Item columns={6}>
            <Controller
              control={control}
              name="offered"
              render={({ field, fieldState }) => (
                <VolumeField
                  name={field.name}
                  label="Offered"
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
              name="consumed"
              render={({ field, fieldState }) => (
                <VolumeField
                  name={field.name}
                  label="Drank"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View.Item>
        </View>
        <Controller
          control={control}
          name="at"
          render={({ field, fieldState }) => (
            <DateTimeField
              name={field.name}
              label="Time"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button
          type="submit"
          color="primary"
          size="xlarge"
          fullWidth
          icon={Check}
          loading={formState.isSubmitting}
        >
          {submitLabel}
        </Button>
      </View>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Breast (manual entry or correction)
// ---------------------------------------------------------------------------

const breastOptions = BreastSideSchema.options.map((value) => ({
  value,
  label: breastLabel[value],
}));

function breastSchema(allowOpen: boolean) {
  return z
    .object({
      breast: BreastSideSchema,
      startedAt: localDateTime,
      endedAt: allowOpen ? z.string() : localDateTime,
    })
    .superRefine((value, ctx) => {
      if (value.endedAt !== "" && fromZonedInputValue(value.endedAt) === null) {
        ctx.addIssue({ code: "custom", path: ["endedAt"], message: "Enter a valid date and time" });
      }
      endNotBeforeStart(value, ctx);
    });
}

type BreastValues = { breast: BreastSide; startedAt: string; endedAt: string };

/** Keeps only the parts of pauses that fall inside the corrected segment. */
function clipPauses(
  pauses: BreastInput["pauses"],
  start: string,
  end: string | null,
): BreastInput["pauses"] {
  const s = Date.parse(start);
  const e = end ? Date.parse(end) : Number.POSITIVE_INFINITY;
  return pauses.flatMap((p) => {
    const ps = Math.max(s, Date.parse(p.startedAt));
    const pe = p.endedAt ? Math.min(e, Date.parse(p.endedAt)) : null;
    if (ps >= e || (pe !== null && pe <= ps)) return [];
    return [
      {
        startedAt: new Date(ps).toISOString(),
        endedAt: pe === null ? (end ?? null) : new Date(pe).toISOString(),
      },
    ];
  });
}

export function BreastForm({
  initial,
  allowOpen = false,
  submitLabel,
  onSubmit,
}: {
  initial?: BreastInput;
  /** The segment is being timed live; its end may stay empty. */
  allowOpen?: boolean;
  submitLabel: string;
  onSubmit: (segment: BreastInput) => Promise<unknown>;
}) {
  const [keepPauses, setKeepPauses] = useState(true);
  const [now] = useState(() => Date.now());
  const { control, handleSubmit, formState } = useForm<BreastValues>({
    resolver: zodResolver(breastSchema(allowOpen)),
    defaultValues: initial
      ? {
          breast: initial.breast,
          startedAt: toZonedInputValue(initial.startedAt),
          endedAt: initial.endedAt ? toZonedInputValue(initial.endedAt) : "",
        }
      : {
          breast: "left",
          startedAt: toZonedInputValue(new Date(now - 15 * 60_000).toISOString()),
          endedAt: toZonedInputValue(new Date(now).toISOString()),
        },
  });

  const pauses = initial?.pauses ?? [];
  const pausedMs = initial
    ? Math.max(
        0,
        Date.parse(initial.endedAt ?? new Date(now).toISOString()) - Date.parse(initial.startedAt),
      ) - breastfeedingDurationMs(initial, now)
    : 0;

  const submit = handleSubmit(async (values) => {
    const startedAt = toIsoKeeping(values.startedAt, initial?.startedAt);
    const endedAt = values.endedAt ? toIsoKeeping(values.endedAt, initial?.endedAt) : null;
    await onSubmit({
      ...initial,
      type: "breastfeeding",
      breast: values.breast,
      startedAt,
      endedAt,
      pauses: keepPauses ? clipPauses(pauses, startedAt, endedAt) : [],
    }).catch(() => undefined); // The caller renders the error.
  });

  return (
    <form onSubmit={submit} noValidate>
      <View gap={5}>
        <Controller
          control={control}
          name="breast"
          render={({ field }) => (
            <Choice
              label="Breast"
              name={field.name}
              options={breastOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
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
                  helper={allowOpen ? "Leave empty while still feeding" : undefined}
                />
              )}
            />
          </View.Item>
        </View>
        {pauses.length > 0 && (
          <View direction="row" gap={3} align="center" justify="space-between">
            <Text variant="body-2" color="neutral-faded">
              {keepPauses
                ? `${pauses.length} pause${pauses.length > 1 ? "s" : ""} (${formatMinutes(pausedMs)}) excluded from the duration`
                : "Pauses will be removed"}
            </Text>
            <Button variant="outline" size="small" onClick={() => setKeepPauses((k) => !k)}>
              {keepPauses ? "Remove pauses" : "Keep pauses"}
            </Button>
          </View>
        )}
        <Text variant="caption-1" color="neutral-faded">
          Direct breastfeeding is recorded as time only. The volume is not measured.
        </Text>
        <Button
          type="submit"
          color="primary"
          size="xlarge"
          fullWidth
          icon={Check}
          loading={formState.isSubmitting}
        >
          {submitLabel}
        </Button>
      </View>
    </form>
  );
}
