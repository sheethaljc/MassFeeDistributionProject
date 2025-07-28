// Wrapper class to hold Payee Distribution data for the UI
// PayeeDistributionWrapper.cls
public with sharing class PayeeDistributionWrapper {
    @AuraEnabled
    public Integer index { get; set; }
    @AuraEnabled
    public String payeeName { get; set;}
    @AuraEnabled
    public String payeeId { get; set;} // This is the Account Id
    @AuraEnabled
    public Decimal allocationPercentage { get; set;}
    @AuraEnabled
    public String payeeNumber { get; set;}
    @AuraEnabled
    public String payeeDistributionRecordId { get; set; } // To store the Payee_Distribution__c ID

    public PayeeDistributionWrapper() {
        // This constructor is required for Salesforce to deserialize the object
        // when passed from Lightning Web Components.
        // we can leave it empty or initialize default values if needed.
    }

    public PayeeDistributionWrapper(
        Integer index,
        String payeeName,
        String payeeId,
        Decimal allocationPercentage,
        String payeeNumber,
        String payeeDistributionRecordId) { 

        this.index = index;
        this.payeeName = payeeName;
        this.payeeId = payeeId;
        this.allocationPercentage = allocationPercentage;
        this.payeeNumber = payeeNumber;
        this.payeeDistributionRecordId = payeeDistributionRecordId;
    }
}