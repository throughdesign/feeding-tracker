import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button, Text, View } from "reshaped";

type Props = { title: string; subtitle?: ReactNode; back?: boolean; endSlot?: ReactNode };

export function PageHeader({ title, subtitle, back = true, endSlot }: Props) {
  const navigate = useNavigate();
  return (
    <View direction="row" align="center" gap={2}>
      {back && (
        <Button
          variant="ghost"
          size="large"
          icon={ChevronLeft}
          attributes={{ "aria-label": "Back" }}
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        />
      )}
      <View.Item grow>
        <View gap={0}>
          <Text as="h1" variant="featured-2" weight="bold">
            {title}
          </Text>
          {subtitle && (
            <Text variant="body-2" color="neutral-faded">
              {subtitle}
            </Text>
          )}
        </View>
      </View.Item>
      {endSlot}
    </View>
  );
}
