describe("Login page", (): void => {
  it("displays the login form", (): void => {
    cy.visit("/login");

    cy.contains("h2", "Login to Yoga Studio").should("be.visible");

    cy.get('input[type="email"]')
      .should("be.visible")
      .and("have.attr", "required");

    cy.get('input[type="password"]')
      .should("be.visible")
      .and("have.attr", "required");

    cy.contains("button", /^Login$/).should("be.enabled");

    cy.contains("a", "Register here").should("have.attr", "href", "/register");
  });
});
