import { FormControl, TextField } from "reshaped";

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
};

/** Native date/time picker (24-hour on most devices), in Europe/Amsterdam time. */
export function DateTimeField({ name, label, value, onChange, error, helper }: Props) {
  return (
    <FormControl hasError={Boolean(error)}>
      <FormControl.Label>{label}</FormControl.Label>
      <TextField
        name={name}
        size="large"
        value={value}
        onChange={({ value: next }) => onChange(next)}
        inputAttributes={{ type: "datetime-local", step: 60 }}
      />
      {helper && !error && <FormControl.Helper>{helper}</FormControl.Helper>}
      {error && <FormControl.Error>{error}</FormControl.Error>}
    </FormControl>
  );
}
