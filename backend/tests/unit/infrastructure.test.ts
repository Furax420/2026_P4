import express from "express";
import type { Request, Response } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { generateToken, verifyToken } from "../../src/utils/jwt.util";
import { AppError } from "../../src/utils/app-error";
import { asyncHandler } from "../../src/utils/async-handler";
import { errorMiddleware } from "../../src/middleware/error.middleware";
import { prisma } from "../../src/database/prisma";
import { UserRepository } from "../../src/repositories/user.repository";
import { SessionRepository } from "../../src/repositories/session.repository";
import { ParticipationRepository } from "../../src/repositories/participation.repository";

describe("Tokens and centralized errors", (): void => {
  it("signs and verifies the user identifier", (): void => {
    expect(verifyToken(generateToken(12))?.userId).toBe(12);
  });
  it.each([
    {},
    { userId: "1" },
    { userId: 0 },
    { userId: -1 },
    { userId: 1.5 },
    { userId: 2147483648 },
  ])("rejects a signed but unusable payload: %j", (payload): void => {
    expect(
      verifyToken(
        jwt.sign(payload, "yoga-test-secret", { algorithm: "HS256" }),
      ),
    ).toBeNull();
  });
  it("rejects string payloads", (): void => {
    expect(verifyToken(jwt.sign("payload", "yoga-test-secret"))).toBeNull();
  });
  it("rejects expired tokens", (): void => {
    expect(
      verifyToken(
        jwt.sign({ userId: 1 }, "yoga-test-secret", { expiresIn: -1 }),
      ),
    ).toBeNull();
  });
  it("rejects another signature", (): void => {
    expect(verifyToken(jwt.sign({ userId: 1 }, "another-secret"))).toBeNull();
  });

  it.each([
    new AppError("Forbidden", 403),
    Object.assign(new Error("Body"), { status: 413 }),
    new Error("Private database error"),
    { status: 400 },
    Object.assign(new Error("Technical"), { status: 503 }),
  ])(
    "centralizes an expected or unexpected error",
    async (error): Promise<void> => {
      vi.spyOn(console, "error").mockImplementation((): void => {});
      const app = express();
      // The wrapper forwards rejected promises; the middleware chooses the HTTP response.
      app.get(
        "/",
        asyncHandler(async (): Promise<void> => {
          throw error;
        }),
      );
      app.use(errorMiddleware);
      const result = await request(app).get("/");
      if (error instanceof AppError) {
        expect(result.status).toBe(403);
        expect(result.body.message).toBe("Forbidden");
      } else if (
        error instanceof Error &&
        "status" in error &&
        error.status === 413
      ) {
        expect(result.status).toBe(413);
        expect(result.body.message).toBe("Invalid request body");
      } else {
        expect(result.status).toBe(500);
        expect(result.body.message).toBe("Internal server error");
      }
    },
  );

  it("delegates when a response has already started", (): void => {
    const next = vi.fn();
    const error = new Error("Disconnected");
    errorMiddleware(
      error,
      {} as Request,
      { headersSent: true } as Response,
      next,
    );
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("Repository error translation", (): void => {
  // Simulate precise Prisma failures: these unit tests never connect to the database.
  const known = (code: string) =>
    new Prisma.PrismaClientKnownRequestError("Database constraint", {
      code,
      clientVersion: "5.22.0",
    });
  it.each([known("P2002"), known("P2025"), new Error("Offline")])(
    "translates only duplicate registration errors",
    async (error): Promise<void> => {
      vi.spyOn(prisma.user, "create").mockRejectedValue(error);
      const result = new UserRepository().create({
        email: "test@example.test",
        firstName: "Test",
        lastName: "User",
        password: "hash",
      });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        await expect(result).rejects.toMatchObject({
          name: "DuplicateEmailError",
        });
      else await expect(result).rejects.toBe(error);
    },
  );
  it.each([known("P2002"), known("P2025"), new Error("Offline")])(
    "translates only duplicate participation errors",
    async (error): Promise<void> => {
      vi.spyOn(prisma.sessionParticipation, "create").mockRejectedValue(error);
      const result = new ParticipationRepository().create(1, 1);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        await expect(result).resolves.toBe(false);
      else await expect(result).rejects.toBe(error);
    },
  );
  it.each([known("P2025"), known("P2002"), new Error("Offline")])(
    "translates only a session deleted during update",
    async (error): Promise<void> => {
      vi.spyOn(prisma.session, "update").mockRejectedValue(error);
      const result = new SessionRepository().update(1, {
        name: "Changed yoga",
      });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      )
        await expect(result).resolves.toBeNull();
      else await expect(result).rejects.toBe(error);
    },
  );
});
