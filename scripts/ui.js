// Function to clear resource checkboxes
function clearResourceCheckboxes() {
  const sidebar = document.getElementById("mySidebar");
  const resCheckboxes = sidebar.querySelectorAll(".resource-checkbox");
  resCheckboxes.forEach((checkbox) => checkbox.parentElement.remove());
}

// Function to clear trade checkboxes
function clearTradeCheckboxes() {
  const sidebar = document.getElementById("mySidebar");
  const transportCheckboxes = sidebar.querySelectorAll(".trade-checkbox");
  transportCheckboxes.forEach((checkbox) => checkbox.parentElement.remove());
}

function toggleAccordion(id) {
  var element = document.getElementById(`${id}Div`);
  var icon = document.getElementById(`${id}Icon`);

  if (element.classList.contains("w3-show")) {
    element.classList.remove("w3-show");
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  } else {
    element.classList.add("w3-show");
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  }
}

function w3_open() {
  document.getElementById("mySidebar").style.display = "block";
}

function w3_close() {
  document.getElementById("mySidebar").style.display = "none";
}

// Get the popup and button elements
const popup = document.getElementById("advancedFilterPopup");
const showPopupButton = document.getElementById("showAdvancedFilterButton");
const closePopupButton = document.getElementById("closeAdvancedFilterButton");
const applyFilterButton = document.getElementById("applyFilterButton");

// Show the popup when the button is clicked
showPopupButton.addEventListener("click", function () {
  popup.style.display = "flex";
});

// Hide the popup when the close button is clicked
closePopupButton.addEventListener("click", function () {
  popup.style.display = "none";
});

// Optionally close the popup when clicking outside of the content
window.addEventListener("click", function (event) {
  if (event.target.matches("#map") && popup.style.display == "flex") {
    popup.style.display = "none";
  }
});
