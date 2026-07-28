const typingElement = document.getElementById("typing-text");
const textArray = ["Infrastructure Engineer","Cardist","Game Dev","Runner","DevOps Engineer","Vim enthusiast","Networking Specialist","Juggler", "Intermediate Cook", "Photography Novice", "Yo-Yo beginner", "Family's IT guy", "Trackball fan"];
let currentItems = []
let currentWord = "";
let charIndex = 0;
const typeSpeed = 65
const typedTimeout = 1500
const eraseSpeed = 25
const eraseTimeout = 400


function getNextItem() {
    if(currentItems.length === 0) {
        currentItems = [...textArray]
        currentWord = ""
    }
    var newItem  = Math.floor(Math.random()*currentItems.length);
    currentWord = currentItems[newItem]
    currentItems.splice(newItem, 1)
}


function typeText() {
    if(currentWord === "") {
        getNextItem()
    }
    //Type next letter
    if (charIndex < currentWord.length) {
        typingElement.textContent += currentWord[charIndex];
        ++charIndex;
        setTimeout(typeText, typeSpeed);
    } else {
        //Wait to display it for some time
        setTimeout(eraseText, typedTimeout);
    }
}

function eraseText() {
    if (charIndex > 0) {
        typingElement.textContent = currentWord.substring(0, charIndex - 1);
        --charIndex;
        setTimeout(eraseText, eraseSpeed);
    } else {
        getNextItem();
        setTimeout(typeText, eraseTimeout);
    }
}

typeText();
