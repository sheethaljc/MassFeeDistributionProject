public with sharing class MassClientFeeDistributionController {

    private static MassClientFeeDistributionDAO dao = new MassClientFeeDistributionDAO();

    @AuraEnabled(cacheable=true)
    public static List<Dealer_Product__c> getInitialData() {
         System.debug('MassClientFeeDistributionController.getInitialData()');
        return dao.getDealerProducts();
    }

    @AuraEnabled(cacheable=true)
    public static Account getAccountDetailsById(Id accountId) {
        if (accountId == null) {
            return null;
        }
        System.debug('MassClientFeeDistributionController.getAccountDetailsById()' );
        System.debug('Account Id : ' + accountId);
        return dao.getAccountById(accountId);
    }

    /**
     * This method is now called AFTER the record-edit-form saves the record.
     * Its only job is to query the newly created record and its related Payee data
     * and return it in the wrapper format for the LWC's data table.
     * It does NOT perform any DML itself.
     */
    @AuraEnabled(cacheable=true) // This can be cacheable as it only reads data
    public static PayeeDistributionWrapper getPayeeDistributionWrapper(Id recordId, Integer index) {

        System.debug(
            'MassClientFeeDistributionController.getPayeeDistributionWrapper(): ' +
            'recordId: ' +
            recordId +
            ', index: ' +
            index
        );

        // Query for the record that was just created by the lightning-record-edit-form
        Payee_Distribution__c newDistribution = dao.getPayeeDistributionById(recordId);
        if(newDistribution == null) {
            throw new AuraHandledException('Could not find the newly created Payee Distribution record.');
        }

        // Now get the related Account details
        Account payeeAccount = dao.getAccountById(newDistribution.Payee__c);
        if(payeeAccount == null) {
            throw new AuraHandledException('Could not find the related Payee Account.');
        }

        System.debug('payeeAccount: ' + JSON.serialize(payeeAccount));

        // Return the wrapper object for the UI table
        return new PayeeDistributionWrapper(
            index,
            payeeAccount.Name,
            String.valueOf(payeeAccount.Id), // Explicitly convert Id to String
            newDistribution.Allocation_Percentage__c,
            payeeAccount.AccountNumber,
            String.valueOf(newDistribution.Id) // Explicitly convert Id to String for payeeDistributionRecordId
        );
    }

    /**
     * This method is called from the modal's record-edit-form.
     * It saves a single Payee_Distribution__c record and returns a wrapper
     * object with all the necessary details to display in the UI data table.
     * NOTE: This method is not directly used in the current LWC HTML/JS based on recent changes.
     * The LWC now directly submits the lightning-record-edit-form, and then calls getPayeeDistributionWrapper.
     * Keeping it here for completeness if it's used elsewhere or re-introduced.
     */
    @AuraEnabled
    public static PayeeDistributionWrapper saveSinglePayeeDistribution(Payee_Distribution__c payeeDistribution, Integer index) {
        // You can add server-side validation here if needed
        System.debug('saveSinglePayeeDistribution: ' + JSON.serialize(payeeDistribution));
        // Insert the record
        dao.insertPayeeDistribution(payeeDistribution);

        // After inserting, we need the Payee's Name and Number for the UI table.
        // The record only contains the ID, so we query for the details.
        Account payeeAccount = dao.getAccountById(payeeDistribution.Payee__c);

        System.debug('payeeAccount: ' + JSON.serialize(payeeAccount));

        // Return a wrapper object that the LWC can easily use to display the new row
        return new PayeeDistributionWrapper(
            index,
            payeeAccount.Name,
            String.valueOf(payeeAccount.Id), // Explicitly convert Id to String
            payeeDistribution.Allocation_Percentage__c,
            payeeAccount.AccountNumber,
            String.valueOf(payeeDistribution.Id) // Id of the newly inserted Payee_Distribution__c
        );
    }

    /**
     * This is the final submission method that processes the mass client fee distribution.
     * It will now UPDATE the previously created Payee_Distribution__c records
     * with the main form's data.
     */
    @AuraEnabled
    public static void processDistributions(
        String classificationCode,
        List<String> excludedDealerIds, // Currently unused in LWC, but kept for signature
        String productId,
        String feeType,
        Date endDateOpen,
        Date startDateNew,
        Date endDateNew,
        Decimal feeAmountEnd,
        Decimal feeAmountNew,
        List<PayeeDistributionWrapper> payeeDistributions
    ) {
        System.debug('*** Apex Debug: processDistributions called ***');
        System.debug('Processing ' + payeeDistributions.size() + ' distributions for update.');

        List<Payee_Distribution__c> distributionsToUpdate = new List<Payee_Distribution__c>();

        for (PayeeDistributionWrapper wrapper : payeeDistributions) {
            System.debug('Updating Payee Distribution: ' + wrapper.payeeDistributionRecordId);
            // Create a new Payee_Distribution__c sObject to update
            // Ensure the ID is set so DML performs an update, not an insert.
            distributionsToUpdate.add(new Payee_Distribution__c(
                Id = wrapper.payeeDistributionRecordId, // Use the stored record ID
                Name = classificationCode,
                Classification_Code__c = classificationCode,
                Product__c = productId,
                Fee_Type__c = feeType,
                Start_Date__c = startDateNew,
                End_Date__c = endDateNew,
                Fee_Amount__c = feeAmountNew,
                // These two fields are already set, but setting them again does no harm
                Payee__c = wrapper.payeeId, // This is the Account Id (String)
                Allocation_Percentage__c = wrapper.allocationPercentage
            ));
        }

        if (!distributionsToUpdate.isEmpty()) {
            try {
                update distributionsToUpdate; // Perform the DML update
                System.debug('Successfully updated ' + distributionsToUpdate.size() + ' Payee_Distribution__c records.');
            } catch (DmlException e) {
                System.debug('DML Exception during update: ' + e.getMessage());
                throw new AuraHandledException('Error updating Payee Distributions: ' + e.getMessage());
            }
        }
    }
}