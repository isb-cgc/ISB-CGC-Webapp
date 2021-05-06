import { visitPage } from '../../support/utils.js'


describe('Tests table navigation functionality', () => {

   before(() => {

     cy.fixture('collection_table_navigation').as('nav') 

     visitPage('/explore/')

   })

  beforeEach(() =>{
    Cypress.Cookies.preserveOnce('sessionid','csrftoken');
  })
  
  it('Changes the collections table page' ,function() {
  
       cy.get('#projects_panel').scrollIntoView().then( function(){
       this.nav.CollectionsPages.forEach(function(value, index){

          cy.get('#projects_panel').find('.dataTables_info').should(($div) => {
          expect($div.text().trim()).equal(value);
        })
    
         cy.get('#projects_panel').find('.next-page').click({force:true});
     

       })

   })

 })

})

    

