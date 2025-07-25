public with sharing class MassClientFeeDistributionController {
    
    
    private static MassClientFeeDistributionDAO massClientFeeDistributionDAO = new MassClientFeeDistributionDAO();
    
    @AuraEnabled(cacheable=true)
    public static List<Dealer_Product__c> getInitialData() {
        return massClientFeeDistributionDAO.getDealerProducts();
    }
    
    @AuraEnabled(cacheable=true)
    public static Account getAccountDetailsById(String accountId) {
        return massClientFeeDistributionDAO.getAccountDetailsById(accountId);
    }
    
    
    @AuraEnabled
    public static void processDistributions(
        String classificationCode,
    List<String> excludedDealerIds,
    String productId,
    String feeType,
    Date endDateOpen,
    Date startDateNew,
    Date endDateNew,
    Decimal feeAmountEnd,
    Decimal feeAmountNew,
    List<PayeeDistributionWrapper> payeeDistributions
    ) {
        // In a real-world scenario, you would process the ended allocations here.
        // Here we are creating new distributions.
        
        List<Payee_Distribution__c> newDistributions = new List<Payee_Distribution__c>();
        for (PayeeDistributionWrapper wrapper : payeeDistributions) {
            newDistributions.add(new Payee_Distribution__c(
                Payee__c = wrapper.payeeId,
            Allocation_Percentage__c = wrapper.allocationPercentage,
            Start_Date__c = startDateNew,
            End_Date__c = endDateNew,
            Fee_Amount__c = feeAmountNew,
            Classification_Code__c = classificationCode,
            Product__c = productId,
            Fee_Type__c = feeType
                ));
        }
        
        if (!newDistributions.isEmpty()) {
            massClientFeeDistributionDAO.insertPayeeDistributions(newDistributions);
        }
    }
}