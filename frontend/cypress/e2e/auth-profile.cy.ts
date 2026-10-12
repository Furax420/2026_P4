describe("Authentication and account journeys", (): void => {
  beforeEach((): void => {
    cy.task("resetE2eFixtures");
  });
  function login(email = "user@e2e.test"): void {
    // This submits the actual form to the test API and PostgreSQL.
    cy.visit("/login");
    cy.get("input[type=email]").type(email);
    cy.get("input[type=password]").type("Password!123");
    cy.contains("button", /^Login$/).click();
    cy.location("pathname").should("eq", "/sessions");
    cy.contains("E2E morning yoga").should("be.visible");
  }

  it("logs in, visits the profile and logs out", (): void => {
    login();
    cy.contains("a", "Profile").click();
    cy.contains("My Profile").should("be.visible");
    cy.contains("user@e2e.test").should("be.visible");
    cy.contains("button", "Back to Sessions").click();
    cy.contains("button", "Logout").click();
    cy.location("pathname").should("eq", "/login");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("token")).to.equal(null);
      expect(win.localStorage.getItem("user")).to.equal(null);
    });
    cy.visit("/profile");
    cy.location("pathname").should("eq", "/login");
  });

  it("registers a new account through the application", (): void => {
    cy.visit("/login");
    cy.contains("Register here").click();
    cy.get("[name=firstName]").type("New");
    cy.get("[name=lastName]").type("Member");
    cy.get("[name=email]").type("register@e2e.test");
    cy.get("[name=password]").type("Password!123");
    cy.contains("button", /^Register$/).click();
    cy.location("pathname").should("eq", "/sessions");
    cy.contains("a", "Profile").click();
    cy.contains("register@e2e.test").should("be.visible");
  });

  it("shows invalid credentials from the real API", (): void => {
    cy.visit("/login");
    cy.get("input[type=email]").type("user@e2e.test");
    cy.get("input[type=password]").type("WrongPassword");
    cy.contains("button", /^Login$/).click();
    cy.contains("Invalid credentials").should("be.visible");
    cy.contains("button", /^Login$/).should("be.enabled");
  });

  it("shows native validation for a missing login email", (): void => {
    cy.intercept("POST", "/api/auth/login").as("login");
    cy.visit("/login");
    cy.contains("button", /^Login$/).click();
    cy.get<HTMLInputElement>("input[type=email]").then((input) => {
      expect(input[0].checkValidity()).to.equal(false);
      expect(input[0].validationMessage).not.to.equal("");
    });
    cy.get("@login.all").should("have.length", 0);
  });

  it("shows native validation for a missing registration name", (): void => {
    cy.intercept("POST", "/api/auth/register").as("register");
    cy.visit("/register");
    cy.contains("button", /^Register$/).click();
    cy.get<HTMLInputElement>("[name=firstName]").then((input) => {
      expect(input[0].checkValidity()).to.equal(false);
      expect(input[0].validationMessage).not.to.equal("");
    });
    cy.get("@register.all").should("have.length", 0);
  });

  it("rejects an existing registration email", (): void => {
    cy.visit("/register");
    cy.get("[name=firstName]").type("New");
    cy.get("[name=lastName]").type("User");
    cy.get("[name=email]").type("user@e2e.test");
    cy.get("[name=password]").type("Password!123");
    cy.contains("button", /^Register$/).click();
    cy.contains("Email already exists").should("be.visible");
    cy.contains("Login here").click();
    cy.contains("Login to Yoga Studio").should("be.visible");
  });

  it("shows a generic login failure without exposing technical details", (): void => {
    cy.intercept("POST", "/api/auth/login", { statusCode: 500, body: {} });
    cy.visit("/login");
    cy.get("input[type=email]").type("user@e2e.test");
    cy.get("input[type=password]").type("Password!123");
    cy.contains("button", /^Login$/).click();
    cy.contains("Login failed").should("be.visible");
  });

  it("keeps a profile after cancelling account deletion, then deletes it", (): void => {
    login();
    cy.contains("a", "Profile").click();
    cy.contains("My Profile").should("be.visible");
    cy.once("window:confirm", () => false);
    cy.contains("button", "Delete Account").click();
    cy.contains("My Profile").should("be.visible");
    cy.contains("button", "Delete Account").click();
    cy.location("pathname").should("eq", "/login");
    cy.get("input[type=email]").type("user@e2e.test");
    cy.get("input[type=password]").type("Password!123");
    cy.contains("button", /^Login$/).click();
    cy.contains("Invalid credentials").should("be.visible");
  });

  it("displays profile and deletion failures", (): void => {
    login();
    cy.intercept("GET", "/api/user/*", { statusCode: 500, body: {} });
    cy.contains("a", "Profile").click();
    cy.contains("Failed to load user information").should("be.visible");
  });

  it("alerts when account deletion fails", (): void => {
    login();
    cy.contains("a", "Profile").click();
    cy.contains("My Profile").should("be.visible");
    cy.intercept("DELETE", "/api/user/*", { statusCode: 500, body: {} });
    cy.window().then((win) => {
      cy.stub(win, "alert").as("alert");
    });
    cy.contains("button", "Delete Account").click();
    cy.get("@alert").should("have.been.calledWith", "Failed to delete account");
    cy.contains("My Profile").should("be.visible");
  });

  it("shows promotion refusal from the isolated test API", (): void => {
    login();
    cy.contains("a", "Profile").click();
    cy.contains("button", "Promote to Admin (Dev)").click();
    cy.contains("Failed to promote to admin").should("be.visible");
  });

  it("updates the displayed role after a successful development promotion response", (): void => {
    login();
    cy.contains("a", "Profile").click();
    cy.contains("My Profile").should("be.visible");
    // The test API forbids promotion; simulate only this development-only response.
    cy.intercept("POST", "/api/user/promote-admin", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          id: 1,
          email: "user@e2e.test",
          firstName: "Member",
          lastName: "E2E",
          admin: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      });
    });
    cy.contains("button", "Promote to Admin (Dev)").click();
    cy.contains("Administrator").should("be.visible");
    cy.window().then((win) => {
      expect(JSON.parse(win.localStorage.getItem("user")!).admin).to.equal(
        true,
      );
    });
  });
});
