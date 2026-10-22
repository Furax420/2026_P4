import bcrypt from "bcrypt";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/database/prisma";
import { generateToken } from "../../src/utils/jwt.util";
import { assertTestDatabase } from "../helpers";

describe("API and PostgreSQL integration", (): void => {
  const domain = `@p4-${Date.now()}.test`;
  const password = "Password!123";
  let hash: string;
  let teacherId: number;
  let sessionId: number;
  let adminId: number;
  let userId: number;
  let adminToken: string;
  let userToken: string;
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const input = () => ({
    name: "Integration yoga",
    date: "2026-10-12",
    description: "Test session",
    teacherId,
  });

  beforeAll(async (): Promise<void> => {
    // Fail before any write if this suite points to development or production.
    assertTestDatabase();
    const database = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    expect(database[0].name).toBe("yogastudio_test");
    hash = await bcrypt.hash(password, 4);
    teacherId = (
      await prisma.teacher.create({
        data: { firstName: "Test", lastName: "Teacher" },
      })
    ).id;
  });

  beforeEach(async (): Promise<void> => {
    // Each case receives fresh users and a session: tests do not depend on their order.
    const admin = await prisma.user.create({
      data: {
        email: `admin${domain}`,
        firstName: "Admin",
        lastName: "Test",
        password: hash,
        admin: true,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `user${domain}`,
        firstName: "User",
        lastName: "Test",
        password: hash,
      },
    });
    adminId = admin.id;
    userId = user.id;
    adminToken = generateToken(adminId);
    userToken = generateToken(userId);
    sessionId = (
      await prisma.session.create({
        data: { ...input(), date: new Date(input().date) },
      })
    ).id;
  });

  afterEach(async (): Promise<void> => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    assertTestDatabase();
    // Remove only this suite's fixtures; session deletion also removes participations.
    await prisma.session.deleteMany({ where: { teacherId } });
    await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
  });
  afterAll(async (): Promise<void> => {
    if (teacherId)
      await prisma.teacher.deleteMany({ where: { id: teacherId } });
    await prisma.$disconnect();
  });

  it("logs in with a stored account and returns a signed token", async (): Promise<void> => {
    const result = await request(app)
      .post("/api/auth/login")
      .send({ email: `user${domain}`, password })
      .expect(200);
    expect(result.body.id).toBe(userId);
    expect(result.body.token).toBeTruthy();
    expect(result.body).not.toHaveProperty("password");
  });
  it.each([
    { email: "unknown@example.test", password },
    { email: "", password },
    { email: `user${domain}`, password: "wrong-password" },
  ])("rejects invalid login: $email", async (credentials): Promise<void> => {
    await request(app)
      .post("/api/auth/login")
      .send(credentials)
      .expect(credentials.email ? 401 : 400);
  });
  it("registers a normal account with a real password hash", async (): Promise<void> => {
    const data = {
      email: `new${domain}`,
      password,
      firstName: "New",
      lastName: "User",
      admin: true,
    };
    const result = await request(app)
      .post("/api/auth/register")
      .send(data)
      .expect(201);
    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: result.body.id },
    });
    expect(saved.admin).toBe(false);
    expect(await bcrypt.compare(password, saved.password)).toBe(true);
    expect(result.body).not.toHaveProperty("password");
  });
  it("rejects an existing email", async (): Promise<void> => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: `user${domain}`,
        password,
        firstName: "Test",
        lastName: "User",
      })
      .expect(400);
  });
  it("handles simultaneous registrations without duplicate accounts", async (): Promise<void> => {
    const data = {
      email: `race${domain}`,
      password,
      firstName: "Race",
      lastName: "User",
    };
    const results = await Promise.all([
      request(app).post("/api/auth/register").send(data),
      request(app).post("/api/auth/register").send(data),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
    expect(await prisma.user.count({ where: { email: data.email } })).toBe(1);
  });
  it.each([
    { firstName: "x" },
    { lastName: "x".repeat(21) },
    { password: "short" },
    { email: "invalid" },
    { password: null },
  ])(
    "validates registration through HTTP: %j",
    async (invalid): Promise<void> => {
      await request(app)
        .post("/api/auth/register")
        .send({
          email: `new${domain}`,
          password,
          firstName: "Test",
          lastName: "User",
          ...invalid,
        })
        .expect(400);
    },
  );

  it.each(["Basic abc", "Bearer", "Bearer abc", "Bearer abc extra"])(
    "rejects malformed credentials: %s",
    async (header): Promise<void> => {
      await request(app)
        .get("/api/session")
        .set("Authorization", header)
        .expect(401);
    },
  );
  it("accepts a case-insensitive Bearer scheme", async (): Promise<void> => {
    await request(app)
      .get("/api/session")
      .set("Authorization", `bearer ${userToken}`)
      .expect(200);
  });
  it("rejects malformed JSON centrally", async (): Promise<void> => {
    const result = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{")
      .expect(400);
    expect(result.body.message).toBe("Invalid request body");
  });

  it("lists sessions with the original public response format", async (): Promise<void> => {
    const result = await request(app)
      .get("/api/session")
      .set(auth())
      .expect(200);
    const found = result.body.find(
      (value: { id: number }) => value.id === sessionId,
    );
    expect(found.users).toEqual([]);
    expect(Object.keys(found.teacher).sort()).toEqual([
      "firstName",
      "id",
      "lastName",
    ]);
  });
  it("reads an existing session", async (): Promise<void> => {
    const result = await request(app)
      .get(`/api/session/${sessionId}`)
      .set(auth())
      .expect(200);
    expect(result.body.name).toBe("Integration yoga");
  });
  it.each(["abc", "1abc", "0", "-1", "1.5", "2147483648"])(
    "rejects invalid session identifier %s",
    async (id): Promise<void> => {
      await request(app).get(`/api/session/${id}`).set(auth()).expect(400);
    },
  );
  it("reports an unknown session", async (): Promise<void> => {
    await request(app).get("/api/session/2147483647").set(auth()).expect(404);
  });
  it("creates a session as admin", async (): Promise<void> => {
    const result = await request(app)
      .post("/api/session")
      .set(auth())
      .send(input())
      .expect(201);
    expect(
      await prisma.session.findUnique({ where: { id: result.body.id } }),
    ).not.toBeNull();
  });
  it.each([
    { name: "" },
    { name: "ab" },
    { description: "" },
    { name: "x".repeat(51) },
    { description: "x".repeat(2501) },
    { date: "2026-02-30" },
    { date: "0000-01-01" },
    { teacherId: "1" },
    { teacherId: 0 },
  ])(
    "validates session input through HTTP: %j",
    async (invalid): Promise<void> => {
      await request(app)
        .post("/api/session")
        .set(auth())
        .send({ ...input(), ...invalid })
        .expect(400);
    },
  );
  it("reports an unknown teacher on creation", async (): Promise<void> => {
    await request(app)
      .post("/api/session")
      .set(auth())
      .send({ ...input(), teacherId: 2147483647 })
      .expect(404);
  });
  it.each(["post", "put", "delete"] as const)(
    "refuses non-admin %s",
    async (method): Promise<void> => {
      await request(app)
        [method](`/api/session${method === "post" ? "" : "/" + sessionId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(input())
        .expect(403);
    },
  );
  it("updates a session while preserving omitted fields", async (): Promise<void> => {
    const result = await request(app)
      .put(`/api/session/${sessionId}`)
      .set(auth())
      .send({ name: "Changed yoga" })
      .expect(200);
    expect(result.body.description).toBe(input().description);
    expect(result.body.name).toBe("Changed yoga");
  });
  it("updates the date, description and teacher", async (): Promise<void> => {
    const result = await request(app)
      .put(`/api/session/${sessionId}`)
      .set(auth())
      .send({ date: "2028-02-29", description: "Changed", teacherId })
      .expect(200);
    expect(result.body.date).toBe("2028-02-29T00:00:00.000Z");
  });
  it("accepts an empty partial update", async (): Promise<void> => {
    await request(app)
      .put(`/api/session/${sessionId}`)
      .set(auth())
      .send({})
      .expect(200);
  });
  it("reports an unknown session on update", async (): Promise<void> => {
    await request(app)
      .put("/api/session/2147483647")
      .set(auth())
      .send({ name: "Missing" })
      .expect(404);
  });
  it("deletes a session and cascades participation", async (): Promise<void> => {
    await prisma.sessionParticipation.create({ data: { sessionId, userId } });
    await request(app)
      .delete(`/api/session/${sessionId}`)
      .set(auth())
      .expect(200);
    expect(
      await prisma.sessionParticipation.count({ where: { sessionId } }),
    ).toBe(0);
    await request(app)
      .delete(`/api/session/${sessionId}`)
      .set(auth())
      .expect(404);
  });
  it.each([false, true])(
    "joins and leaves only its own participation (admin: %s)",
    async (admin): Promise<void> => {
      const id = admin ? adminId : userId;
      const token = admin ? adminToken : userToken;
      await request(app)
        .post(`/api/session/${sessionId}/participate/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const result = await request(app)
        .get(`/api/session/${sessionId}`)
        .set(auth())
        .expect(200);
      expect(result.body.users).toEqual([id]);
      await request(app)
        .delete(`/api/session/${sessionId}/participate/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(await prisma.sessionParticipation.count({ where: { sessionId } })).toBe(0);
    },
  );
  for (const method of ["post", "delete"] as const) {
    it.each([false, true])(
      `refuses ${method} on another user's participation (admin: %s)`,
      async (admin): Promise<void> => {
        const targetId = admin ? userId : adminId;
        const token = admin ? adminToken : userToken;
        if (method === "delete") {
          await prisma.sessionParticipation.create({ data: { sessionId, userId: targetId } });
        }
        // The URL cannot override the identity established by the JWT.
        await request(app)[method](`/api/session/${sessionId}/participate/${targetId}`)
          .set("Authorization", `Bearer ${token}`)
          .expect(403);
        expect(await prisma.sessionParticipation.count({ where: { sessionId } })).toBe(
          method === "delete" ? 1 : 0,
        );
      },
    );
  }
  it.each(["profile", "join", "leave"] as const)(
    "requires authentication for %s",
    async (action): Promise<void> => {
      if (action === "profile") {
        await request(app).get(`/api/user/${userId}`).expect(401);
      } else {
        const method = action === "join" ? "post" : "delete";
        await request(app)[method](`/api/session/${sessionId}/participate/${userId}`).expect(401);
      }
    },
  );
  it("rejects duplicate participation, including simultaneous requests", async (): Promise<void> => {
    const results = await Promise.all(
      [0, 1].map(() =>
        request(app)
          .post(`/api/session/${sessionId}/participate/${userId}`)
          .set("Authorization", `Bearer ${userToken}`),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(
      await prisma.sessionParticipation.count({ where: { sessionId, userId } }),
    ).toBe(1);
  });
  it("leaves only once during simultaneous requests", async (): Promise<void> => {
    await prisma.sessionParticipation.create({ data: { sessionId, userId } });
    const results = await Promise.all(
      [0, 1].map(() =>
        request(app)
          .delete(`/api/session/${sessionId}/participate/${userId}`)
          .set("Authorization", `Bearer ${userToken}`),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 404]);
  });
  it("rejects joining an unknown session", async (): Promise<void> => {
    await request(app)
      .post(`/api/session/2147483647/participate/${userId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(404);
  });
  it("rejects joining with an unknown user", async (): Promise<void> => {
    await request(app)
      .post(`/api/session/${sessionId}/participate/2147483647`)
      .set("Authorization", `Bearer ${generateToken(2147483647)}`)
      .expect(404);
  });
  it("validates the participant identifier", async (): Promise<void> => {
    await request(app)
      .post(`/api/session/${sessionId}/participate/1abc`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(400);
  });
  it("reports an absent participation", async (): Promise<void> => {
    await request(app)
      .delete(`/api/session/${sessionId}/participate/${userId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(404);
  });

  it("lists and reads teachers", async (): Promise<void> => {
    const list = await request(app).get("/api/teacher").set(auth()).expect(200);
    expect(
      list.body.some((value: { id: number }) => value.id === teacherId),
    ).toBe(true);
    await request(app).get(`/api/teacher/${teacherId}`).set(auth()).expect(200);
  });
  it("reports an unknown teacher", async (): Promise<void> => {
    await request(app).get("/api/teacher/2147483647").set(auth()).expect(404);
  });
  it("validates teacher identifiers", async (): Promise<void> => {
    await request(app).get("/api/teacher/abc").set(auth()).expect(400);
  });
  it.each([false, true])(
    "reads its own profile without exposing its password (admin: %s)",
    async (admin): Promise<void> => {
      const id = admin ? adminId : userId;
      const token = admin ? adminToken : userToken;
      const result = await request(app)
        .get(`/api/user/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(result.body.email).toBe(`${admin ? "admin" : "user"}${domain}`);
      expect(result.body).not.toHaveProperty("password");
    },
  );
  it.each([false, true])(
    "refuses reading another profile (admin: %s)",
    async (admin): Promise<void> => {
      const id = admin ? userId : adminId;
      const token = admin ? adminToken : userToken;
      const result = await request(app)
        .get(`/api/user/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
      expect(result.body).not.toHaveProperty("email");
      expect(result.body).not.toHaveProperty("password");
    },
  );
  it("reports an unknown profile", async (): Promise<void> => {
    await request(app)
      .get("/api/user/2147483647")
      .set("Authorization", `Bearer ${generateToken(2147483647)}`)
      .expect(404);
  });
  it("validates profile identifiers", async (): Promise<void> => {
    await request(app).get("/api/user/abc").set(auth()).expect(400);
  });
  it("refuses deleting another account, even for an admin", async (): Promise<void> => {
    await request(app).delete(`/api/user/${userId}`).set(auth()).expect(403);
  });
  it("deletes the own account and its participations", async (): Promise<void> => {
    await prisma.sessionParticipation.create({ data: { sessionId, userId } });
    await request(app)
      .delete(`/api/user/${userId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);
    expect(await prisma.sessionParticipation.count({ where: { userId } })).toBe(
      0,
    );
  });
  it("refuses promotion in a test environment", async (): Promise<void> => {
    await request(app).post("/api/user/promote-admin").set(auth()).expect(403);
  });
  it("promotes through the API only in development", async (): Promise<void> => {
    vi.stubEnv("NODE_ENV", "development");
    const result = await request(app)
      .post("/api/user/promote-admin")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);
    expect(result.body.admin).toBe(true);
  });
});
