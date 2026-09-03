import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

posthog.init(process.env.REACT_APP_POSTHOG_PROJECT_TOKEN, {
  api_host: process.env.REACT_APP_POSTHOG_HOST,
  defaults: '2026-05-30',
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <PostHogProvider client={posthog}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </PostHogProvider>
);
