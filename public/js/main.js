const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})

const socket = io();

socket.emit("joinRoom", {username, room});

socket.on("roomUsers", ({room, users}) => {
    outputRoomName(room);
    outputUsers(users);
})

socket.on("message", message => {
    console.log(message);
    outputMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

const recordBtn = document.getElementById("record-btn");
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    recordBtn.addEventListener("click", () => {
        if (!isRecording) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.innerText = "Stop Recording";

                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        audioChunks = [];
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = () => {
                            const base64AudioMessage = reader.result.split(',')[1];
                            socket.emit("voiceMessage", base64AudioMessage);
                        };
                    };
                });
        } else {
            mediaRecorder.stop();
            isRecording = false;
            recordBtn.innerText = "Start Recording";
        }
    });
}


socket.on("voiceMessage", message => {
    console.log("Voice message received:", message);
    
    if (!isRecording) {
        const audioBlob = new Blob([Uint8Array.from(atob(message.message), c => c.charCodeAt(0))], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const div = document.createElement("div");
        div.classList.add("message");
        div.innerHTML = `<p class="meta">${message.username} <span>${message.time}</span></p>
                         <audio controls src="${audioUrl}" id="audio-${message.id}"></audio>`;
        document.querySelector(".chat-messages").appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const playButton = document.getElementById(`audio-${message.id}`);
        playButton.addEventListener('play', () => {
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(element => {
                if (element !== playButton) {
                    element.pause();
                }
            });
        });
    }
});

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = e.target.elements.msg.value;
    socket.emit("chatMessage", msg);
    e.target.elements.msg.value = "";
    e.target.elements.msg.focus();
})

function outputMessage(message) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.innerHTML = `<p class="meta">${message.username} <span>${message.time}</span></p>
    <p class="text">
        ${message.text}
    </p>`;
    document.querySelector(".chat-messages").appendChild(div);
}

function outputRoomName(room) {
    roomName.innerText = room;
}

function outputUsers(users) {
    userList.innerHTML = `
        ${users.map(user => `<li>${user.username}</li>`).join("")}
    `
}
