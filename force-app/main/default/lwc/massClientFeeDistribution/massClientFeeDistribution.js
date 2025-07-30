import { LightningElement, track, wire } from 'lwc';
import getInitialData from '@salesforce/apex/MassClientFeeDistributionController.getInitialData';
import processDistributions from '@salesforce/apex/MassClientFeeDistributionController.processDistributions';
import getPayeeDistributionWrapper from '@salesforce/apex/MassClientFeeDistributionController.getPayeeDistributionWrapper';
import getDealers from '@salesforce/apex/MassClientFeeDistributionController.getDealers';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const columns = [
    { label: '#', fieldName: 'index', type: 'number', initialWidth: 50 },
    { label: 'Payee Name', fieldName: 'payeeName', type: 'text' },
    { label: 'Payee Number', fieldName: 'payeeNumber', type: 'text' },
    { label: 'Allocation Percentage', fieldName: 'allocationPercentage', type: 'percent-fixed', typeAttributes: { maximumFractionDigits: 2 } },
    { type: 'action', typeAttributes: { rowActions: [{ label: 'Delete', name: 'delete' }] } }
];

export default class MassClientFeeDistribution extends LightningElement {
    // Main form properties
    @track classificationCode = '';
    @track productCode = '';
    @track feeType = '';
    @track startDateNew = null;
    @track endDateNew = null;
    @track feeAmountNew = null;
    @track endDateOpen = null; // Ensure this is also tracked if used
    @track feeAmountEnd = null; // Ensure this is also tracked if used

    // Table and modal properties
    @track payeeDistributions = [];
    @track feeTypeOptions = [];
    @track productOptions = [];
    @track isModalOpen = false;
    @track columns = columns;
    @track totalAllocation = 0;
    @track modalErrorMessage = ''; // To show error Message in modal window
    @track mainErrorMessage =''; // To show error Message in main window

    // Excluded Dealers property
    @track excludedDealers = [];
    @track dealerOptions = [];

    // Properties to hold data for the current modal submission
    currentAllocationValue = 0;
    currentPayeeId = null;
    nextIndex = 1;

    @wire(getInitialData)
    wiredInitialData({ data, error }) {
        if (data) {
            console.log('Wired initial data received successfully.');
            this.productOptions = data.map(item => ({ label: item.Name, value: item.Id }));
            this.feeTypeOptions = [...new Set(data.map(item => item.Fee_Type__c))].map(item => ({ label: item, value: item }));
        } else if (error) {
            console.error('Error loading initial data for product and fee type options:', this.getErrorMessage(error));
            this.showToast('Error', 'Failed to load initial setup data. Please try refreshing the page.', 'error');
        }
    }

    @wire(getDealers)
    wiredDealers({ data, error }) {
        if (data) {
            console.log('Wired dealer data received successfully.');
            this.dealerOptions = data.map(item => ({ label: item.Name, value: item.Id }));
        } else if (error) {
            console.error('Error loading excluded dealer options:', this.getErrorMessage(error));
            this.showToast('Error', 'Failed to load dealer options for exclusion. Please try refreshing the page.', 'error');
        }
    }

    handleExcludedDealersChange(event) {
        this.excludedDealers = event.detail.value;
        this.mainErrorMessage = ''; // Clear main error message on input change
        console.log('Excluded Dealers selected:', this.excludedDealers);
    }

    handleInputChange(event) {
        const field = event.target.name;
        this[field] = event.target.value;
        this.mainErrorMessage = ''; // Clear main error message on input change
        console.log(`Input field '${field}' changed to:`, this[field]);
    }

    openModal() {
        this.isModalOpen = true;
        this.currentAllocationValue = 0;
        this.currentPayeeId = null;
        this.modalErrorMessage = '';
        console.log('Payee Distribution modal opened.');
    }

    closeModal() {
        this.isModalOpen = false;
        this.modalErrorMessage = '';
        console.log('Payee Distribution modal closed.');
    }

    handlePayeeLookupChange(event) {
        this.currentPayeeId = event.detail.value[0];
        console.log('Payee selected in modal:', this.currentPayeeId);
    }

    handleAllocationChange(event) {
        this.currentAllocationValue = event.detail.value;
        console.log('Allocation Percentage entered in modal:', this.currentAllocationValue);
    }

    handleSubmitInModal(event) {
        console.log('Attempting to submit Payee Distribution from modal...');
        event.preventDefault(); // Stop the standard form submission

        this.modalErrorMessage = '';
        const newAllocation = parseFloat(this.currentAllocationValue) || 0;

        if (!this.currentPayeeId) {
            this.modalErrorMessage = 'Please select a Payee for this distribution.';
            console.warn('Modal Validation: Payee not selected.');
            return;
        }
        if (newAllocation <= 0) {
            this.modalErrorMessage = 'Allocation Percentage must be a positive number.';
            console.warn('Modal Validation: Allocation Percentage is not positive.');
            return;
        }
        console.log(`Current total allocation: ${this.totalAllocation}%, New allocation to add: ${newAllocation}%`);
        if ((this.totalAllocation + newAllocation) > 100) {
            this.modalErrorMessage = `Total allocation cannot exceed 100%. Current total: ${this.totalAllocation}%, Attempted new: ${newAllocation}%.`;
            console.warn('Modal Validation: Total allocation exceeds 100%.');
            return;
        }

        const fields = event.detail.fields;
        console.log('Modal validation passed. Submitting record-edit-form...');
        this.template.querySelector('lightning-record-edit-form').submit(fields);
    }

