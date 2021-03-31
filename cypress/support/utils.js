export const localLogin=() =>{

     cy.get('button').filter('.btn-warn').its('length').then(res=>
       {
         if(res>0){
             cy.get('button').filter('.btn-warn').click({force:true})
         }
     
      }
     );
     cy.viewport(1300,800);
     cy.get('#sign-in-dropdown').click();
     cy.get('#id_login').type(Cypress.env("idcuser"));
     cy.get('#id_password').type(Cypress.env("idcpassword"));
     cy.get('.primaryAction').click();
     cy.wait(1000);

}

export const visitPage=(url,login) =>{

   cy.server();

   cy.visit(url).then( ()=>
       {
         if (login || (Cypress.env('loginNeeded'))==='true'){
           if (Cypress.env('loginType')==='local'){
              localLogin();

          }
      }
    }
  );

}

