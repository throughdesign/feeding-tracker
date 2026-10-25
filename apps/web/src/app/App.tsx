import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Loader, Reshaped, View, type ColorMode } from "reshaped";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { FeedingSessionPage } from "../features/feeding/FeedingSessionPage";
import { NewFeedingPage } from "../features/feeding/NewFeedingPage";
import { PumpingFormPage } from "../features/pumping/PumpingFormPage";
import { HistoryPage } from "../features/timeline/HistoryPage";
import { AppShell, COLOR_MODE_KEY } from "./AppShell";
import { NotFoundPage } from "./NotFoundPage";

// Charts (Recharts) are only downloaded when the Insights tab is opened.
const InsightsPage = lazy(() =>
  import("../features/insights/InsightsPage").then((m) => ({ default: m.InsightsPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5_000 },
    mutations: { retry: 0 },
  },
});

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "history", element: <HistoryPage /> },
      {
        path: "insights",
        element: (
          <Suspense
            fallback={
              <View paddingBlock={10} align="center">
                <Loader ariaLabel="Loading insights" />
              </View>
            }
          >
            <InsightsPage />
          </Suspense>
        ),
      },
      { path: "feeding/new", element: <NewFeedingPage /> },
      { path: "feeding/:id", element: <FeedingSessionPage /> },
      { path: "pumping/new", element: <PumpingFormPage /> },
      { path: "pumping/:id", element: <PumpingFormPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function initialColorMode(): ColorMode {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Fall back to the system preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function App() {
  return (
    <Reshaped theme="slate" defaultColorMode={initialColorMode()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Reshaped>
  );
}
