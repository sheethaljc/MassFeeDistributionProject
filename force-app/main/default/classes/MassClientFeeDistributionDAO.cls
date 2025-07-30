public with sharing class MassClientFeeDistributionDAO {

    public List<Dealer_Product__c> getDealerProducts() {
        return [SELECT Id, Name, Fee_Type__c FROM Dealer_Product__c];
    }
    /**
     * Method to fetch all Account records that could be dealers.
     * We might want to filter this further based on your specific "Dealer" criteria (e.g., RecordType, custom field).
     */
    public List<Account> getDealers() {
        return [SELECT Id, Name, AccountNumber FROM Account Order BY Name ASC];
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
}
