@isTest
private class MassClientFeeDistributionControllerTest {
    
    // Helper method to create test data
    @TestSetup
    static void makeData(){
        
        String validFeeType = '';
        Schema.DescribeFieldResult fieldResult = Dealer_Product__c.Fee_Type__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        if (!picklistEntries.isEmpty()) {
            validFeeType = picklistEntries[0].getValue();
        } else {
            // If the picklist has no values, the test cannot proceed with this field.
            // Consider adding a default value or throwing an error.
            // For this test, we'll proceed, but dependent tests might fail.
            System.debug('Warning: Fee_Type__c picklist has no values.');
        }
        
        // Create Dealer Products
        List<Dealer_Product__c> products = new List<Dealer_Product__c>();
        products.add(new Dealer_Product__c(Name = 'Test Product 1', Fee_Type__c = validFeeType));
        products.add(new Dealer_Product__c(Name = 'Test Product 2', Fee_Type__c = validFeeType));
        insert products;
        
        // Create Accounts
        List<Account> accounts = new List<Account>();
        accounts.add(new Account(Name = 'Test Payee Account 1', AccountNumber = 'P123'));
        accounts.add(new Account(Name = 'Test Payee Account 2', AccountNumber = 'P456'));
        insert accounts;
    }
    
    @isTest
    static void testGetInitialData() {
        Test.startTest();
        List<Dealer_Product__c> result = MassClientFeeDistributionController.getInitialData();
        Test.stopTest();
        
        System.assertNotEquals(0, result.size(), 'Should return more dealer products.');
    }
    
    @isTest
    static void testGetPayeeDistributionWrapper() {
        
        // --- Test the no-argument constructor ---
        // This primarily ensures that it can be instantiated without errors.
        // If your no-argument constructor sets default values, you'd assert those here.
        PayeeDistributionWrapper defaultWrapper = new PayeeDistributionWrapper();

        // Assert that the object was created (not null)
        System.assertNotEquals(null, defaultWrapper, 'Default constructor should create a non-null object.');
        // If you had default values, e.g., index = 0, you'd assert:
        // System.assertEquals(0, defaultWrapper.index, 'Default index should be 0.');
        // Setup specific data for this test
        // 

        Account payee = [SELECT Id FROM Account WHERE Name = 'Test Payee Account 1' LIMIT 1];
        Payee_Distribution__c dist = new Payee_Distribution__c(
            Payee__c = payee.Id,
            Allocation_Percentage__c = 50
        );
        insert dist;
        
        Test.startTest();
        PayeeDistributionWrapper wrapper = MassClientFeeDistributionController.getPayeeDistributionWrapper(dist.Id, 1);
        Test.stopTest();
        
        System.assertNotEquals(null, wrapper, 'Wrapper should not be null.');
        System.assertEquals(1, wrapper.index, 'Index should be 1.');
        System.assertEquals(payee.Id, wrapper.payeeId, 'Payee ID should match.');
        System.assertEquals(50, wrapper.allocationPercentage, 'Allocation percentage should match.');
        System.assertEquals(dist.Id, wrapper.payeeDistributionRecordId, 'Payee Distribution Record ID should match.');
    }
    
    @isTest
    static void testProcessDistributions() {
        // Setup
        Account payee1 = [SELECT Id FROM Account WHERE Name = 'Test Payee Account 1' LIMIT 1];
        Dealer_Product__c product = [SELECT Id, Fee_Type__c FROM Dealer_Product__c LIMIT 1];
        
        Payee_Distribution__c dist1 = new Payee_Distribution__c(Payee__c = payee1.Id, Allocation_Percentage__c = 75);
        insert dist1;

        List<PayeeDistributionWrapper> wrappers = new List<PayeeDistributionWrapper>();
        wrappers.add(new PayeeDistributionWrapper(1, 'Test Payee Account 1', payee1.Id, 75, 'P123', dist1.Id));

        String classificationCode = 'Test-Class-001';
        Date testDate = Date.today();

        Test.startTest();
        MassClientFeeDistributionController.processDistributions(
            classificationCode,
            new List<String>(),
            product.Id,
            product.Fee_Type__c, // Use the valid fee type from the test data
            testDate,
            testDate.addDays(30),
            null,
            null,
            500.00,
            wrappers
        );        
        Test.stopTest();

        // Verification
        Payee_Distribution__c updatedDist = [SELECT Id, Classification_Code__c, Product__c, Fee_Amount__c FROM Payee_Distribution__c WHERE Id = :dist1.Id];
        System.assertEquals(classificationCode, updatedDist.Classification_Code__c, 'Classification Code should be updated.');
        System.assertEquals(product.Id, updatedDist.Product__c, 'Product ID should be updated.');
        System.assertEquals(500.00, updatedDist.Fee_Amount__c, 'Fee Amount should be updated.');
    }
    
    
    @isTest
    static void testGetPayeeDistributionWrapper_ErrorHandling() {
        // Test error case where record does not exist
        try {
            MassClientFeeDistributionController.getPayeeDistributionWrapper(getFakeId(), 1);
            System.assert(false, 'Expected an exception to be thrown.');
        } catch (AuraHandledException e) {
			System.assert(e.getMessage() != null, 'The exception message was null, which was not expected.');
        }
    }
    
    @isTest
    static void testValidConstructor() {
        
    }
    
    // Helper to get a fake Id for negative testing
    private static Id getFakeId() {
        String prefix = Payee_Distribution__c.SObjectType.getDescribe().getKeyPrefix();
        return Id.valueOf(prefix + '0'.repeat(12));

    }
}