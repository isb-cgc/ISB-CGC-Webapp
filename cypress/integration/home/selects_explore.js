import { visitPage } from '../../support/utils.js'


describe('Tests table navigation functionality', function() {

   before(function()  {
   
   cy.fixture('goes_to_explore').as('gotoexp');   
   const num=0;
   


   })

  beforeEach(function() {
    //visitPage('/')
    cy.fixture('goes_to_explore').as('gotoexp');
    Cypress.Cookies.preserveOnce('sessionid','csrftoken');
  })


for (let id=0;id<2;id++)
{
it('Goes through home page to explore by clicking on Body parts', function() {

 cy.server();
 cy.route('/explore/*').as('expRoute')

 /*cy.fixture('goes_to_explore').then( ids  => {

   for (let id in ids) 
    { */
       visitPage('/')
       cy.get('.'+this.gotoexp[id].bar).click({force:true})
       cy.wait('@expRoute').then( function(xhr) { 
            cy.location().should((loc) => {
           
            expect(loc.search).to.eq(this.gotoexp[id].loc)
            expect(this.gotoexp[id].bar).to.eq(this.gotoexp[id].bar)
            //cy.get('#search_def')
            //alert(document.getElementById('search_def').innerHTML)

               }).then( function(){
                 cy.get('#search_def').should('have.text', this.gotoexp[id].txt);

             })

          })
   /* } 

 }) */

   // cy.get('#search_def')

 }
)

}
})
    

