public with sharing class MassClientFeeDistributionDAO {

    public List<Dealer_Product__c> getDealerProducts() {
        return [SELECT Id, Name, Fee_Type__c FROM Dealer_Product__c];
    }

    /**
     * Corrected: Uses a static SOQL query with a bind variable.
     * This is secure and the recommended approach.
     */
    public List<Account> searchPayees(String searchTerm) {
        String likeTerm = '%' + searchTerm + '%';
        return [SELECT Id, Name, AccountNumber FROM Account
                WHERE Name LIKE :likeTerm OR AccountNumber LIKE :likeTerm
                ORDER BY Name ASC LIMIT 10];
    }
    
    /**
     * New method to get a single Account by its ID.
     */
    public Account getAccountById(Id accountId) {
        return [SELECT Id, Name, AccountNumber FROM Account WHERE Id = :accountId LIMIT 1];
    }

    /**
     * New method to get a single Payee Distribution record by its ID.
     */
    public Payee_Distribution__c getPayeeDistributionById(Id recordId) {
        List<Payee_Distribution__c> distributions = [SELECT Id, Payee__c, Allocation_Percentage__c 
                                                     FROM Payee_Distribution__c 
                                                     WHERE Id = :recordId LIMIT 1];
        return distributions.isEmpty() ? null : distributions[0];
    }

    /**
     * New method to insert a single Payee Distribution record.
     */
    public void insertPayeeDistribution(Payee_Distribution__c distribution) {
        try {
            insert distribution;
        } catch (DmlException e) {
            System.debug('DML Exception: ' + e.getMessage());
            throw new AuraHandledException('Error inserting Payee Distribution: ' + e.getMessage());
        }
    }
}
