
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

function setForecastRange(show) {
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    workingDays.forEach(day => {
        const elements = document.getElementsByClassName(day);
        for (let i = 0; i < elements.length; i++) {
            if (show) {
                elements[i].classList.remove('hidden');
            } else {
                elements[i].classList.add('hidden');
            }
        }
    });

    // Remove 'active' class from all forecast range buttons
    const buttons = document.querySelectorAll('#forecastRangeSelection .btn');
    buttons.forEach(button => button.classList.remove('active'));

    // Add 'active' class to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

async function fetchFlyingPilots() {
    try {
        const response = await fetch('/pureTrack');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching flying pilots data:', error);
        throw error;
    }
}


async function displayFlyingPilots() {
    try {
        const data = await fetchFlyingPilots();
        const pilotsDiv = document.getElementById('pilotsFlying');
        pilotsDiv.innerHTML = `<div class="spinner-border text-secondary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>`; // Clear previous content
            const html = data.flyingTracks && Object.keys(data.flyingTracks).length > 0 ? 
                Object.entries(data.flyingTracks).map(([key, section]) => `
                <div>
                    <strong>${section.label ?? 'Unknown Location'}</strong>
                    <div>
                    <span><strong>${section.totalPilots ?? 'Unknown'}</strong> pilots, </span>
                    <span class="flyingPilots"><strong>${section.flyingCount ?? 'Unknown'}</strong> flying</span>
                    <span class="notFlyingPilots"><strong>${section.notFlyingCount ?? 'Unknown'}</strong> not flying</span>
                    </div>
                    <div>
                    ${section.tracks && section.tracks.length > 0 ? section.tracks.map(track => `
                        <div>
                        <span>${track.label ?? 'Someone'} is at </span>
                        <span>${track.heightFt ?? '?'}ft</span>
                        </div>
                    `).join('') : '<p>No tracks in this section</p>'}
                    </div>
                </div>
                `).join('')
                : '<p>No pilots on PureTrack :(</p>';
        
        pilotsDiv.innerHTML = html;
    } catch (error) {
        console.error('Error displaying flying pilots:', error);
        document.getElementById('pilotsFlying').innerHTML = '<p>Error loading pilot data</p>';
    }
}

// Set up periodic refresh of flying pilots data
setInterval(() => {
    displayFlyingPilots();
}, 30000);

// Call the function to display flying pilots data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    displayFlyingPilots();
});

window.addEventListener("load", function(){
  window.cookieconsent.initialise({
    palette: {
      popup: { background: "#fff", text: "#333" },
      button: { background: "#3085d6", text: "#fff" }
    },
    type: "opt-in",
    content: {
      message: "We use cookies to improve your experience and to analyse website traffic. You can accept or reject analytics cookies.",
      allow: "Accept",
      deny: "Reject",
      link: "Learn more",
      href: "/privacy-policy.html"
    },
    onInitialise: function (status) {
      if (status === cookieconsent.status.allow) {
        // User consented, load Google Analytics
        loadGoogleAnalytics();
      }
    },
    onStatusChange: function(status) {
      if (status === cookieconsent.status.allow) {
        loadGoogleAnalytics();
      }
    }
  });
});

function loadGoogleAnalytics() {
  // Paste your GA code here
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'G-7665FFDB6Q', 'auto');
  ga('send', 'pageview');
}
