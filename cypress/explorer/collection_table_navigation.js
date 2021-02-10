import { login } from '../util/utils.js'


describe('Tests table navigation functionality', () => {

   before(() => {
     login()

   })

  beforeEach(() =>{
    Cypress.Cookies.preserveOnce('sessionid','csrftoken')
  })
  

  it('Changes the collections table page' ,() => {
  
    cy.get('#projects_panel').scrollIntoView(); 
    cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
       expect($div.text().trim()).equal('Showing 1 to 10 of 25 entries');
     })
    
    cy.get('#projects_panel').find('.next-page').click({force:true});
     
   
    cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
       expect($div.text().trim()).equal('Showing 11 to 20 of 25 entries');
     })
    cy.get('#projects_panel').find('.next-page').click({force:true});
    cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
       expect($div.text().trim()).equal('Showing 21 to 25 of 25 entries');
     })

   
  })

})
