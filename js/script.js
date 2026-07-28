function getPage(location, changeLocation, closeFunc) {
    fetch(location, { cache: 'no-cache' })
        .then(response => response.text())
        .then(html => {
            document.getElementById(changeLocation).innerHTML = html;
            if(closeFunc) {closeFunc()};
        })
        .catch(error => console.error('Error loading:', location, changeLocation, error));
}

//Load nav and contact
getPage("html/navbar.html", "nav")
getPage("html/contact.html", "contact", () => {
    //Load year after we have loaded
    document.getElementById("year").textContent = new Date().getFullYear();
})

