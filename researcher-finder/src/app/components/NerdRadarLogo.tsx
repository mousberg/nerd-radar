"use client"

import { useState, useEffect } from "react"

export default function NerdRadarLogo() {
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsScanning((prev) => !prev)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background blur elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>

      {/* Main logo container with glassmorphic effect */}
      <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl">
        <div className="flex items-center space-x-8">
          {/* Glassmorphic Radar Circle */}
          <div className="relative w-32 h-32">
            {/* Outer glass circles */}
            <div className="absolute inset-0 border-2 border-white/30 rounded-full backdrop-blur-sm bg-white/5"></div>
            <div className="absolute inset-3 border border-white/40 rounded-full backdrop-blur-sm bg-white/10"></div>
            <div className="absolute inset-6 border border-white/50 rounded-full backdrop-blur-sm bg-white/15"></div>

            {/* Center glowing dot */}
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400/50 animate-pulse"></div>

            {/* Radar sweep line with glow */}
            <div
              className={`absolute top-1/2 left-1/2 w-16 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-transparent origin-left transform -translate-y-1/2 transition-transform duration-2000 ease-in-out shadow-lg shadow-cyan-400/30 ${
                isScanning ? "rotate-360" : "rotate-0"
              }`}
              style={{ filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))" }}
            ></div>

            {/* Floating detection dots with glow */}
            <div className="absolute top-4 right-8 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <div className="absolute bottom-6 left-10 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-500 shadow-lg shadow-blue-400/50"></div>
            <div className="absolute top-10 left-4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-1000 shadow-lg shadow-purple-400/50"></div>

            {/* Subtle grid lines */}
            <div className="absolute top-1/2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-y-1/2"></div>
            <div className="absolute top-2 bottom-2 left-1/2 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent transform -translate-x-1/2"></div>
          </div>

          {/* Glassmorphic Text Container */}
          <div className="flex flex-col space-y-2">
            <div className="backdrop-blur-sm bg-white/5 border border-white/20 rounded-2xl px-6 py-3">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-mono tracking-wider">
                NERD
              </h1>
            </div>
            <div className="backdrop-blur-sm bg-white/5 border border-white/20 rounded-2xl px-6 py-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent font-mono tracking-widest">
                RADAR
              </h2>
            </div>

            {/* Status indicators */}
            <div className="flex space-x-2 justify-center pt-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300 shadow-lg shadow-blue-400/50"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-600 shadow-lg shadow-purple-400/50"></div>
            </div>
          </div>
        </div>

        {/* Scanning pulse effect */}
        <div
          className={`absolute -inset-1 border border-cyan-400/30 rounded-3xl transition-all duration-1000 ${
            isScanning ? "opacity-100 scale-105" : "opacity-0 scale-100"
          }`}
          style={{ filter: "drop-shadow(0 0 20px rgba(34, 211, 238, 0.3))" }}
        ></div>

        {/* Inner glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
      <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping delay-1000"></div>
      <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-2000"></div>
    </div>
  )
} 