import { FormControl, TextField } from "reshaped";

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
};

/** Numeric ml input with a decimal keypad on mobile. Empty means "not measured". */
export function VolumeField({ name, label, value, onChange, error, helper, placeholder }: Props) {
  return (
    <FormControl hasError={Boolean(error)}>
      <FormControl.Label>{label}</FormControl.Label>
      <TextField
        name={name}
        size="large"
        value={value}
        placeholder={placeholder}
        suffix="ml"
        onChange={({ value: next }) => onChange(next.replace(",", "."))}
        inputAttributes={{ inputMode: "decimal", autoComplete: "off", enterKeyHint: "next" }}
      />
      {helper && !error && <FormControl.Helper>{helper}</FormControl.Helper>}
      {error && <FormControl.Error>{error}</FormControl.Error>}
    </FormControl>
  );
}
