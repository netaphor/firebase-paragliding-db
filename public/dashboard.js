
        function showBlipSpot(siteData, day) {
            event.preventDefault();
            const imageSource = `https://app.stratus.org.uk/blip/graph/blip_main.php?day=${day}&tp=${siteData.turnPoint}`;
            showImageModal(imageSource);
            console.log(siteData);
        }

        function showImageModal(imageSource) {
            const carouselImages = document.getElementById('carouselImages');
            carouselImages.innerHTML = ''; // Clear previous images
            carouselImages.innerHTML = `<img src="${imageSource}" class="d-block w-100" alt="Image">`;
            const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
            imageModal.show();
        }

        function showWindSpeed(classToShow) {
            // Remove active class from all buttons
            const buttons = document.querySelectorAll('#speedUnitSelection .btn');
            buttons.forEach(button => button.classList.remove('active'));

            // Add active class to the clicked button
            const clickedButton = event.target;
            clickedButton.classList.add('active');

            const classes = ['windSpeedMph', 'windSpeedKph', 'windSpeedMs'];
            classes.forEach(function(clazz) {
            const elements = document.getElementsByClassName(clazz);
            for (let i = 0; i < elements.length; i++) {
                elements[i].classList.add('hidden');
            }
            });
            const showElements = document.getElementsByClassName(classToShow);
            for (let i = 0; i < showElements.length; i++) {
            showElements[i].classList.remove('hidden');
            }
        }
    