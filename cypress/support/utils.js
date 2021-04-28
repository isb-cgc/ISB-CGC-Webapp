export const localLogin=() =>{
   cy.viewport(1300,800);
   cy.get('#sign-in-dropdown').click();
   cy.get('#id_login').type(Cypress.env("idcuser"));
   cy.get('#id_password').type(Cypress.env("idcpassword"));
   cy.get('.primaryAction').click();
   cy.wait(1000);

}

export const visitPage= function(url,loginReqested) {
   cy.server();
   var loggedIn = false;
   var mustLogIn = false;
   var nurl= Cypress.config().baseUrl+url.split('?')[0];

   if ( (cy.fixture('login_reqs').hasOwnProperty(nurl) && cy.fixture('login_reqs')[nurl]) || (Cypress.env('alwaysLogin')==="true") || loginRequested ){
       var mustLogin= true;
   }

   if (mustLogin && (Cypress.env('loginType')==="google")){
      cy.setCookie("sessionid",Cypress.env('sessionid'));
      cy.setCookie("csrftoken",Cypress.env('csrftoken'));
      loggedIn=true;
   }

   cy.visit(url).then( function() {
      cy.wait(1000);
      cy.get('button').filter('.btn-warn').its('length').then(res=>
       {
          if(res>0){
           cy.get('button').filter('.btn-warn').click({force:true})
          }
         cy.viewport(1300,800);
         if (mustLogin && !(loggedIn) && (Cypress.env('loginType')==='local') ){
             localLogin();
          } 
    });

 });  

}

