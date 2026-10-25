import { Button, Modal, Text, View } from "reshaped";

type Props = {
  active: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** In-app confirmation; never uses a blocking browser dialog. */
export function ConfirmModal({
  active,
  title,
  text,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal active={active} onClose={onClose} position={{ s: "bottom", m: "center" }} size="420px">
      <View gap={4}>
        <View gap={1}>
          <Modal.Title>{title}</Modal.Title>
          <Text color="neutral-faded">{text}</Text>
        </View>
        <View direction="row" gap={2}>
          <View.Item grow>
            <Button fullWidth size="large" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </View.Item>
          <View.Item grow>
            <Button fullWidth size="large" color="critical" loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </View.Item>
        </View>
      </View>
    </Modal>
  );
}
