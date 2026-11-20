const categorySelect = document.getElementById("question-category");
const newCategoryField = document.getElementById("new-category-field");
const newCategoryInput = document.getElementById("new-category-name");

function updateCategoryField() {
  const addingCategory = categorySelect.value === categorySelect.dataset.newOption;
  newCategoryField.hidden = !addingCategory;
  newCategoryInput.required = addingCategory;
  newCategoryInput.disabled = !addingCategory;
}

categorySelect.addEventListener("change", updateCategoryField);
updateCategoryField();
