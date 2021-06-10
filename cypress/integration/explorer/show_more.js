import { visitPage } from '../../support/utils.js'

const checkVis = ($el, index, cutoff)=>{
       
   cy.get($el).children('.list-group-item__heading').find('a').as('nextBut');
   cy.get('@nextBut').click({force: true});



   cy.get($el).children('.list-group-item__body').find('.checkbox').as('checkboxes')
   cy.get('@checkboxes').not('.extra-values').as('notExtras');
   cy.get('@notExtras').its('length').should('be.lt',cutoff);
   cy.get('@notExtras').each( function($not,index1)  {
        cy.get($not).scrollIntoView().should('not.have.class','notDisp');
    })
   cy.get('@checkboxes').then(function($chkbox) {
     if ($chkbox.length> cutoff){
        cy.get('@checkboxes').filter('.extra-values').as('extras');
        cy.get('@extras').each( ($is,index1) => {
             cy.get($is).should('have.class','notDisp');
         });              
        cy.get($el).children('.list-group-item__body').children('.more-checks').children('a').click({force:true});
        cy.get('@extras').each( ($is,index1) => {
            cy.get($is).scrollIntoView().should('not.have.class','notDisp');
        })
      }
   })

  
 }


describe('Tests show more functionality', () => {


 before(() => {
     visitPage('/explore/',false)

 })

 beforeEach(() =>{
    
    Cypress.Cookies.preserveOnce('sessionid','csrftoken');
    cy.fixture('show_more').as('show');

 })



 it ('Opens Collections',function() {
    cy.viewport(1000,1000);
    cy.wait(1000);
    cy.get('#Program_heading').scrollIntoView().find('a').click({force:true});
    cy.get('#Program_list').should('be.visible');


   cy.get('#Program_list').children('.list-group-item').as('listItems')
   cy.get('@listItems').not('.extra-values').as('notExtras');
   cy.get('@notExtras').its('length').should('be.lt',this.show.showMoreCutOff);
   cy.get('@notExtras').each( function($not,index1)  {
        cy.get($not).scrollIntoView().should('not.have.class','notDisp');
        
    })

    cy.get('@listItems').filter('.extra-values').as('extras')
    cy.get('@extras').each( function($not,index1)  {
        cy.get($not).scrollIntoView().should('have.class','notDisp');
        
    })

   cy.get('#Program').children('.more-checks').children('.show-more').click({force:true})

    cy.get('@extras').each( ($is,index1) => {
             cy.get($is).should('not.have.class','notDisp');
         });
    
 })


 it ('Show more checkboxes orig', function() {
    cy.get('#search_orig').scrollIntoView();
    cy.get('#search_orig').children('a').click({force:true});
    cy.get('#search_orig_set').children('.list-group').children('.list-group-item').each( ($el,index) => {
       checkVis($el,index, this.show.showMoreCutOff);
    })
 }) 


 it ('Show more checkboxes derived',function() {
    cy.get('#search_derived').scrollIntoView();
    cy.get('#search_derived').children('a').click({force:true});
    
    cy.get('#search_derived_set').children('.list-group').children('.list-group-item').each( ($catList,index0) => {
       cy.get($catList).children('.list-group-item__heading').children('a').click({force:true});
       cy.get($catList).children('.list-group-item__body').children('.list-group').children('.list-group-item').each( ($el,index) => {    
       cy.get($el).then( function() {
            if ($el.children('.list-group-item__body').not('.isQuant').length>0) 
            {
               //cy.pause();
               checkVis($el,index, this.show.showMoreCutOff);
            }
         });   
      })  
    }) 
 }) 


 it ('Show more checkboxes related', function() {
     cy.get('#TCGA_heading').children('input:checkbox').click( {force : true});
     cy.get('#search_related').children('a').scrollIntoView().click({force:true});
     cy.get('#tcga_clinical_heading').children('a').click({force:true});

     cy.get('#tcga_clinical').children('.list-group').children('.list-group-item').each(function($el,index) {

        if ($el.children('.list-group-item__body').not('.isQuant').length>0)   
        {
            checkVis($el,index, this.show.showMoreCutOff);
        }

     })  
 })  

})
