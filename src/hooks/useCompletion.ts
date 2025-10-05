import { useState, useCallback, useRef } from "react";
import { useApp } from "@/contexts";

interface CompletionState {
  input: string;
  response: string;
  isLoading: boolean;
  error: string | null;
}

export const useCompletion = () => {
  const { apiKey } = useApp();

  const [state, setState] = useState<CompletionState>({
    input: "",
    response: "",
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const setInput = useCallback((value: string) => {
    setState((prev) => ({ ...prev, input: value }));
  }, []);

  const submit = useCallback(async () => {
    const input = state.input;

    if (!input.trim()) {
      return;
    }

    if (!apiKey) {
      setState((prev) => ({
        ...prev,
        error: "Please set your OpenAI API key",
      }));
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        response: "",
      }));

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: input,
            },
          ],
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to get response from OpenAI");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                setState((prev) => ({
                  ...prev,
                  response: fullResponse,
                }));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        input: "",
      }));
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "An error occurred",
      }));
    }
  }, [state.input, apiKey]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const clear = useCallback(() => {
    setState({
      input: "",
      response: "",
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    input: state.input,
    response: state.response,
    isLoading: state.isLoading,
    error: state.error,
    setInput,
    submit,
    stop,
    clear,
  };
};
