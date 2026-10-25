import { zodResolver } from "@hookform/resolvers/zod";
import {
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  TimeOfDaySchema,
  type FeedingScheduleSettings,
} from "@isaac/shared";
import { BellOff, Check } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Button,
  FormControl,
  Icon,
  Loader,
  Modal,
  Select,
  Switch,
  Text,
  TextField,
  View,
  useToast,
} from "reshaped";
import { z } from "zod";
import { ErrorAlert } from "../../components/ErrorAlert";
import { useFeedingSchedule, useUpdateFeedingScheduleSettings } from "../../lib/queries";
import { formatInterval } from "./NextFeedingCard";

const FormSchema = z
  .object({
    dayIntervalMinutes: z.string(),
    nightModeEnabled: z.boolean(),
    nightIntervalMinutes: z.string(),
    nightStartsAt: TimeOfDaySchema,
    nightEndsAt: TimeOfDaySchema,
  })
  .refine((v) => !v.nightModeEnabled || v.nightStartsAt !== v.nightEndsAt, {
    path: ["nightEndsAt"],
    message: "Night must end at a different time than it starts",
  });

type FormValues = z.infer<typeof FormSchema>;

/** 1 h 30 min to 5 h in 15-minute steps, plus the current value if it falls outside. */
function intervalOptions(current: number): number[] {
  const options = new Set<number>();
  for (let m = 90; m <= 300; m += 15) options.add(m);
  if (current >= MIN_INTERVAL_MINUTES && current <= MAX_INTERVAL_MINUTES) options.add(current);
  return [...options].sort((a, b) => a - b);
}

function IntervalSelect({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <FormControl disabled={disabled}>
      <FormControl.Label>{label}</FormControl.Label>
      <Select
        name={name}
        size="large"
        value={value}
        disabled={disabled}
        onChange={({ value: next }) => onChange(next)}
      >
        {intervalOptions(Number(value)).map((minutes) => (
          <option key={minutes} value={String(minutes)}>
            Every {formatInterval(minutes)}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}

function SettingsForm({
  settings,
  onDone,
}: {
  settings: FeedingScheduleSettings;
  onDone: () => void;
}) {
  const toast = useToast();
  const update = useUpdateFeedingScheduleSettings();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dayIntervalMinutes: String(settings.dayIntervalMinutes),
      nightModeEnabled: settings.nightModeEnabled,
      nightIntervalMinutes: String(settings.nightIntervalMinutes),
      nightStartsAt: settings.nightStartsAt,
      nightEndsAt: settings.nightEndsAt,
    },
  });
  const nightModeEnabled = useWatch({ control, name: "nightModeEnabled" });

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        dayIntervalMinutes: Number(values.dayIntervalMinutes),
        nightModeEnabled: values.nightModeEnabled,
        nightIntervalMinutes: Number(values.nightIntervalMinutes),
        nightStartsAt: values.nightStartsAt,
        nightEndsAt: values.nightEndsAt,
      });
    } catch {
      return; // Rendered by <ErrorAlert>.
    }
    toast.show({
      color: "positive",
      icon: Check,
      text: "Feeding schedule saved",
      timeout: "short",
    });
    onDone();
  });

  return (
    <form onSubmit={submit} noValidate>
      <View gap={5}>
        <Text variant="body-2" color="neutral-faded">
          The next feeding is counted from the start of the last feeding.
        </Text>

        <Controller
          control={control}
          name="dayIntervalMinutes"
          render={({ field }) => (
            <IntervalSelect
              name={field.name}
              label="Interval"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="nightModeEnabled"
          render={({ field }) => (
            <Switch
              name={field.name}
              checked={field.value}
              onChange={({ checked }) => field.onChange(checked)}
            >
              Use a different interval at night
            </Switch>
          )}
        />

        {nightModeEnabled && (
          <View gap={4} paddingStart={4} borderStart borderColor="neutral-faded">
            <Controller
              control={control}
              name="nightIntervalMinutes"
              render={({ field }) => (
                <IntervalSelect
                  name={field.name}
                  label="Night interval"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <View direction="row" gap={3}>
              {(["nightStartsAt", "nightEndsAt"] as const).map((name) => (
                <View.Item columns={6} key={name}>
                  <Controller
                    control={control}
                    name={name}
                    render={({ field, fieldState }) => (
                      <FormControl hasError={Boolean(fieldState.error)}>
                        <FormControl.Label>
                          {name === "nightStartsAt" ? "Night starts" : "Night ends"}
                        </FormControl.Label>
                        <TextField
                          name={field.name}
                          size="large"
                          value={field.value}
                          onChange={({ value }) => field.onChange(value)}
                          inputAttributes={{ type: "time", step: 300 }}
                        />
                        {fieldState.error && (
                          <FormControl.Error>{fieldState.error.message}</FormControl.Error>
                        )}
                      </FormControl>
                    )}
                  />
                </View.Item>
              ))}
            </View>
            <Text variant="caption-1" color="neutral-faded">
              The night interval applies when the last feeding started between these times.
            </Text>
          </View>
        )}

        <View direction="row" gap={3} align="start">
          <Icon svg={BellOff} size={5} color="neutral-faded" />
          <View.Item grow>
            <Text variant="body-2" color="neutral-faded">
              Reminders aren&rsquo;t available yet. The app shows the next feeding while it&rsquo;s
              open, but can&rsquo;t notify you when it&rsquo;s closed. Times use{" "}
              {settings.timezone.replace("_", " ")} time.
            </Text>
          </View.Item>
        </View>

        <ErrorAlert error={update.error} />

        <Button
          type="submit"
          color="primary"
          size="xlarge"
          fullWidth
          icon={Check}
          loading={formState.isSubmitting}
        >
          Save schedule
        </Button>
      </View>
    </form>
  );
}

export function ScheduleSettingsModal({
  active,
  onClose,
}: {
  active: boolean;
  onClose: () => void;
}) {
  const query = useFeedingSchedule();
  return (
    <Modal active={active} onClose={onClose} position={{ s: "bottom", m: "center" }} size="480px">
      <View gap={4}>
        <Modal.Title>Feeding schedule</Modal.Title>
        {query.isPending && <Loader ariaLabel="Loading settings" />}
        <ErrorAlert error={query.error} title="Could not load settings" />
        {query.data && active && <SettingsForm settings={query.data.settings} onDone={onClose} />}
      </View>
    </Modal>
  );
}
