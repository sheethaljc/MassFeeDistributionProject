// DAO class for all DML operations
public with sharing class MassClientFeeDistributionDAO {
    
    
    public List<Dealer_Product__c> getDealerProducts() {
        return [SELECT Id, Name, Fee_Type__c FROM Dealer_Product__c];
    }
    
    // public List<Account> searchPayees(String searchTerm) {
    //     // 1. Build the query as a String, enclosed in single quotes ''.
    //     String query = 'SELECT Id, Name, AccountNumber FROM Account WHERE ' +
    //         'Name LIKE \'%' + String.escapeSingleQuotes(searchTerm) + '%\' OR ' +
    //         'AccountNumber LIKE \'%' + String.escapeSingleQuotes(searchTerm) + '%\' ' +
    //         'ORDER BY Name ASC LIMIT 10';
        
    //     // 2. Execute the string using Database.query().
    //     return Database.query(query);
    // }
    
    public Account getAccountDetailsById(String accountId) {
        return [SELECT Id, Name, AccountNumber FROM Account WHERE Id = :accountId LIMIT 1];
    }
    
    
    public void insertPayeeDistributions(List<Payee_Distribution__c> distributions) {
        try {
            insert distributions;
        } catch (DmlException e) {
            // Handle DML exception
            System.debug('DML Exception: ' + e.getMessage());
            throw new AuraHandledException('Error inserting Payee Distributions: ' + e.getMessage());
        }
    }
}