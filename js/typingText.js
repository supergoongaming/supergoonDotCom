const typingElement = document.getElementById("typing-text");
const textArray = ["Infrastructure Engineer", "Game Developer", "DevOps Engineer", "Tech Tinkerer", "Networking Specialist"];

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
        setTimeout(typeText, 500);
    }
}

typeText();
