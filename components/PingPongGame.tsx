import React, { useRef, useEffect, useState } from "react";

type Mode = "single" | "multi";

interface PlayerSettings {
  color: string;
}

const PADDLE_WIDTH = 12, PADDLE_HEIGHT = 80, BALL_SIZE = 16, FIELD_W = 700, FIELD_H = 400;
const PADDLE_SPEED = 6, BALL_SPEED = 6, AI_SPEED = 4;
const COLORS = ["#38bdf8", "#f472b6", "#facc15", "#4ade80", "#f87171", "#c084fc"];
const POWERUPS = [
  { type: "big-paddle", label: "Big Paddle!", color: "#facc15" },
  { type: "fast-ball", label: "Fast Ball!", color: "#f87171" }
] as const;
type PowerupType = typeof POWERUPS[number]["type"];

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  active: boolean;
}

function randomPowerup(): Powerup {
  const p = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  return {
    x: Math.random() * (FIELD_W - 40) + 20,
    y: Math.random() * (FIELD_H - 40) + 20,
    type: p.type,
    active: true
  };
}

export default function PingPongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [player1, setPlayer1] = useState<PlayerSettings>({ color: COLORS[0] });
  const [player2, setPlayer2] = useState<PlayerSettings>({ color: COLORS[1] });
  const [highScore, setHighScore] = useState<number>(() => Number(localStorage.getItem("pingpong-hs") || 0));
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [showMenu, setShowMenu] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  // Sounds
  const hitSound = useRef<HTMLAudioElement | null>(null);
  const scoreSound = useRef<HTMLAudioElement | null>(null);
  const powerupSound = useRef<HTMLAudioElement | null>(null);

  // Game state refs
  const state = useRef<any>({
    left: FIELD_H / 2 - PADDLE_HEIGHT / 2,
    right: FIELD_H / 2 - PADDLE_HEIGHT / 2,
    ball: { x: FIELD_W / 2, y: FIELD_H / 2, dx: -BALL_SPEED, dy: BALL_SPEED },
    vel: { left: 0, right: 0 },
    powerup: null as Powerup | null,
    bigLeft: false,
    bigRight: false,
    fastBall: false,
    lastScorer: null as "left" | "right" | null
  });

  // Controls
  useEffect(() => {
    if (!mode) return;
    const keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };
    const down = (e: KeyboardEvent) => {
      if (e.key === "w") keys.w = true;
      if (e.key === "s") keys.s = true;
      if (e.key === "ArrowUp") keys.ArrowUp = true;
      if (e.key === "ArrowDown") keys.ArrowDown = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "w") keys.w = false;
      if (e.key === "s") keys.s = false;
      if (e.key === "ArrowUp") keys.ArrowUp = false;
      if (e.key === "ArrowDown") keys.ArrowDown = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let animation: number;
    let frame = () => {
      // Move paddles
      if (keys.w) state.current.left -= PADDLE_SPEED;
      if (keys.s) state.current.left += PADDLE_SPEED;
      if (mode === "multi") {
        if (keys.ArrowUp) state.current.right -= PADDLE_SPEED;
        if (keys.ArrowDown) state.current.right += PADDLE_SPEED;
      }
      // Clamp
      state.current.left = Math.max(0, Math.min(FIELD_H - (state.current.bigLeft ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT), state.current.left));
      state.current.right = Math.max(0, Math.min(FIELD_H - (state.current.bigRight ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT), state.current.right));

      // AI movement
      if (mode === "single") {
        const target = state.current.ball.y - ((state.current.bigRight ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT) / 2) + BALL_SIZE / 2;
        if (state.current.right + 10 < target) state.current.right += AI_SPEED;
        if (state.current.right - 10 > target) state.current.right -= AI_SPEED;
        state.current.right = Math.max(0, Math.min(FIELD_H - (state.current.bigRight ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT), state.current.right));
      }

      // Ball movement
      let { x, y, dx, dy } = state.current.ball;
      let paddleL = { x: 0, y: state.current.left, w: PADDLE_WIDTH, h: state.current.bigLeft ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT };
      let paddleR = { x: FIELD_W - PADDLE_WIDTH, y: state.current.right, w: PADDLE_WIDTH, h: state.current.bigRight ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT };

      x += dx;
      y += dy;

      // Wall bounce
      if (y < 0) { y = 0; dy = -dy; hitSound.current?.play(); }
      if (y + BALL_SIZE > FIELD_H) { y = FIELD_H - BALL_SIZE; dy = -dy; hitSound.current?.play(); }

      // Paddle bounce
      if (
        x < paddleL.x + paddleL.w &&
        y + BALL_SIZE > paddleL.y &&
        y < paddleL.y + paddleL.h &&
        dx < 0
      ) {
        x = paddleL.x + paddleL.w;
        dx = -dx * 1.04;
        dy += (y + BALL_SIZE / 2 - (paddleL.y + paddleL.h / 2)) * 0.15;
        hitSound.current?.play();
      }
      if (
        x + BALL_SIZE > paddleR.x &&
        y + BALL_SIZE > paddleR.y &&
        y < paddleR.y + paddleR.h &&
        dx > 0
      ) {
        x = paddleR.x - BALL_SIZE;
        dx = -dx * 1.04;
        dy += (y + BALL_SIZE / 2 - (paddleR.y + paddleR.h / 2)) * 0.15;
        hitSound.current?.play();
      }

      // Powerup collision
      if (state.current.powerup && state.current.powerup.active) {
        const pu = state.current.powerup;
        if (
          x < pu.x + 24 &&
          x + BALL_SIZE > pu.x &&
          y < pu.y + 24 &&
          y + BALL_SIZE > pu.y
        ) {
          if (pu.type === "big-paddle") {
            if (dx < 0) state.current.bigLeft = true;
            else state.current.bigRight = true;
            setTimeout(() => { state.current.bigLeft = false; state.current.bigRight = false; }, 6000);
          }
          if (pu.type === "fast-ball") {
            state.current.fastBall = true;
            setTimeout(() => { state.current.fastBall = false; }, 5000);
          }
          pu.active = false;
          powerupSound.current?.play();
        }
      }

      // Goal
      if (x < -BALL_SIZE) {
        // right scores
        setScore((s) => {
          const n = { ...s, right: s.right + 1 };
          if (n.right > highScore) {
            setHighScore(n.right);
            localStorage.setItem("pingpong-hs", n.right + "");
          }
          return n;
        });
        scoreSound.current?.play();
        state.current = {
          ...state.current,
          left: FIELD_H / 2 - PADDLE_HEIGHT / 2,
          right: FIELD_H / 2 - PADDLE_HEIGHT / 2,
          ball: { x: FIELD_W / 2, y: FIELD_H / 2, dx: BALL_SPEED, dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) },
          bigLeft: false, bigRight: false,
          fastBall: false,
          powerup: null,
        };
        state.current.lastScorer = "right";
        // End condition
        if (score.right + 1 >= 7) { setGameOver(true); setShowMenu(true); return; }
        animation = requestAnimationFrame(frame);
        return;
      }
      if (x > FIELD_W + BALL_SIZE) {
        // left scores
        setScore((s) => {
          const n = { ...s, left: s.left + 1 };
          if (n.left > highScore) {
            setHighScore(n.left);
            localStorage.setItem("pingpong-hs", n.left + "");
          }
          return n;
        });
        scoreSound.current?.play();
        state.current = {
          ...state.current,
          left: FIELD_H / 2 - PADDLE_HEIGHT / 2,
          right: FIELD_H / 2 - PADDLE_HEIGHT / 2,
          ball: { x: FIELD_W / 2, y: FIELD_H / 2, dx: -BALL_SPEED, dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) },
          bigLeft: false, bigRight: false,
          fastBall: false,
          powerup: null,
        };
        state.current.lastScorer = "left";
        if (score.left + 1 >= 7) { setGameOver(true); setShowMenu(true); return; }
        animation = requestAnimationFrame(frame);
        return;
      }

      // Ball speedups
      if (state.current.fastBall) {
        dx *= 1.03;
        dy *= 1.03;
      }

      state.current.ball = { x, y, dx, dy };

      // Powerup generation
      if (!state.current.powerup || !state.current.powerup.active) {
        if (Math.random() < 0.003) state.current.powerup = randomPowerup();
      }

      draw();

      animation = requestAnimationFrame(frame);
    };

    let draw = () => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      // Animated background
      ctx.clearRect(0, 0, FIELD_W, FIELD_H);
      for (let i = 0; i < FIELD_H; i += 32) {
        ctx.fillStyle = `rgba(255,255,255,${(0.06 + Math.sin(Date.now() / 800 + i)) * 0.1})`;
        ctx.fillRect(FIELD_W / 2 - 2, i, 4, 16);
      }
      // Powerup
      if (state.current.powerup && state.current.powerup.active) {
        const pu = state.current.powerup;
        ctx.fillStyle = pu.type === "big-paddle" ? "#facc15" : "#f87171";
        ctx.beginPath();
        ctx.arc(pu.x + 12, pu.y + 12, 12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = "12px Segoe UI";
        ctx.fillStyle = "#fff";
        ctx.fillText(pu.type === "big-paddle" ? "BIG" : "FAST", pu.x - 2, pu.y + 32);
      }
      // Paddles
      ctx.fillStyle = player1.color;
      ctx.fillRect(0, state.current.left, PADDLE_WIDTH, state.current.bigLeft ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT);
      ctx.fillStyle = player2.color;
      ctx.fillRect(FIELD_W - PADDLE_WIDTH, state.current.right, PADDLE_WIDTH, state.current.bigRight ? PADDLE_HEIGHT * 1.7 : PADDLE_HEIGHT);
      // Ball
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(state.current.ball.x + BALL_SIZE / 2, state.current.ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, 2 * Math.PI);
      ctx.fill();
      // Scores
      ctx.font = "32px Segoe UI";
      ctx.fillStyle = "#fff";
      ctx.fillText(String(score.left), FIELD_W / 2 - 80, 50);
      ctx.fillText(String(score.right), FIELD_W / 2 + 50, 50);
    };

    animation = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(animation);
    };
  }, [mode, player1.color, player2.color, highScore, score.left, score.right]);

  // Reset game
  function startGame(m: Mode) {
    setMode(m);
    setScore({ left: 0, right: 0 });
    state.current = {
      left: FIELD_H / 2 - PADDLE_HEIGHT / 2,
      right: FIELD_H / 2 - PADDLE_HEIGHT / 2,
      ball: { x: FIELD_W / 2, y: FIELD_H / 2, dx: m === "single" ? -BALL_SPEED : BALL_SPEED, dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) },
      vel: { left: 0, right: 0 },
      powerup: null,
      bigLeft: false, bigRight: false,
      fastBall: false,
      lastScorer: null
    };
    setGameOver(false);
    setShowMenu(false);
  }

  return (
    <div className="rounded-lg bg-black/30 shadow-lg p-5 flex flex-col items-center">
      <audio ref={hitSound} src="/sounds/hit.wav" preload="auto" />
      <audio ref={scoreSound} src="/sounds/score.wav" preload="auto" />
      <audio ref={powerupSound} src="/sounds/powerup.wav" preload="auto" />
      {showMenu ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="mb-2 text-xl text-white">High Score: <span className="font-bold">{highScore}</span></div>
          <div className="flex gap-4">
            <div>
              <div className="text-white mb-1">Player 1</div>
              <div className="flex gap-1">{COLORS.map(c => (
                <button key={c} style={{ background: c }} className={`w-7 h-7 rounded-full border-2 ${player1.color === c ? 'border-white' : 'border-black/20'}`}
                  onClick={() => setPlayer1({ color: c })}
                />
              ))}</div>
            </div>
            <div>
              <div className="text-white mb-1">Player 2</div>
              <div className="flex gap-1">{COLORS.map(c => (
                <button key={c} style={{ background: c }} className={`w-7 h-7 rounded-full border-2 ${player2.color === c ? 'border-white' : 'border-black/20'}`}
                  onClick={() => setPlayer2({ color: c })}
                />
              ))}</div>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <button className="px-6 py-2 bg-cyan-500 rounded font-bold text-white shadow hover:bg-cyan-400" onClick={() => startGame("single")}>Singleplayer</button>
            <button className="px-6 py-2 bg-pink-500 rounded font-bold text-white shadow hover:bg-pink-400" onClick={() => startGame("multi")}>Multiplayer</button>
          </div>
          {gameOver && (
            <div className="mt-4 text-2xl font-bold text-yellow-300 animate-bounce">
              Game Over!
            </div>
          )}
          <div className="text-white/70 mt-2">
            <div>W/S = Player 1 &nbsp; | &nbsp; Up/Down = Player 2</div>
            <div>First to 7 wins!</div>
          </div>
          <div className="text-white/60 mt-3 text-xs">Powerups: Big Paddle, Fast Ball, Paddle Colors, Animated BG, Sound FX</div>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={FIELD_W}
            height={FIELD_H}
            className="rounded bg-black border-2 border-white shadow-lg"
            style={{ margin: "0 auto", display: "block" }}
          />
          <button className="mt-4 px-5 py-2 bg-white/80 rounded shadow text-black font-bold hover:bg-white/60" onClick={() => setShowMenu(true)}>
            Pause / Menu
          </button>
        </>
      )}
    </div>
  );
}
