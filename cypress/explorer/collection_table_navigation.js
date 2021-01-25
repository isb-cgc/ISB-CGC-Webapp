describe('Tests table navigation functionality', () => {

   before(() => {
     cy.server();
     cy.route('Get', 'http://localhost:8085/').as('explore');
     cy.visit('http://localhost:8085/') ;
     cy.get('.btn-warn').click({force:true});
     cy.viewport(1300,800);
     cy.get('#sign-in-dropdown').click();
     cy.get('#id_login').type(Cypress.env("idcuser"));
     cy.get('#id_password').type(Cypress.env("idcpassword"));
     cy.get('.primaryAction').click();
     cy.wait(1000);
     cy.visit('http://localhost:8085/explore/')

   })

  beforeEach(() =>{
    Cypress.Cookies.preserveOnce('sessionid','csrftoken')
  })
  

  it('Changes the collections table page' ,() => {
  
    cy.get('#projects_panel').scrollIntoView(); 
    cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
       expect($div.text().trim()).equal('Showing 1 to 10 of 24 entries');
     })
    
    cy.get('#projects_panel').find('.next-page').click({force:true});
     
   /*
    cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
       expect($div.text().trim()).equal('Showing 11 to 20 of 24 entries');
     })
    cy.get('#projects_panel').find('.next-page').click({force:true});
    cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
       expect($div.text().trim()).equal('Showing 21 to 24 of 24 entries');
     })

   */
  })

})
