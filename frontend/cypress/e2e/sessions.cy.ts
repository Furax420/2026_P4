interface Fixtures {
  adminId: number;
  userId: number;
  teacherId: number;
  sessionId: number;
}

describe("Session journeys", (): void => {
  let fixtures: Fixtures;
  beforeEach((): void => {
    cy.task<Fixtures>("resetE2eFixtures").then((value) => {
      fixtures = value;
    });
  });
  function login(admin = false): void {
    cy.visit("/login");
    cy.get("input[type=email]").type(
      admin ? "admin@e2e.test" : "user@e2e.test",
    );
    cy.get("input[type=password]").type("Password!123");
    cy.contains("button", /^Login$/).click();
    cy.location("pathname").should("eq", "/sessions");
    cy.contains("E2E morning yoga").should("be.visible");
  }
  function details(): void {
    cy.contains("a", "View Details").click();
    cy.contains("h2", "Details").should("be.visible");
  }
  function fillForm(name = "E2E evening yoga"): void {
    cy.get("[name=name]").clear().type(name);
    cy.get("[name=date]").clear().type("2026-10-22");
    cy.get("[name=teacherId]").select("E2E Teacher");
    cy.get("[name=description]").clear().type("Evening practice");
  }

  // Most journeys use the actual test API; intercepts are reserved for controlled failures.
  it("joins, leaves and returns to the list as a regular user", (): void => {
    login();
    cy.contains("a", "Create Session").should("not.exist");
    details();
    cy.contains("A relaxing E2E practice").should("be.visible");
    cy.contains("button", "Edit").should("not.exist");
    cy.contains("button", "Join Session").click();
    cy.contains("button", "Leave Session").should("be.visible");
    cy.contains("button", "Leave Session").click();
    cy.contains("button", "Join Session").should("be.visible");
    cy.contains("button", "Back to Sessions").click();
    cy.contains("Yoga Sessions").should("be.visible");
    cy.visit("/sessions/create");
    cy.location("pathname").should("eq", "/sessions");
  });

  it("creates, edits and deletes a real session as admin", (): void => {
    login(true);
    cy.get('a[href="/sessions/create"]').first().click();
    fillForm();
    cy.contains("button", /^Create Session$/).click();
    cy.contains("h3", "E2E evening yoga")
      .parent()
      .within((): void => {
        cy.contains("a", "View Details").click();
      });
    cy.contains("button", "Edit").click();
    cy.get("[name=name]").should("have.value", "E2E evening yoga");
    fillForm("E2E updated yoga");
    cy.contains("button", "Update Session").click();
    cy.contains("h3", "E2E updated yoga")
      .parent()
      .within((): void => {
        cy.contains("a", "View Details").click();
      });
    cy.contains("button", "Delete").click();
    cy.location("pathname").should("eq", "/sessions");
    cy.contains("E2E updated yoga").should("not.exist");
  });

  it("cancels editing and a detail deletion", (): void => {
    login(true);
    details();
    cy.contains("button", "Edit").click();
    cy.contains("button", "Cancel").click();
    details();
    cy.once("window:confirm", () => false);
    cy.contains("button", "Delete").click();
    cy.contains("h2", "Details").should("be.visible");
  });

  [false, true].forEach((edit) => {
    it(`blocks an empty required session name (${edit ? "edit" : "create"})`, (): void => {
      login(true);
      if (edit) {
        details();
        cy.contains("button", "Edit").click();
      } else cy.get('a[href="/sessions/create"]').first().click();
      fillForm();
      cy.get("[name=name]").clear();
      cy.intercept(
        edit ? "PUT" : "POST",
        edit ? "/api/session/*" : "/api/session",
      ).as("save");
      cy.contains(
        "button",
        edit ? "Update Session" : /^Create Session$/,
      ).click();
      cy.get<HTMLInputElement>("[name=name]").then((input) => {
        expect(input[0].checkValidity()).to.equal(false);
        expect(input[0].validationMessage).not.to.equal("");
      });
      cy.get("@save.all").should("have.length", 0);
    });
  });

  it("cancels and then deletes from the list", (): void => {
    login(true);
    cy.once("window:confirm", () => false);
    cy.contains("button", "Delete").click();
    cy.contains("E2E morning yoga").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.contains("No sessions available").should("be.visible");
  });

  it("shows a list loading error", (): void => {
    cy.intercept("GET", "/api/session", { statusCode: 500, body: {} });
    cy.visit("/login");
    cy.get("input[type=email]").type("user@e2e.test");
    cy.get("input[type=password]").type("Password!123");
    cy.contains("button", /^Login$/).click();
    cy.contains("Failed to load sessions").should("be.visible");
  });

  it("alerts when list deletion fails", (): void => {
    login(true);
    cy.intercept("DELETE", "/api/session/*", { statusCode: 500, body: {} });
    cy.window().then((win) => {
      cy.stub(win, "alert").as("alert");
    });
    cy.contains("button", "Delete").click();
    cy.get("@alert").should("have.been.calledWith", "Failed to delete session");
    cy.contains("E2E morning yoga").should("be.visible");
  });

  it("shows an unknown session error", (): void => {
    login();
    cy.visit("/sessions/2147483647");
    cy.contains("Failed to load session details").should("be.visible");
  });

  it("alerts when joining fails", (): void => {
    login();
    details();
    cy.intercept("POST", "/api/session/*/participate/*", {
      statusCode: 500,
      body: {},
    });
    cy.window().then((win) => {
      cy.stub(win, "alert").as("alert");
    });
    cy.contains("button", "Join Session").click();
    cy.get("@alert").should("have.been.calledWith", "Failed to join session");
    cy.contains("button", "Join Session").should("be.visible");
  });

  it("alerts when leaving fails", (): void => {
    login();
    details();
    cy.contains("button", "Join Session").click();
    cy.contains("button", "Leave Session").should("be.visible");
    cy.intercept("DELETE", "/api/session/*/participate/*", {
      statusCode: 500,
      body: {},
    });
    cy.window().then((win) => {
      cy.stub(win, "alert").as("alert");
    });
    cy.contains("button", "Leave Session").click();
    cy.get("@alert").should("have.been.calledWith", "Failed to leave session");
    cy.contains("button", "Leave Session").should("be.visible");
  });

  it("alerts when detail deletion fails", (): void => {
    login(true);
    details();
    cy.intercept("DELETE", "/api/session/*", { statusCode: 500, body: {} });
    cy.window().then((win) => {
      cy.stub(win, "alert").as("alert");
    });
    cy.contains("button", "Delete").click();
    cy.get("@alert").should("have.been.calledWith", "Failed to delete session");
    cy.contains("h2", "Details").should("be.visible");
  });

  it("shows a save error and keeps form values", (): void => {
    login(true);
    cy.get('a[href="/sessions/create"]').first().click();
    fillForm();
    cy.intercept("POST", "/api/session", { statusCode: 500, body: {} });
    cy.contains("button", /^Create Session$/).click();
    cy.contains("Failed to save session").should("be.visible");
    cy.get("[name=name]").should("have.value", "E2E evening yoga");
  });

  it("reports failure to load an edit session", (): void => {
    login(true);
    cy.visit("/sessions/edit/2147483647");
    cy.contains("Failed to load session").should("be.visible");
  });

  it("keeps an empty teacher selection after a teacher loading error", (): void => {
    login(true);
    cy.intercept("GET", "/api/teacher", { statusCode: 500, body: {} });
    cy.get('a[href="/sessions/create"]').first().click();
    cy.get("[name=teacherId]")
      .should("have.value", "")
      .and("have.attr", "required");
    cy.intercept("POST", "/api/session").as("create");
    cy.get("[name=name]").type("Teacher missing");
    cy.get("[name=date]").type("2026-10-22");
    cy.get("[name=description]").type("Practice");
    // In a real browser, the required select blocks submission before React's handler.
    cy.contains("button", /^Create Session$/).click();
    cy.get<HTMLSelectElement>("[name=teacherId]").then((select) => {
      expect(select[0].checkValidity()).to.equal(false);
    });
    cy.get("@create.all").should("have.length", 0);
  });

  it("redirects a token without a user away from details and profile", (): void => {
    login();
    cy.window().then((win) => {
      win.localStorage.removeItem("user");
    });
    cy.then((): void => {
      cy.visit(`/sessions/${fixtures.sessionId}`);
    });
    cy.location("pathname").should("eq", "/login");
    cy.visit("/profile");
    cy.location("pathname").should("eq", "/login");
  });

  it("cancels a delayed list request when navigating to the profile", (): void => {
    login();
    cy.intercept("GET", "/api/session", {
      delay: 500,
      statusCode: 200,
      body: [],
    });
    cy.visit("/sessions", {
      onBeforeLoad: (win) => {
        cy.spy(win.AbortController.prototype, "abort").as("abort");
      },
    });
    cy.contains("Loading sessions...").should("be.visible");
    cy.contains("a", "Profile").click();
    cy.get("@abort").should("have.been.called");
    cy.contains("My Profile").should("be.visible");
    cy.contains("No sessions available").should("not.exist");
  });
});
