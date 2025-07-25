import { LightningElement, track, wire } from 'lwc';
import getInitialData from '@salesforce/apex/MassClientFeeDistributionController.getInitialData';
import processDistributions from '@salesforce/apex/MassClientFeeDistributionController.processDistributions';
import getAccountDetailsById from '@salesforce/apex/MassClientFeeDistributionController.getAccountDetailsById';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// This defines the structure of the data table that will display the payee distributions. Each object in the array represents a column:
const columns = [
    { label: '#', fieldName: 'index', type: 'number' },
    { label: 'Payee Name', fieldName: 'payeeName', type: 'text' },
    { label: 'Payee Number', fieldName: 'payeeNumber', type: 'text' },
    { label: 'Allocation Percentage', fieldName: 'allocationPercentage', type: 'percent' },
    { type: 'action', typeAttributes: { rowActions: [{ label: 'Edit', name: 'edit' }, { label: 'Delete', name: 'delete' }] } }
];

export default class MassClientFeeDistribution extends LightningElement {

    @track classificationCode
    @track productCode;
    @track feeType;
    @track startDateNew;
    @track endDateNew;
    @track startDateOpen;
    @track endDateOpen;
    @track feeAmountNew;
    @track feeAmountEnd;

    @track payeeDistributions = [];
    @track feeTypeOptions = [];
    @track productOptions = [];

    @track isModalOpen = false;
    @track columns = columns;
    @track currentPayee = {};
    @track totalAllocation = 0;


    nextIndex = 1;

    @wire(getInitialData)
    wiredInitialData({ data, error }) {
        if (data) {
            this.productOptions = data.map(item => ({ label: item.Name, value: item.Id })); // Populates productOptions
            this.feeTypeOptions = [...new Set(data.map(item => item.Fee_Type__c))].map(item => ({ label: item, value: item })); // Populates feeTypeOptions
            console.log('Wired initial data received:', JSON.stringify(data)); // Added log
            console.log('Product Options:', JSON.stringify(this.productOptions)); // Added log
            console.log('Fee Type Options:', JSON.stringify(this.feeTypeOptions)); // Added log
        } else if (error) {
            console.error('Error in wiredInitialData:', error); // Added error log
            this.showToast('Error', error.body.message, 'error');
        }
    }

    handleInputChange(event) {
        this[event.target.name] = event.target.value;
        console.log('Input changed for:', event.target.name, 'New value:', event.target.value);
    }

