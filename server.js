const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const moment = require('moment');
const formatMessage = require("./utils/messages");
const {userJoin, getCurrentUser, getRoomUsers, userLeave} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);


const botName = "Chat";

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", socket => {
    socket.on("joinRoom", ({username, room}) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);
        socket.emit("message", formatMessage(botName, "Welcome to Chat"));
        socket.broadcast.to(user.room).emit("message", formatMessage(botName, `${user.username} has joined the chat`));
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    })

    socket.on("chatMessage", msg => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("message", formatMessage(user.username, msg));
    });

    socket.on("voiceMessage", message => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("voiceMessage", {
            username: user.username,
            time: moment().format("h:mm a"),
            message: message
        });
    });
    
    socket.on("callOffer", offer => {
        const user = getCurrentUser(socket.id);
        socket.broadcast.to(user.room).emit("callOffer", offer);
    });

    socket.on("callAnswer", answer => {
        const user = getCurrentUser(socket.id);
        socket.broadcast.to(user.room).emit("callAnswer", answer);
    });

    socket.on("iceCandidate", candidate => {
        const user = getCurrentUser(socket.id);
        socket.broadcast.to(user.room).emit("iceCandidate", candidate);
    });

    socket.on("disconnect", () => {
        const user = userLeave(socket.id);
        if (user) {
            io.to(user.room).emit("message", formatMessage(botName, `${user.username} has left the chat`));
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})