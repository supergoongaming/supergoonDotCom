function toggleDarkMode() {
    document.body.classList.toggle("light-mode");
}

function blog() {
    fetch('blog.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('blogmode').innerHTML = html;
        })
        .catch(error => console.error('Error loading blog:', error));
}

document.getElementById("year").textContent = new Date().getFullYear();

const typingElement = document.getElementById("typing-text");
const textArray = ["Infrastructure Engineer", "Game Developer", "DevOps Enthusiast"];
let textIndex = 0;
let charIndex = 0;

function typeText() {
    if (charIndex < textArray[textIndex].length) {
        typingElement.textContent += textArray[textIndex][charIndex];
        charIndex++;
        setTimeout(typeText, 100);
    } else {
        setTimeout(eraseText, 2000);
    }
}

function eraseText() {
    if (charIndex > 0) {
        typingElement.textContent = textArray[textIndex].substring(0, charIndex - 1);
        charIndex--;
        setTimeout(eraseText, 50);
    } else {
        textIndex = (textIndex + 1) % textArray.length;
        // typingElement.textContent = "&nbsp";
        setTimeout(typeText, 500);
    }
}
function toggleView() {
    let projectsSection = document.getElementById("projects-section");
    let blogsSection = document.getElementById("blogs-section");
    let toggleButton = document.getElementById("toggle-button");

    if (projectsSection.style.display === "none") {
        projectsSection.style.display = "block";
        blogsSection.style.display = "none";
        toggleButton.textContent = "Show Blogs";
    } else {
        projectsSection.style.display = "none";
        blogsSection.style.display = "block";
        toggleButton.textContent = "Show Projects";
    }
}

typeText();
