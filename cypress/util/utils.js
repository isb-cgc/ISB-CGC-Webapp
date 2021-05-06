export const localLogin=() =>{

     cy.server();
     cy.visit('/');
     cy.get('button').filter('.btn-warn').click();
     cy.viewport(1300,800);
     cy.get('#sign-in-dropdown').click();
     cy.get('#id_login').type(Cypress.env("idcuser"));
     cy.get('#id_password').type(Cypress.env("idcpassword"));
     cy.get('.primaryAction').click();
     cy.wait(1000);

}

/Users/george/idc/IDC-WebApp/cypress/util export const visitPage=(url,login) =>{

   cy.server()
   cy.visit(url).then(
       if (login || Cypress.env('loginNeeded')){
           if (Cypress.env('loginType')==='local'){
              localLogin();
          }
      }

   );

}


