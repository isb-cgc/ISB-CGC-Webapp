export const login=() =>{

cy.server();
     //cy.visit('http://localhost:8085/') ;
     cy.visit('/');
     cy.get('button').filter('.btn-warn').click();
     cy.viewport(1300,800);
     cy.get('#sign-in-dropdown').click();
     cy.get('#id_login').type(Cypress.env("idcuser"));
     cy.get('#id_password').type(Cypress.env("idcpassword"));
     cy.get('.primaryAction').click();
     cy.wait(1000);

}
