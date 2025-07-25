// Wrapper class to hold Payee Distribution data for the UI
public with sharing class PayeeDistributionWrapper {
    @AuraEnabled
    public Integer index { get; set; }
    @AuraEnabled
    public String payeeName { get; set;}
    @AuraEnabled
    public String payeeId { get; set;}
    @AuraEnabled
    public Decimal allocationPercentage { get; set;}
    @AuraEnabled
    public String payeeNumber { get; set;}

    public PayeeDistributionWrapper(
        Integer index,
        String payeeName,
        String payeeId,
        Decimal allocationPercentage,
        String payeeNumber) {

        this.index = index;
        this.payeeName = payeeName;
        this.payeeId = payeeId;
        this.allocationPercentage = allocationPercentage;
        this.payeeNumber = payeeNumber;

    }
}