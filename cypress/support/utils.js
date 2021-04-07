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

export const visitPage= function(url,login) {

   cy.server();
   cy.fixture('login_reqs').as('reqs')
   
   cy.visit(url).then( function() {
       var nurl= Cypress.config().baseUrl+url.split('?')[0];
       cy.log(nurl);
       cy.log(this.reqs[nurl]);
       if (this.reqs.hasOwnProperty(nurl) && this.reqs[nurl]){
          if (Cypress.env('loginType')==='local'){
              localLogin();
          }
    }
   
  });

  

}

