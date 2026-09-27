import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChat } from "./chat";

const originalEnv = { ...process.env };

function modelResponse(content: string, ok = true) {
  return new Response(
    ok ? JSON.stringify({ choices: [{ message: { content } }] }) : "provider failed",
    { status: ok ? 200 : 503, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AI provider routing", () => {
  it("uses Muse first in auto mode", async () => {
    process.env.AI_PROVIDER_MODE = "auto";
    process.env.MODEL_API_KEY = "muse-test";
    process.env.GROK_API_KEY = "grok-test";
    const request = vi.fn().mockResolvedValue(modelResponse("from muse"));
    vi.stubGlobal("fetch", request);

    const result = await aiChat({ messages: [{ role: "user", content: "hello" }] });

    expect(result).toEqual({ content: "from muse", source: "muse" });
    expect(String(request.mock.calls[0][0])).toContain("api.meta.ai");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("falls back to Grok when Muse fails", async () => {
    process.env.AI_PROVIDER_MODE = "auto";
    process.env.MODEL_API_KEY = "muse-test";
    process.env.GROK_API_KEY = "grok-test";
    const request = vi
      .fn()
      .mockResolvedValueOnce(modelResponse("", false))
      .mockResolvedValueOnce(modelResponse("from grok"));
    vi.stubGlobal("fetch", request);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await aiChat({ messages: [{ role: "user", content: "hello" }] });

    expect(result).toEqual({ content: "from grok", source: "grok" });
    expect(String(request.mock.calls[1][0])).toContain("api.x.ai");
  });

  it("can force Grok for development", async () => {
    process.env.AI_PROVIDER_MODE = "grok";
    process.env.MODEL_API_KEY = "muse-test";
    process.env.GROK_API_KEY = "grok-test";
    const request = vi.fn().mockResolvedValue(modelResponse("development grok"));
    vi.stubGlobal("fetch", request);

    const result = await aiChat({ messages: [{ role: "user", content: "hello" }] });

    expect(result.source).toBe("grok");
    expect(String(request.mock.calls[0][0])).toContain("api.x.ai");
  });
});
