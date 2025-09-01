// src/App.js

import React, { useState, useEffect, useRef, useMemo } from "react"; // Adicionado useMemo
import io from "socket.io-client";
import "./App.css";

const socket = io(process.env.REACT_APP_BACKEND_URL);
const diceTypes = [4, 6, 8, 10, 12, 20];

function App() {
  const [name, setName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [inRoom, setInRoom] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRoll, setLastRoll] = useState(null);
  const [selectedDie, setSelectedDie] = useState(6);
  const [isRolling, setIsRolling] = useState(false);
  const historyEndRef = useRef(null);

  // MANTIVEMOS ESTA PARTE: Calcula o total das rolagens
  const totalRolls = useMemo(() => {
    return history.reduce((sum, roll) => sum + roll.value, 0);
  }, [history]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    socket.on("roomCreated", ({ roomId, history }) => {
      setRoomId(roomId);
      setHistory(history);
      setInRoom(true);
    });

    socket.on("updateHistory", (fullHistory) => {
      setHistory(fullHistory);
      setInRoom(true);
    });

    socket.on("newRoll", (newRoll) => {
      setTimeout(() => {
        setIsRolling(false);
        setLastRoll(newRoll);
        setHistory((prevHistory) => [...prevHistory, newRoll]);
      }, 1000);
    });

    socket.on("userJoined", ({ name }) =>
      console.log(`${name} entrou na sala!`)
    );
    socket.on("error", ({ message }) => alert(message));

    return () => {
      socket.off("roomCreated");
      socket.off("updateHistory");
      socket.off("newRoll");
      socket.off("userJoined");
      socket.off("error");
    };
  }, []);

  const handleCreateRoom = () => {
    if (name) socket.emit("createRoom", { name });
    else alert("Por favor, insira seu nome.");
  };

  const handleJoinRoom = () => {
    if (name && roomIdInput) {
      setRoomId(roomIdInput.toUpperCase());
      socket.emit("joinRoom", { roomId: roomIdInput.toUpperCase(), name });
    } else {
      alert("Por favor, insira seu nome e o código da sala.");
    }
  };

  const handleRollDice = () => {
    if (!isRolling) {
      setIsRolling(true);
      setLastRoll(null);
      socket.emit("rollDice", { roomId, name, dieType: selectedDie });
    }
  };

  if (!inRoom) {
    return (
      <div className="container lobby">
        <h1>Dice Roller Online</h1>
        <input
          type="text"
          placeholder="Digite seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
        />
        <button onClick={handleCreateRoom} className="btn-primary">
          Criar Nova Sala
        </button>
        <div className="join-section">
          <input
            type="text"
            placeholder="Código da Sala"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            className="input-field"
          />
          <button onClick={handleJoinRoom} className="btn-secondary">
            Entrar na Sala
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container room">
      <header>
        <h2>
          Sala: <span>{roomId}</span>
        </h2>
        <p>
          Seu nome: <strong>{name}</strong>
        </p>
      </header>
      <main>
        <div className="dice-area">
          <div className="dice-selector">
            {diceTypes.map((die) => (
              <button
                key={die}
                className={`btn-die ${selectedDie === die ? "active" : ""}`}
                onClick={() => setSelectedDie(die)}
              >
                D{die}
              </button>
            ))}
          </div>

          {/* VOLTAMOS PARA ESTA VERSÃO DO DISPLAY DO DADO */}
          <div className="dice-display">
            <div className={`dice-value ${isRolling ? "rolling" : ""}`}>
              {lastRoll?.value || "?"}
            </div>
            <div className="dice-type">
              {lastRoll ? `(D${lastRoll.dieType})` : `(D${selectedDie})`}
            </div>
          </div>

          <button
            onClick={handleRollDice}
            className="btn-primary roll-btn"
            disabled={isRolling}
          >
            {isRolling ? "Rolando..." : `Rolar D${selectedDie}!`}
          </button>
        </div>
        <div className="history-area">
          <h3>Histórico de Rolagens</h3>
          <ul>
            {history.map((roll, index) => (
              <li key={index} className={roll.user === name ? "my-roll" : ""}>
                <strong>{roll.user}</strong> rolou <strong>{roll.value}</strong>
                <span className="history-die-type">(D{roll.dieType})</span>
              </li>
            ))}
            <div ref={historyEndRef} />
          </ul>
        </div>

        {/* MANTIVEMOS ESTA PARTE: Exibição do Total */}
        <div className="total-area">
          Total: <strong>{totalRolls}</strong>
        </div>
      </main>
    </div>
  );
}

export default App;
