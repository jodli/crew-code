import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ToastProvider } from "../components/shared/toast.tsx";

interface AppRenderOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
}

export function renderApp(ui: React.ReactElement, options: AppRenderOptions = {}) {
  const { route = "/", ...renderOptions } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const { hook, navigate, history } = memoryLocation({ path: route, record: true });

  const result = render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Router hook={hook}>{children}</Router>
        </ToastProvider>
      </QueryClientProvider>
    ),
    ...renderOptions,
  });

  return { ...result, queryClient, navigate, history: history! };
}
