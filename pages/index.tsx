import Head from "next/head";
import dynamic from "next/dynamic";

const PingPongGame = dynamic(() => import("../components/PingPongGame"), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Modern Ping Pong</title>
        <meta name="description" content="Modern Ping Pong Game - Play solo or with a friend!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-col items-center justify-center py-8">
        <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-6">
          🏓 Modern Ping Pong
        </h1>
        <PingPongGame />
        <footer className="mt-10 text-white/70">
          <a href="https://github.com/mathpunch/pingpong" target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
        </footer>
      </main>
    </>
  );
}
