import { visitPage } from '../../support/utils.js'

describe('Tests show more functionality', () => {


 before(() => {
     visitPage('/explore/',true)

 })

  beforeEach(() =>{
    
    Cypress.Cookies.preserveOnce('sessionid','csrftoken')
  })



  it ('Opens Collections',() =>{
    cy.viewport(1000,1000);
    cy.wait(1000);
    cy.get('#Program_heading').scrollIntoView().find('a').click();
    cy.get('#Program_list').should('be.visible');
    cy.get('#TCGA_heading').children('a').click( {force : true});
    cy.get('#TCGA').find('.search-checkbox-list').children('.checkbox').as('checkboxes');

    cy.get('@checkboxes').not('.extra-values').as('notExtras');
    cy.get('@notExtras').its('length').should('be.lt',6);
    
    cy.get('@notExtras').each( ($el,index) => {
    cy.get($el).should('be.visible');

    })

     cy.get('@checkboxes').filter('.extra-values').as('extras');

     cy.get('@extras').each( ($el,index) => {
         cy.get($el).should('not.be.visible');

       })

     cy.get('#TCGA').find('.show-more').click();

     cy.get('@checkboxes').each( ($el,index) => {
        cy.get($el).should('be.visible');
     })

    cy.get('#TCGA_heading').children('a').click( {force : true});

    })


     it ('Show more checkboxes orig',() =>{

     cy.get('#search_orig').scrollIntoView();
     cy.get('#search_orig').children('a').click({force:true});
     cy.get('#search_orig_set').children('.list-group').each( ($el,index) => {
     cy.get($el).children('.list-group-item').children('.list-group-item__heading').find('a').as('nextBut');
     cy.get('@nextBut').click({force: true});
     cy.get($el).children('.list-group-item').children('.list-group-item__body').find('.checkbox').as('checkboxes') 
     
     cy.get('@checkboxes').not('.extra-values').as('notExtras');
     cy.get('@notExtras').its('length').should('be.lt',6);
     cy.get('@notExtras').each( ($not,index1) => {
         //cy.get($not).scrollIntoView().should('be.visible');
        cy.get($not).scrollIntoView().should('not.have.class','notDisp');

       })

     cy.get('@checkboxes').filter('.extra-values').as('extras');
     cy.get('@extras').each( ($is,index1) => {
       //cy.get($is).scrollIntoView();
       //cy.get($is).should('not.be.visible');
      cy.get($is).should('have.class','notDisp');      

     }) 

    cy.get($el).children('.list-group-item').children('.list-group-item__body').children('.more-checks').children('a').click({force:true});


    

     //cy.get('@checkboxes').filter('.extra-values').as('extras');
     cy.get('@extras').each( ($is,index1) => {
       cy.get($is).scrollIntoView().should('not.have.class','notDisp');

     })



   })

  }) 


   it ('Show more checkboxes derived',() =>{

     cy.get('#search_derived').scrollIntoView();
     cy.get('#search_derived').children('a').click({force:true});

      cy.get('#search_derived_set').children('.list-group').children('.list-group-item').children('.list-group-item__body').each( ($lst,index0) => {
         

         cy.get($lst).children('.list-group').children('.list-group-item').each( ($el,index1) => {    
          

            cy.log(index0+"ind"+index1);
            if (index0===1){   
               
            cy.get($el).children('.list-group-item__heading').find('a').as('nextBut');
            cy.get('@nextBut').click({force: true});
           
            cy.get($el).children('.list-group-item__body').find('.checkbox').as('checkboxes')
    
            cy.get('@checkboxes').not('.extra-values').as('notExtras');
            cy.get('@notExtras').its('length').should('be.lt',6);
            cy.get('@notExtras').each( ($not,index2) => {
                //cy.get($not).scrollIntoView().should('be.visible');
             cy.get($not).scrollIntoView().should('not.have.class','notDisp');
             }) 

             if ( (index0 ===0) || !(index1 ===1)) { 
                cy.get('@checkboxes').filter('.extra-values').as('extravalues');

                cy.get('@extravalues').each( ($is,index2) => {
                  //cy.get($is).scrollIntoView();
                  cy.get($is).should('have.class','notDisp');
               })
               cy.get($el).children('.list-group-item__body').children('.more-checks').children('a').click({force:true});
             
                cy.get('@extravalues').each( ($is,index2) => {
                  //cy.get($is).scrollIntoView().should('not.have.class','notDisp');
                   cy.get($is).scrollIntoView();
               })

                 
               cy.get($el).children('.list-group-item__body').children('.less-checks').children('a').click({force:true});

                cy.get('@extravalues').each( ($is,index2) => {
                  //cy.get($is).scrollIntoView();
                  cy.get($is).should('have.class', 'notDisp');
               })

              
             }


         }
        
       })
    

   }) 


  }) 


   it ('Show more checkboxes related',() =>{

    cy.get('#search_related').children('a').scrollIntoView().click({force:true});
     //cy.get('#search_related').children('a').click({force:true});

   //  cy.get('#tcga_clinical_heading').scrollIntoView();
   //  cy.get('#tcga_clinical_heading').children('a').click({force:true});
     
    
    cy.get('#tcga_clinical').children('.list-group').each( ($el,index) => {

       if ( !(index===0) && !(index===1) && !(index===4) && !(index===5) && !(index===13)  ) { 
        cy.get($el).children('.list-group-item').children('.list-group-item__heading').find('a').as('nextBut');
        cy.get('@nextBut').click({force: true});
       cy.get($el).children('.list-group-item').children('.list-group-item__body').find('.checkbox').as('checkboxes')

       cy.get('@checkboxes').not('.extra-values').as('notExtras');
       cy.get('@notExtras').its('length').should('be.lt',6);
       cy.get('@notExtras').each( ($not,index1) => {
          cy.get($not).scrollIntoView().should('not.have.class','notDisp');
          //cy.get($not).should('be.visible');

        })

         cy.get('@checkboxes').filter('.extra-values').as('extras');
         cy.get('@extras').each( ($is,index1) => {
         cy.get($is).should('have.class','notDisp');

        })

       cy.get($el).children('.list-group-item').children('.list-group-item__body').children('.more-checks').children('a').click({force:true});

       cy.get('@extras').each( ($is,index1) => {
          cy.get($is).scrollIntoView().should('not.have.class','notDisp');
         //cy.get($is).should('be.visible');

       })

        cy.get($el).children('.list-group-item').children('.list-group-item__body').children('.less-checks').children('a').scrollIntoView().click({force:true});

       cy.get('@extras').each( ($is,index1) => {
          //cy.get($is).scrollIntoView();
         cy.get($is).should('have.class','notDisp');

       })




     }

   })  
  
  

  }) 

 

})