    openModal() {
        this.isModalOpen = true;
        this.currentPayee = { index: this.nextIndex, allocationPercentage: 0 };
        console.log('Modal opened. Current Payee initialized:', JSON.stringify(this.currentPayee));
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handlePayeeLookupChange(event) {
        const selectedId = event.detail.value && event.detail.value.length > 0 ? event.detail.value[0] : null;

        this.currentPayee.payeeId = selectedId; // Assign the extracted string ID
        console.log('handlePayeeLookupChange: Selected Payee ID:', this.currentPayee.payeeId);

        // When using lightning-input-field, you might need to query Apex again to get Name/AccountNumber
        // based on the selected ID, or pass additional data from parent component if available.
        // For simplicity, let's assume we fetch name/number based on ID after selection.

        this.fetchPayeeDetails(selectedId); // Call a new method to get payee details
    }

    async fetchPayeeDetails(payeeId) {
        if (!payeeId) {
            this.currentPayee.payeeName = null;
            this.currentPayee.payeeNumber = null;
            return;
        }
        try {
            // You'll need a new Apex method in your controller/DAO to get account details by ID
            // Example: MassClientFeeDistributionController.getAccountDetailsById(payeeId)
            const accountDetails = await getAccountDetailsById({ accountId: payeeId });
            if (accountDetails) {
                this.currentPayee.payeeName = accountDetails.Name;
                this.currentPayee.payeeNumber = accountDetails.AccountNumber;
                console.log('fetchPayeeDetails: Fetched payee details:', JSON.stringify(this.currentPayee));
            }
        } catch (error) {
            console.error('fetchPayeeDetails: Error fetching payee details:', JSON.stringify(error));
            this.showToast('Error', 'Error fetching payee details: ' + this.getErrorMessage(error), 'error');
        }
    }

    /*

    // Handler for the payee search input
    handlePayeeSearchInputChange(event) {
        this.searchTermForPayees = event.target.value;
        console.log('handlePayeeSearchInputChange: Search term:', this.searchTermForPayees);

        // Implement debounce to limit Apex calls
        clearTimeout(this.debouncedSearchTimeout);
        if (this.searchTermForPayees.length >= 2) { // Only search after 2 characters
            this.debouncedSearchTimeout = setTimeout(() => {
                this.performPayeeSearch();
            }, 300); // 300ms debounce
        } else {
            this.payeeOptions = []; // Clear options if search term is too short
            // Clear selected payee if search term is empty or too short
            this.currentPayee.payeeId = null;
            this.currentPayee.payeeName = null;
            this.currentPayee.payeeNumber = null;
        }
    }

    // Async method to call Apex for payee search
    async performPayeeSearch() {
        try {
            console.log('performPayeeSearch: Calling Apex searchPayees with term:', this.searchTermForPayees);
            const result = await searchPayees({ searchTerm: this.searchTermForPayees });
            console.log('performPayeeSearch: Apex searchPayees result:', JSON.stringify(result));

            // Map the Account records to the format required by lightning-combobox
            this.payeeOptions = result.map(payee => ({
                label: payee.Name + (payee.AccountNumber ? ' (' + payee.AccountNumber + ')' : ''), // Show name and number
                value: payee.Id,
                accountNumber: payee.AccountNumber // Store account number for later use
            }));
            console.log('performPayeeSearch: payeeOptions populated:', JSON.stringify(this.payeeOptions));

        } catch (error) {
            console.error('performPayeeSearch: Error calling Apex searchPayees:', JSON.stringify(error));
            this.showToast('Error', 'Error searching payees: ' + this.getErrorMessage(error), 'error');
            this.payeeOptions = []; // Clear options on error
        }
    }

    handlePayeeChange(event) {
        const selectedPayeeId = event.detail.value;
        console.log('handlePayeeChange: Selected Payee Id:', selectedPayeeId);

        const selectedPayee = this.payeeOptions.find(p => p.value === selectedPayeeId);

        if (selectedPayee) {
            this.currentPayee.payeeId = selectedPayee.value;
            this.currentPayee.payeeName = selectedPayee.label; // Label now includes name + number
            this.currentPayee.payeeNumber = selectedPayee.accountNumber;
            console.log('handlePayeeChange: currentPayee updated:', JSON.stringify(this.currentPayee));
        } else {
            console.warn('handlePayeeChange: Selected payee not found in options for ID:', selectedPayeeId);
        }
    }

    */

    handlePayeeInputChange(event) {
        this.currentPayee.allocationPercentage = event.target.value;

        console.log('handlePayeeInputChange allocationPercentage : ', this.currentPayee.allocationPercentage);

    }

    submitAction() {
        console.log('Action Submit');
        this.isModalOpen = false;
        this.isModalOpenAddPayee = false;
        this.currentPayee.index = this.nextIndex;
        this.nextIndex++;
        // this.payeeDistributions.push(this.currentPayee);
        // this.recalculateTotal();
        // this.currentPayee = { ...this.currentPayeeDefaults };

        console.log('Action Submit: Payee distributions:', JSON.stringify(this.payeeDistributions));

    }
    handleSavePayee() {

        console.log('Action Submit Of Payee : Adding new payee distribution:', JSON.stringify(this.currentPayee));


        // 1. Validate Payee selection
        if (!this.currentPayee.payeeId) {
            this.showToast('Error', 'Please select a Payee for the distribution.', 'error');
            return;
        }

        // 2. Validate Allocation Percentage is a valid number and positive
        const newAllocation = parseFloat(this.currentPayee.allocationPercentage);

        if (isNaN(newAllocation) || newAllocation <= 0) {
            this.showToast('Error', 'Allocation Percentage must be a positive number.', 'error');
            return;
        }
        // --- END: Added Validation ---

        const totalAllocationVal = (this.totalAllocation + newAllocation);

        console.log('HandleSavePayee totalAllocation:', this.totalAllocation);
        console.log('HandleSavePayee valid Allocation:', totalAllocationVal);
        console.log('HandleSavePayee newAllocation:', newAllocation);

        if (totalAllocationVal > 100) {


            console.log('Total allocation cannot exceed 100%');

            this.showToast('Error', 'Total allocation cannot exceed 100%', 'error');
            return;
        }

        console.log('Debugging findIndex: currentPayee.index:', this.currentPayee.index);
        console.log('Debugging findIndex: payeeDistributions content:', JSON.stringify(this.payeeDistributions));


        const existingIndex = this.payeeDistributions.findIndex(item => item.index === this.currentPayee.index);
        if (existingIndex > -1) {

            console.log('handleSavePayee existingIndex > -1 ');

            // Update existing payee distribution
            this.payeeDistributions[existingIndex] = { ...this.currentPayee };
        } else {
            console.log('handleSavePayee Add new payee distribution ');

            // Add new payee distribution
            this.payeeDistributions.push({ ...this.currentPayee });
            this.nextIndex++;
        }


        console.log('handleSavePayee before recalculateTotal ');


        this.recalculateTotal();
        this.closeModal();

        console.log('handleSavePayee: Payee distributions:', JSON.stringify(this.payeeDistributions));
    }

    handleRowAction(event) {

        const action = event.detail.action;
        const row = event.detail.row;
        switch (action.name) {
            case 'edit':
                this.currentPayee = row;
                this.isModalOpen = true;
                break;

            case 'delete':
                this.payeeDistributions = this.payeeDistributions.filter(item => item.index !== row.index);
                this.recalculateTotal();
                break;
        }

    }

    recalculateTotal() {
        console.log('Recalculate Total allocationPercentage : ', currentValue.allocationPercentage);

        this.totalAllocation = this.payeeDistributions.reduce((total, currentValue) => total + currentValue.allocationPercentage, 0);

        console.log('Recalculate Total  totalAllocation: ', this.totalAllocation);

    }


    handleCancel() {
        // Reset all fields
        this.classificationCode = '';
        this.productCode = '';
        this.feeType = '';
        this.endDateOpen = '';
        this.startDateNew = '';
        this.endDateNew = '';
        this.feeAmountEnd = '';
        this.feeAmountNew = '';
        this.payeeDistributions = [];
        this.recalculateTotal();
    }

    handleSubmit() {
        // Basic validation
        if (!this.classificationCode || !this.productCode || !this.feeType || !this.startDateNew || !this.feeAmountNew) {
            this.showToast('Error', 'Please fill in all required fields', 'error');
            return;
        }

        processDistributions({
            classificationCode: this.classificationCode,
            excludedDealerIds: [], // Add logic for excluded dealers
            productId: this.productCode,
            feeType: this.feeType,
            endDateOpen: this.endDateOpen,
            startDateNew: this.startDateNew,
            endDateNew: this.endDateNew,
            feeAmountEnd: this.feeAmountEnd,
            feeAmountNew: this.feeAmountNew,
            payeeDistributions: this.payeeDistributions
        }).then(() => {
            this.handleCancel();
            this.showToast('Success', 'Distributions created successfully', 'success')
        }).catch(error => {
            this.showToast('Error', error.body.message, 'error');
        });



    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }


}