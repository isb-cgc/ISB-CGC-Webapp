import { login } from '../util/utils.js'

describe('Tests hide attributes functionality', () => {

 before(() => {
     login()
 })

  beforeEach(() =>{
    Cypress.Cookies.preserveOnce('sessionid','csrftoken')
  })




  it ('Opens Collections and Selects TCGA',() =>{
    
    cy.server();
    cy.route('GET','/explore/*').as('getExplore');
    cy.viewport(1000,1000);
    cy.wait(1000)
    cy.get('#Program_heading').find('a').click();
    cy.get('#Program_list').should('be.visible');
    cy.get('#TCGA_heading').children('a').should('be.visible');
    cy.get('#TCGA_heading').children('input').click();
    cy.wait('@getExplore');
    cy.get('@getExplore').then( function(xhr){
      expect(xhr.status).to.eq(200);
    })


    cy.get('#TCGA') 
    cy.get('#TCGA').find('input:checkbox').then( ($ck) => {
       const len = $ck.length;
       const lenck = $ck.filter(':checked').length;
       const lennt = $ck.not(':checked').length;
       expect(len).to.eq(lenck);
       expect(lennt).to.eq(0);
    });
 
  }) 


  it ('Selects BodyPart_Abdomen_wTCGA',() =>{
 
    cy.server();
    cy.route('GET','http://localhost:8085/explore/*').as('getExplore');
    cy.get('#BodyPartExamined_heading').scrollIntoView().should('be.visible');
    
    //cy.wait(1000);
    cy.get('#BodyPartExamined_heading').children('a').click({force:true}); 
    cy.get('#BodyPartExamined_list').find('input').first().click({force:true});
    cy.wait('@getExplore');
    cy.get('@getExplore').then( function(xhr){
      expect(xhr.status).to.eq(200);
     }) 

    cy.get('#BodyPartExamined_heading').children('a').click(); 

  })

  it ('Hides Attributes w 0 Cases after TCGA, Abdomen Filter',() =>{
  
    cy.get('#hide-zeros').as('hideZeros');
    cy.get('@hideZeros').should('not.be.checked');
    cy.get('.search-configuration').find('.case_count').as('caseCounts');
    cy.get('.search-configuration').find('.case_count:visible').should('not.exist');
    cy.get('#search_orig_set').scrollIntoView();
    cy.get('#search_orig_set').children('.list-group').each( ($el,index) =>
     {
      cy.log('here');
      cy.get($el).find('.list-group-item__heading').find('a').as('nextBut');
      cy.get('@nextBut').scrollIntoView();
      cy.get('@nextBut').should('be.visible');
      cy.get('@nextBut').click({force: true});
     }
    );
    cy.get('#search_orig_set').find('.case_count').filter(':visible').as('searchCnts');  
    cy.get('@searchCnts').contains(/^0$/).as('wZeros');
    cy.get('@searchCnts').its('length').should('be.gt',0);
    cy.get('@wZeros').its('length').should('be.gt',0);  
    cy.get('@hideZeros').click({force:true});
    cy.get('#search_orig_set').find('.case_count').filter(':visible').as('searchCnts');
    cy.get('@searchCnts').contains(/^0$/).as('wZeros').should('not.exist');


  })

  it ('Show Attributes w 0 Cases when hideZeros is deselected' ,() => {
     cy.get('#hide-zeros').as('hideZeros');
     cy.get('@hideZeros').click({force:true});
     cy.get('#search_orig_set').find('.case_count').filter(':visible').as('searchCnts');
     cy.get('@searchCnts').contains(/^0$/).as('wZeros').should('exist');
  })

    it (' Goes to Derive Tab, hidesZeros, and shows all greyed out tabs' ,() => {
       cy.get('#search_derived').scrollIntoView();
       cy.get('#search_derived').children('a').click({force:true});
       // cy.get('#search_derived_set').find('.case_count').filter(':visible').as('searchCnts');
       cy.get('#hide-zeros').as('hideZeros');
       cy.get('@hideZeros').click({force:true});
      cy.get('#search_derived_set').find('.list-group-item__body').find('.list-group-item__heading').find('.attDisp').as('derivedHeadings');
      cy.get('@derivedHeadings').its('length').should('equal',27);
       //cy.get('@derivedHeadings').its('length').as('dlen')
     //expect(cy.get('@dlen')).to.equal(27);    

      cy.get('@derivedHeadings').filter('.greyText').should('exist');
      cy.get('@derivedHeadings').filter('.greyText').as('greyout');
      cy.get('@greyout').its('length').should('equal',27);


 }) 


   it ('Hides Attributes w 0 Cases after TCGA, Abdomen Filter in Related Tab',() =>{

    cy.get('#hide-zeros').as('hideZeros');
    //cy.get('@hideZeros').should('not.be.checked');
    cy.get('.search-configuration').find('.case_count').as('caseCounts');
    cy.get('.search-configuration').find('.case_count:visible').should('not.exist');
    cy.get('#search_related').scrollIntoView();
    cy.get('#search_related').children('a').click({force:true});
    //cy.get('#tcga_clinical_heading').children('a').click({force:true}); 
    

     cy.get('#tcga_clinical').children('.list-group').each( ($el,index) =>
     {
      cy.log('here');
       cy.get($el).find('.list-group-item__heading').find('a').as('nextBut');
     // cy.get('@nextBut').scrollIntoView();
     //cy.get('@nextBut').should('be.visible');
      cy.get('@nextBut').click({force: true}); 
     }
    );
   
    cy.get('#search_related_set').find('.case_count').filter(':visible').as('searchCnts');
    cy.get('@searchCnts').its('length').should('be.gt',0);
    cy.get('@searchCnts').contains(/^0$/).as('wZeros').should('not.exist');
    cy.get('@hideZeros').click({force:true});
    cy.get('#search_related_set').find('.case_count').filter(':visible').as('searchCnts');
    cy.get('@searchCnts').contains(/^0$/).as('wZeros');
    cy.get('@wZeros').its('length').should('be.gt',0); 


  })

})


