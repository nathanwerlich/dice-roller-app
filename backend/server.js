// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://dice-roller-app-three.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = {};

// AQUI ESTÁ A MUDANÇA: Lista de dados permitidos
const allowedDice = [4, 6, 8, 10, 12, 20];

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on("createRoom", ({ name }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.join(roomId);

    rooms[roomId] = {
      users: [{ id: socket.id, name }],
      history: [],
    };

    socket.emit("roomCreated", { roomId, history: rooms[roomId].history });
    console.log(`Sala ${roomId} criada por ${name}`);
  });

  socket.on("joinRoom", ({ roomId, name }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].users.push({ id: socket.id, name });
      socket.to(roomId).emit("userJoined", { name });
      socket.emit("updateHistory", rooms[roomId].history);
      console.log(`${name} entrou na sala ${roomId}`);
    } else {
      socket.emit("error", { message: "Sala não encontrada" });
    }
  });

  // AQUI ESTÁ A MUDANÇA: O evento agora recebe 'dieType'
  socket.on("rollDice", ({ roomId, name, dieType }) => {
    // Validação para garantir que é um tipo de dado válido
    if (rooms[roomId] && allowedDice.includes(dieType)) {
      const diceValue = Math.floor(Math.random() * dieType) + 1;

      const newRoll = {
        user: name,
        value: diceValue,
        dieType: dieType, // Salva o tipo do dado rolado
        timestamp: new Date(),
      };

      rooms[roomId].history.push(newRoll);

      io.to(roomId).emit("newRoll", newRoll);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

const PORT = 3001;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
