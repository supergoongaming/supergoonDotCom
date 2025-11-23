const typingElement = document.getElementById("typing-text");
const textArray = ["Infrastructure Engineer","Cardist","Game Dev","Runner","DevOps Engineer","Vim enthusiast","Networking Specialist","Juggler", "Intermediate Cook", "Photography Novice", "Yo-Yo beginner", "Family's IT guy", "Trackball fan"];
let textIndex = 0;
let charIndex = 0;
const typeSpeed = 65
const typedTimeout = 1500
const eraseSpeed = 25
const eraseTimeout = 400


function getNextItem() {
    var currentIndex = textIndex;
    while (currentIndex == textIndex) {
        textIndex  = Math.floor(Math.random()*textArray.length);
        // Source - https://stackoverflow.com/a
        // Posted by Kelly, modified by community. See post 'Timeline' for change history
        // Retrieved 2025-11-22, License - CC BY-SA 4.0
    }
}


function typeText() {
    if (charIndex < textArray[textIndex].length) {
        typingElement.textContent += textArray[textIndex][charIndex];
        ++charIndex;
        setTimeout(typeText, typeSpeed);
    } else {
        setTimeout(eraseText, typedTimeout);
    }
}

function eraseText() {
    if (charIndex > 0) {
        typingElement.textContent = textArray[textIndex].substring(0, charIndex - 1);
        --charIndex;
        setTimeout(eraseText, eraseSpeed);
    } else {
        getNextItem();
        setTimeout(typeText, eraseTimeout);
    }
}

typeText();
