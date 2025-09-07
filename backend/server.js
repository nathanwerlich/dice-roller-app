// server.js

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
      "https://dice-roller-dno15qz3m-nathanwerlichs-projects.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = {};

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

  // AQUI ESTÁ A MUDANÇA: AGORA A LÓGICA DE SALVAR ESTÁ AQUI DENTRO
  socket.on("rollDice", async ({ roomId, name, dieType }) => {
    if (rooms[roomId] && allowedDice.includes(dieType)) {
      const diceValue = Math.floor(Math.random() * dieType) + 1;

      const newRoll = {
        user: name,
        value: diceValue,
        dieType: dieType,
        timestamp: new Date(),
      };

      // ------------------------------------------------------------------
      // NOVA LÓGICA: Salvar o dado no Supabase antes de emitir para a sala
      const { data, error } = await supabase
        .from("dice_rolls")
        .insert([
          { user_name: name, die_type: dieType, roll_value: diceValue },
        ]);

      if (error) {
        console.error("Erro ao salvar no Supabase:", error);
      } else {
        console.log("Lançamento salvo com sucesso:", data);
      }
      // ------------------------------------------------------------------

      rooms[roomId].history.push(newRoll);
      io.to(roomId).emit("newRoll", newRoll);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

// REMOVIDO: A rota POST /save-roll não é mais necessária, pois a lógica foi movida para o evento do Socket.IO.
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
