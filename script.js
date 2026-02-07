let btn = document.querySelector("#btn")
let content = document.querySelector("#content")
let voice = document.querySelector("#voice")

function speak(text){
    let text_speak = new SpeechSynthesisUtterance(text)
    text_speak.rate = 1
    text_speak.pitch = 1
    text_speak.volume = 1
    text_speak.lang = "en-GB"
    window.speechSynthesis.speak(text_speak)
} 

function wishMe(){
    let day = new Date()
    let hours = day.getHours()
    if(hours >= 0 && hours < 12){
        speak("Good Morning Sir. I am your virtual assisstant.")
    }
    else if(hours >= 12 && hours < 16){
        speak("Good afternoon Sir. I am your virtual assisstant.")
    }
    else{
        speak("Good evening Sir. I am your virtual assisstant.")
    }
}
window.addEventListener("load", ()=>{
    wishMe()
})

let speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
let recognition = new speechRecognition()
recognition.onresult = (event) => {
    let currentIndex = event.resultIndex
    let transcript = event.results[currentIndex][0].transcript
    content.innerHTML = "🗣️" + transcript
    takeCommand(transcript.toLowerCase())
}
btn.addEventListener("click", () => {
    recognition.start()
    btn.style.display = "none"
    voice.style.display = "block"
})

function takeCommand(message){
    btn.style.display = "flex"
    voice.style.display = "none"
    if(message.includes("hello") || message.includes("hi") || message.includes("hey")){
        speak("Hello Sir. How can I help you?")
    }
    else if(message.includes("who are you")){
        speak("I am your Virtual Assisstant. I am developed by Awais Raza")
    }
    else if(message.includes("open calculator")){
        speak("Opening calculator")
        window.open("https://www.online-calculator.com/full-screen-calculator/", "_blank")
    }
    else if(message.includes("time")){
        let time = new Date().toLocaleString(undefined, {hour:"numeric", minute:"numeric"})
        speak("The time is " + time)
    }
    else if(message.includes("date")){
        let date = new Date().toLocaleString(undefined, {day:"numeric", month:"short"})
        speak("Today's date is " + date)
    }
    else if(message.includes("open youtube")){
        speak("Opening Youtube")
        window.open("https://www.youtube.com/", "_blank")
    }
    else if(message.includes("open google")){
        speak("Opening Google")
        window.open("https://www.google.com/", "_blank")
    }
    else if(message.includes("open chat gpt")){
        speak("Opening chatgpt")
        window.open("https://chatgpt.com/", "_blank")
    }
    else if(message.includes("open instagram")){
        speak("Opening Instagram")
        window.open("https://www.instagram.com/?hl=en", "_blank")
    }
    else if(message.includes("open facebook")){
        speak("Opening Facebook")
        window.open("https://www.facebook.com/", "_blank")
    }
    else if(message.includes("open snapchat")){
        speak("Opening Snapchat")
        window.open("https://www.snapchat.com/", "_blank")
    }
    else{
        let msg = message.replace(/awais|owais/gi, "").trim()
        let finalText = "This is what I found on Internet regarding " + msg
        speak(finalText)
        window.open(`https://www.google.com/search?q=${encodeURIComponent(msg)}`)
    }
}