    handleSuccess(event) {
        const newRecordId = event.detail.id;
        console.log('Payee Distribution record successfully created with ID:', newRecordId);

        getPayeeDistributionWrapper({
            recordId: newRecordId,
            index: this.nextIndex
        })
            .then(wrapperResult => {
                this.payeeDistributions = [...this.payeeDistributions, wrapperResult];
                this.nextIndex++;
                this.recalculateTotal();
                this.showToast('Success', 'Payee Distribution added to the table.', 'success');
                console.log('Payee Distribution added to local table:', wrapperResult);
            })
            .catch(error => {
                console.error('Error fetching wrapper for new Payee Distribution:', this.getErrorMessage(error));
                this.showToast('Error', 'Failed to add Payee Distribution to table: ' + this.getErrorMessage(error), 'error');
            });

        this.closeModal();
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        console.log(`Action '${actionName}' performed on row with index: ${row.index}`);

        if (actionName === 'delete') {
            this.payeeDistributions = this.payeeDistributions.filter(item => item.index !== row.index);
            this.recalculateTotal();
            this.showToast('Info', `Payee Distribution for ${row.payeeName} removed.`, 'info');
            console.log('Payee Distribution removed from table.');
        }
    }

    recalculateTotal() {
        this.totalAllocation = this.payeeDistributions.reduce((total, current) => total + (current.allocationPercentage), 0);
        console.log('Total Allocation recalculated:', this.totalAllocation + '%');
    }

    handleCancel() {
        // Reset all fields
        this.classificationCode = '';
        this.productCode = '';
        this.feeType = '';
        this.endDateOpen = null;
        this.startDateNew = null;
        this.endDateNew = null;
        this.feeAmountEnd = null;
        this.feeAmountNew = null;
        this.payeeDistributions = [];
        this.totalAllocation = 0;
        this.nextIndex = 1;
        this.excludedDealers = [];
        this.mainErrorMessage = '';
        console.log('Form fields have been reset.');
    }

    validateDates() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

        const startDate = this.startDateNew ? new Date(this.startDateNew) : null;
        const endDate = this.endDateNew ? new Date(this.endDateNew) : null;

        if (startDate && startDate < today) {
            this.mainErrorMessage = 'The "Start date for new allocations" must be today or a future date.';
            console.warn('Date Validation Failed: Start date is in the past.');
            return false;
        }

        if (startDate && endDate && endDate <= startDate) {
            this.mainErrorMessage = 'The "End date for new allocations" must be after the "Start date for new allocations".';
            console.warn('Date Validation Failed: End date is not after start date.');
            return false;
        }
        console.log('Date validations passed.');
        return true;
    }

    handleSubmit() {
        this.mainErrorMessage = ''; // Clear previous errors before new validation
        console.log('Attempting to submit Mass Client Fee Distribution form...');

        // Final validation for the main form
        if (!this.classificationCode || !this.productCode || !this.feeType || !this.startDateNew || !this.feeAmountNew) {
            this.mainErrorMessage = 'Please ensure all required fields (Classification Code, Product Code, Fee Type, Start Date and Fee amount for new allocations) are filled.';
            console.warn('Main Form Validation Failed: Required fields missing.');
            return;
        }
        if (this.payeeDistributions.length === 0) {
            this.mainErrorMessage = 'You must add at least one Payee Distribution to proceed.';
            console.warn('Main Form Validation Failed: No Payee Distributions added.');
            return;
        }
        
        if (!this.validateDates()) {
            console.warn('Main Form Validation Failed: Date validation failed.');
            return; // Stop submission if date validation fails (message already set by validateDates)
        }

        console.log('All client-side validations passed. Calling Apex method processDistributions...');

        processDistributions({
            classificationCode: this.classificationCode,
            excludedDealerIds: this.excludedDealers,
            productId: this.productCode,
            feeType: this.feeType,
            endDateOpen: this.endDateOpen,
            startDateNew: this.startDateNew,
            endDateNew: this.endDateNew,
            feeAmountEnd: this.feeAmountEnd,
            feeAmountNew: this.feeAmountNew,
            payeeDistributions: this.payeeDistributions
        })
            .then(() => {
                console.log('Apex method processDistributions completed successfully.');
                this.showToast('Success', 'Mass Client Fee Distributions have been successfully submitted for processing.', 'success');
                this.handleCancel(); // Clear the form for the next use
            })
            .catch(error => {
                const errorMessage = this.getErrorMessage(error);
                console.error('Error calling Apex method processDistributions:', errorMessage);
                this.showToast('Error', 'An error occurred during submission: ' + errorMessage, 'error');
            });
    }

    showToast(title, message, variant) {
        console.log(`Displaying Toast: Title='${title}', Message='${message}', Variant='${variant}'`);
        const event = new ShowToastEvent({ title, message, variant });
        this.dispatchEvent(event);
    }

    getErrorMessage(error) {
        let message = 'An unexpected error occurred.';
        if (error) {
            if (error.body && error.body.message) {
                message = error.body.message;
            } else if (typeof error.message === 'string') {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            }
        }
        return message;
    }
}