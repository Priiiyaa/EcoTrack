document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('carbonForm');
  const resultModal = document.getElementById('resultModal');
  const closeModal = document.getElementById('closeModal');

  // Quote-related code starts here
  const quotes = [
    {
      text: "The greatest threat to our planet is the belief that someone else will save it.",
      author: "Robert Swan"
    },
    {
      text: "We won’t have a society if we destroy the environment.",
      author: "Margaret Mead"
    },
    {
      text: "What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves and to one another.",
      author: "Mahatma Gandhi"
    },
    {
      text: "The Earth does not belong to us: we belong to the Earth.",
      author: "Marlee Matlin"
    },
    {
      text: "Nature provides a free lunch, but only if we control our appetites.",
      author: "William Ruckelshaus"
    }
  ];

  let currentQuoteIndex = 0;

  // Function to update the quote
  function updateQuote() {
    const quoteElement = document.getElementById("quote");
    const authorElement = document.getElementById("author");
    const currentQuote = quotes[currentQuoteIndex];
    
    quoteElement.textContent = `"${currentQuote.text}"`;
    authorElement.textContent = `- ${currentQuote.author}`;
    
    currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length; 
  }
  
  // Initial call to set the first quote
  updateQuote();
  
  // Change quote every 10 seconds
  setInterval(updateQuote, 5000);
  

  // Handle form submission
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(form);

    // Perform AJAX call to the server
    fetch('/log', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }

      // Populate modal with result data
      document.getElementById('resultActivity').textContent = `Activity: ${data.activity}`;
      document.getElementById('resultAmount').textContent = `Amount: ${data.amount}`;
      document.getElementById('resultCarbonEmission').textContent = `Carbon Emission: ${data.carbonEmission} kg CO2`;
      
      // Display uploaded image
      // document.getElementById('uploadedImage').src = data.file;
      // document.getElementById('uploadedImage').alt = 'Uploaded Image';

      // Show the modal
      resultModal.style.display = 'block';

      form.reset();
    })
    .catch(error => console.error('Error:', error));
  });

  console.log("running")

  // Close the modal when '×' is clicked
  closeModal.onclick = function() {
    resultModal.style.display = 'none';
  };

  // Close the modal when clicking outside of it
  window.onclick = function(event) {
    if (event.target == resultModal) {
      resultModal.style.display = 'none';
    }
  };
});
