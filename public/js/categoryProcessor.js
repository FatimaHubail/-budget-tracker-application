// public/js/transactionForm.js
// Shared logic for the New and Edit Transaction forms

document.addEventListener('DOMContentLoaded', () => {
    const categorySelect = document.getElementById('category-choice');
    const hiddenCategoryInput = document.getElementById('category');
    const newCategoryInput = document.getElementById('newCategory');
    const newCategoryWrapper = document.getElementById('new-category-wrapper');
    const typeRadios = document.querySelectorAll('input[name="type"]');
    const form = document.getElementById('transaction-form');

    if (!categorySelect) return;

    const allOptions = Array.from(categorySelect.options);

    function filterCategoriesByType(type, preserveSelection = false) {
        categorySelect.disabled = false;
        const currentValue = categorySelect.value;

        allOptions.forEach(option => {
            const matches = option.dataset.type === type || option.value === '';
            option.hidden = !matches;
        });

        if (preserveSelection && currentValue) {
            categorySelect.value = currentValue;
        } else {
            categorySelect.value = '';
        }

        toggleNewCategoryInput();
    }

    function toggleNewCategoryInput() {
        const selectedOption = categorySelect.options[categorySelect.selectedIndex];
        const isGenericOther = selectedOption && selectedOption.value === 'other';
        newCategoryWrapper.style.display = isGenericOther ? 'block' : 'none';
        if (!isGenericOther) newCategoryInput.value = '';
    }

    typeRadios.forEach(radio => {
        radio.addEventListener('change', () => filterCategoriesByType(radio.value));
    });

    categorySelect.addEventListener('change', toggleNewCategoryInput);

    // right before submitting, translate the visible select into the real hidden fields
    if (form) {
        form.addEventListener('submit', () => {
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];

            if (!selectedOption) return;

            if (selectedOption.value === 'other') {
                // brand new custom category typed by the user
                hiddenCategoryInput.value = 'other';
                // newCategoryInput already holds what the user typed
            } else if (selectedOption.dataset.custom === 'true') {
                // an already-saved custom category was picked directly from the dropdown
                hiddenCategoryInput.value = 'other';
                newCategoryInput.value = selectedOption.value;
            } else {
                // a fixed category
                hiddenCategoryInput.value = selectedOption.value;
                newCategoryInput.value = '';
            }
        });
    }

    // on initial page load (edit page): filter by the already-checked type and keep the saved category selected
    const checkedType = document.querySelector('input[name="type"]:checked');
    if (checkedType) {
        filterCategoriesByType(checkedType.value, true);
    }
});
