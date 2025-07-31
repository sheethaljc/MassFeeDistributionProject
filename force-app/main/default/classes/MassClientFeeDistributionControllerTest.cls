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
            // For this test, will proceed, but dependent tests might fail.
            System.debug('Warning: Fee_Type__c picklist has no values.');
        }
        
        // Create Dealer Products
        List<Dealer_Product__c> products = new List<Dealer_Product__c>();
        products.add(new Dealer_Product__c(Name = 'Test Product 1', Fee_Type__c = validFeeType));
        products.add(new Dealer_Product__c(Name = 'Test Product 2', Fee_Type__c = validFeeType));
        insert products;
        
         // Create Accounts (including those for dealers and payees)
        List<Account> accounts = new List<Account>();
        accounts.add(new Account(Name = 'Test Payee Account 1', AccountNumber = 'P123'));
        accounts.add(new Account(Name = 'Test Payee Account 2', AccountNumber = 'P456'));
        accounts.add(new Account(Name = 'Test Dealer A', AccountNumber = 'D001')); 
        accounts.add(new Account(Name = 'Test Dealer B', AccountNumber = 'D002')); 
        accounts.add(new Account(Name = 'Test Dealer C', AccountNumber = 'D003')); 
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
        // If no-argument constructor sets default values, did assert those here.
        PayeeDistributionWrapper defaultWrapper = new PayeeDistributionWrapper();

        // Assert that the object was created (not null)
        System.assertNotEquals(null, defaultWrapper, 'Default constructor should create a non-null object.');
        // If had default values, e.g., index = 0, did assert:
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
        
        // Query test dealer accounts for exclusion
        List<Account> testDealers = [SELECT Id FROM Account WHERE Name IN ('Test Dealer A', 'Test Dealer B') ORDER BY Name ASC];
        List<String> excludedDealerIds = new List<String>();
        for(Account acc : testDealers) {
            excludedDealerIds.add(acc.Id);
        }
        String expectedExcludedDealerIdsString = String.join(excludedDealerIds, ',');


        List<PayeeDistributionWrapper> wrappers = new List<PayeeDistributionWrapper>();
        wrappers.add(new PayeeDistributionWrapper(1, 'Test Payee Account 1', payee1.Id, 75, 'P123', dist1.Id));

        String classificationCode = 'Test-Class-001';
        Date testStartDate = Date.today(); // Use valid dates
        Date testEndDate = Date.today().addDays(30);

        Test.startTest();
        MassClientFeeDistributionController.processDistributions(
            classificationCode,
            excludedDealerIds, // Pass the list of excluded dealer IDs
            product.Id,
            product.Fee_Type__c,
            null, // endDateOpen (not used in this update scenario)
            testStartDate,
            testEndDate,
            null, // feeAmountEnd (not used in this update scenario)
            500.00, // feeAmountNew
            wrappers
        );        
        Test.stopTest();


        // Verification
        Payee_Distribution__c updatedDist = [SELECT Id, Classification_Code__c, Product__c, Fee_Amount__c, Start_Date__c, End_Date__c, Name, Excluded_Dealer_Ids__c, Fee_Type__c FROM Payee_Distribution__c WHERE Id = :dist1.Id];
 		
        System.assertEquals(classificationCode, updatedDist.Classification_Code__c, 'Classification Code should be updated.');
        System.assertEquals(product.Id, updatedDist.Product__c, 'Product ID should be updated.');
        System.assertEquals(product.Fee_Type__c, updatedDist.Fee_Type__c, 'Fee Type should be updated.');
        System.assertEquals(500.00, updatedDist.Fee_Amount__c, 'Fee Amount should be updated.');
        System.assertEquals(testStartDate, updatedDist.Start_Date__c, 'Start Date should be updated.');
        System.assertEquals(testEndDate, updatedDist.End_Date__c, 'End Date should be updated.');
        System.assertEquals(classificationCode, updatedDist.Name, 'Name should be updated to Classification Code.');
        System.assertEquals(expectedExcludedDealerIdsString, updatedDist.Excluded_Dealer_Ids__c, 'Excluded Dealer IDs field should contain the comma-separated string of provided IDs.');

        // Verify that no new records were created if wrappers only contained existing IDs
        System.assertEquals(1, [SELECT COUNT() FROM Payee_Distribution__c], 'Only one Payee_Distribution__c record should exist after update.');
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
    
     /**
     * Test case for the getDealers method.
     * Verifies that the method returns the expected Account records (dealers).
     */
    @isTest
    static void testGetDealers_Success() {
        Test.startTest();
        List<Account> resultDealers = MassClientFeeDistributionController.getDealers();
        Test.stopTest();

        // Using System.assert for null check as previously corrected
        System.assert(resultDealers != null, 'The result list should not be null.');

        List<String> expectedDealerNames = new List<String>();
        expectedDealerNames.add('Test Dealer A');
        expectedDealerNames.add('Test Dealer B');
        expectedDealerNames.add('Test Dealer C');
        expectedDealerNames.sort();
        
         // Extract actual dealer names from the result
        List<String> actualDealerNames = new List<String>();
        for (Account dealer : resultDealers) {
            actualDealerNames.add(dealer.Name);
        }
		// Verify that all expected dealer names are present in the actual returned names.
        // This allows for 'resultDealers' to contain additional dealers not explicitly defined in 'expectedDealerNames'.
        Set<String> expectedNamesSet = new Set<String>(expectedDealerNames);
        Set<String> actualNamesSet = new Set<String>(actualDealerNames);
        
        System.assert(actualNamesSet.containsAll(expectedNamesSet), 'The returned dealers should contain all expected dealer names.');

    }
    
    // Helper to get a fake Id for negative testing
    private static Id getFakeId() {
        String prefix = Payee_Distribution__c.SObjectType.getDescribe().getKeyPrefix();
        return Id.valueOf(prefix + '0'.repeat(12));

    }
}