function toggleDarkMode() {
    document.body.classList.toggle("light-mode");
}

function getPage(location, changeLocation, closeFunc) {
    // fetch(location, { cache: 'force-cache' })
    fetch(location, { cache: 'no-cache' })
        .then(response => response.text())
        .then(html => {
            document.getElementById(changeLocation).innerHTML = html;
            closeFunc();
        })
        .catch(error => console.error('Error loading:', location, changeLocation, error));
}

document.getElementById("year").textContent = new Date().getFullYear();

function toggleView(pressedButton) {
    let projectsSection = document.getElementById("projects-section");
    let blogsSection = document.getElementById("blogs-section");
    if (pressedButton === 'projects') {
        getPage('projects/projects.html', 'projects-section', () => {
            projectsSection.style.display = "block";
            blogsSection.style.display = "none";
        })
    } else {
        getPage('blogs/2025/blog.html', 'blogs-section', () => {
            projectsSection.style.display = "none";
            blogsSection.style.display = "block";
        })
    }
}

document.onload(toggleView('projects'))

