import { ChartColumn, History, House, Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button, Container, View, useTheme } from "reshaped";

export const COLOR_MODE_KEY = "isaac-feeding:color-mode";

function ColorModeToggle() {
  const { colorMode, invertColorMode } = useTheme();
  useEffect(() => {
    try {
      window.localStorage.setItem(COLOR_MODE_KEY, colorMode);
    } catch {
      // Ignore unavailable storage.
    }
  }, [colorMode]);
  const next = colorMode === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      icon={colorMode === "dark" ? Sun : Moon}
      attributes={{ "aria-label": `Switch to ${next} mode` }}
      onClick={invertColorMode}
    />
  );
}

const tabs = [
  { path: "/", label: "Today", icon: House },
  { path: "/history", label: "History", icon: History },
  { path: "/insights", label: "Insights", icon: ChartColumn },
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <View minHeight="100dvh" backgroundColor="page">
      <Container width="560px" padding={4}>
        <View paddingTop={2} paddingBottom={28} gap={4}>
          <View direction="row" justify="end">
            <ColorModeToggle />
          </View>
          <main>
            <Outlet />
          </main>
        </View>
      </Container>

      <View
        as="nav"
        position="fixed"
        insetBottom={0}
        insetStart={0}
        insetEnd={0}
        zIndex="fixed"
        backgroundColor="elevation-base"
        borderTop
        borderColor="neutral-faded"
        attributes={{
          "aria-label": "Main",
          style: { paddingBottom: "env(safe-area-inset-bottom)" },
        }}
      >
        <Container width="560px" padding={2}>
          <View direction="row" gap={2}>
            {tabs.map((tab) => {
              const active =
                tab.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(tab.path);
              return (
                <View.Item grow key={tab.path}>
                  <Button
                    fullWidth
                    size="large"
                    variant="ghost"
                    color={active ? "primary" : "neutral"}
                    highlighted={active}
                    icon={tab.icon}
                    attributes={{ "aria-current": active ? "page" : undefined }}
                    onClick={() => navigate(tab.path)}
                  >
                    {tab.label}
                  </Button>
                </View.Item>
              );
            })}
          </View>
        </Container>
      </View>
    </View>
  );
}
