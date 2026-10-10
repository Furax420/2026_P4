import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";

describe("Application HTTP", (): void => {
  it("returns the API health status", async (): Promise<void> => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "Yoga Studio API is running",
    });
  });

  it("rejects session access without a token", async (): Promise<void> => {
    const response = await request(app).get("/api/session");

    expect(response.status).toBe(401);
  });
});
