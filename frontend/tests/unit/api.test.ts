import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import api, { getApiErrorMessage } from "../../src/services/api";

describe("API error messages", (): void => {
  it("uses the application API base URL", (): void => {
    expect(api.defaults.baseURL).toBe("/api");
  });

  it("displays a text message returned by the server", (): void => {
    const config = { headers: new AxiosHeaders() };
    const response = {
      data: { message: "Email already exists" },
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config,
    };
    expect(
      getApiErrorMessage(
        new AxiosError("Request failed", "400", config, undefined, response),
        "Fallback",
      ),
    ).toBe("Email already exists");
  });

  it.each(["", null, 42, { detail: "private" }, undefined])(
    "uses the fallback for an unusable server message: %s",
    (message): void => {
      const config = { headers: new AxiosHeaders() };
      const response = {
        data: { message },
        status: 500,
        statusText: "Error",
        headers: {},
        config,
      };
      expect(
        getApiErrorMessage(
          new AxiosError("Request failed", "500", config, undefined, response),
          "Fallback",
        ),
      ).toBe("Fallback");
    },
  );

  it("handles a network error without a response", (): void => {
    expect(
      getApiErrorMessage(new AxiosError("Network error"), "Fallback"),
    ).toBe("Fallback");
  });

  it.each([new Error("Private detail"), null, "unexpected"])(
    "handles a non-Axios error",
    (error): void => {
      expect(getApiErrorMessage(error, "Fallback")).toBe("Fallback");
    },
  );
});
