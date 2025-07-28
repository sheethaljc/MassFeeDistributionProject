import { LightningElement, track, wire } from 'lwc';
import getInitialData from '@salesforce/apex/MassClientFeeDistributionController.getInitialData';
import processDistributions from '@salesforce/apex/MassClientFeeDistributionController.processDistributions';
import getPayeeDistributionWrapper from '@salesforce/apex/MassClientFeeDistributionController.getPayeeDistributionWrapper';
import acccountId from "@salesforce/schema/Account.Id";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const columns = [
    { label: '#', fieldName: 'index', type: 'number', initialWidth: 50 },
    { label: 'Payee Name', fieldName: 'payeeName', type: 'text' },
    { label: 'Payee Number', fieldName: 'payeeNumber', type: 'text' },
    { label: 'Allocation Percentage', fieldName: 'allocationPercentage', type: 'percent-fixed', typeAttributes: { maximumFractionDigits: 2 } },
    { type: 'action', typeAttributes: { rowActions: [{ label: 'Delete', name: 'delete' }] } } // Edit is no longer needed as records are saved
];

export default class MassClientFeeDistribution extends LightningElement {
    // Main form properties
    @track classificationCode = '';
    @track productCode = '';
    @track feeType = '';
    @track startDateNew = null;
    @track endDateNew = null;
    @track feeAmountNew = null;

    // Table and modal properties
    @track payeeDistributions = [];
    @track feeTypeOptions = [];
    @track productOptions = [];
    @track isModalOpen = false;
    @track columns = columns;
    @track totalAllocation = 0;
    @track modalErrorMessage = ''; // To show error Message in modal window


    // Properties to hold data for the current modal submission
    currentAllocationValue = 0;
    currentPayeeId = null;
    nextIndex = 1;

    @wire(getInitialData)
    wiredInitialData({ data, error }) {
        if (data) {
            this.productOptions = data.map(item => ({ label: item.Name, value: item.Id }));
            this.feeTypeOptions = [...new Set(data.map(item => item.Fee_Type__c))].map(item => ({ label: item, value: item }));
        } else if (error) {
            console.log('Error', 'Failed to load initial data.', 'error');
        }
    }

    handleInputChange(event) {
        // Generic handler for all main form inputs
        const field = event.target.name;
        this[field] = event.target.value;
    }

    openModal() {
        this.isModalOpen = true;
        // Reset temporary values for the new modal entry
        this.currentAllocationValue = 0;
        this.currentPayeeId = null;
        this.modalErrorMessage = '';

    }

    closeModal() {
        this.isModalOpen = false;
        this.modalErrorMessage = '';

    }

    // --- Modal and Record-Edit-Form Handlers ---

    handlePayeeLookupChange(event) {
        // Store the selected Payee ID when the lookup value changes
        this.currentPayeeId = event.detail.value[0];
    }

    handleAllocationChange(event) {
        // Store the allocation percentage when it changes
        this.currentAllocationValue = event.detail.value;
    }

    handleSubmitInModal(event) {
                
        console.log('Handle Submit in Model');

        event.preventDefault(); // Stop the standard form submission

        this.modalErrorMessage = '';
        const newAllocation = parseFloat(this.currentAllocationValue) || 0;

        // FIX: Instead of calling showToast, set the modalErrorMessage property
        if (!this.currentPayeeId) {
            this.modalErrorMessage = 'You must select a Payee.';
            return;
        }
        if (newAllocation <= 0) {
            this.modalErrorMessage = 'Allocation Percentage must be a positive number.';
            return;
        }
        console.log('New Allocation:', newAllocation);
        console.log('Current Allocation:', this.totalAllocation);
        if ((this.totalAllocation + newAllocation) > 100) {
            this.modalErrorMessage = 'Total allocation cannot exceed 100%.';
            return;
        }

        // Manually create the fields object to pass to the form submission
        const fields = event.detail.fields;
        // We can add more fields here if needed for the save operation
        // For example: fields.Start_Date__c = this.startDateNew;

        // If validation passes, submit the form programmatically
        this.template.querySelector('lightning-record-edit-form').submit(fields);
    }

    handleSuccess(event) {
        console.log('Handle Success');

        const newRecordId = event.detail.id;

        getPayeeDistributionWrapper({
            recordId: newRecordId,
            index: this.nextIndex
        })
            .then(wrapperResult => {
                this.payeeDistributions = [...this.payeeDistributions, wrapperResult];
                this.nextIndex++;
                this.recalculateTotal();
                this.showToast('Success', 'Payee Distribution Saved and Added to Table', 'success'); // Changed message
            })
            .catch(error => {
                this.showToast('Error', this.getErrorMessage(error), 'error'); // Use getErrorMessage
            });

        this.closeModal();
    }

    // --- Table and Final Submission Handlers ---

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'delete') {
            this.payeeDistributions = this.payeeDistributions.filter(item => item.index !== row.index);
            this.recalculateTotal();
        }
    }

    recalculateTotal() {
        // The allocation percentage from the wrapper is a whole number (e.g., 70), so divide by 100 for calculation
        this.totalAllocation = this.payeeDistributions.reduce((total, current) => total + (current.allocationPercentage), 0);
                
        console.log('recalculateTotal: New totalAllocation (decimal):', this.totalAllocation);

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
    }

   handleSubmit() {
    console.log('Handle Submit');
        // Final validation for the main form
        if (!this.classificationCode || !this.productCode || !this.feeType || !this.startDateNew || !this.feeAmountNew) {
            this.showToast('Error', 'Please fill in all required fields on the main form.', 'error');
            return;
        }
        if (this.payeeDistributions.length === 0) {
            this.showToast('Error', 'You must add at least one Payee Distribution.', 'error');
            return;
        }
    console.log('Handle Submit processDistributions');

        // Call the final processing method in Apex
        processDistributions({
            classificationCode: this.classificationCode,
            excludedDealerIds: [],
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
            console.log('Handle Submit Success');
            this.showToast('Success', 'Mass Client Fee Distributions have been submitted for processing.', 'success');
            this.handleCancel(); // Clear the form for the next use
        })
        .catch(error => {
                            
            console.log('Handle Submit Error :', error.body.message, 'error');

            this.showToast('Error', error.body.message, 'error');
        });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({ title, message, variant });
        this.dispatchEvent(event);
    }
}