"use client"

import { useState, useEffect } from "react"

export default function NerdRadarHeaderLogo() {
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsScanning((prev) => !prev)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full">
      {/* Wide Glassmorphic Island */}
      <div className="relative backdrop-blur-xl bg-gradient-to-r from-white/15 via-white/10 to-white/15 border border-white/30 rounded-3xl px-8 py-4 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:bg-gradient-to-r hover:from-white/20 hover:via-white/15 hover:to-white/20 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Compact Radar Circle */}
            <div className="relative w-12 h-12">
              {/* Outer glass circles */}
              <div className="absolute inset-0 border-2 border-white/30 rounded-full backdrop-blur-sm bg-white/10"></div>
              <div className="absolute inset-1 border border-white/40 rounded-full backdrop-blur-sm bg-white/15"></div>
              <div className="absolute inset-2 border border-white/50 rounded-full backdrop-blur-sm bg-white/20"></div>

              {/* Center glowing dot */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400/50 animate-pulse"></div>

              {/* Radar sweep line with glow */}
              <div
                className={`absolute top-1/2 left-1/2 w-6 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-transparent origin-left transform -translate-y-1/2 transition-transform duration-2000 ease-in-out shadow-lg shadow-cyan-400/30 ${
                  isScanning ? "rotate-360" : "rotate-0"
                }`}
                style={{ filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))" }}
              ></div>

              {/* Floating detection dots with glow */}
              <div className="absolute top-1 right-2 w-1 h-1 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <div className="absolute bottom-2 left-3 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-500 shadow-lg shadow-blue-400/50"></div>
              <div className="absolute top-3 left-1 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-1000 shadow-lg shadow-purple-400/50"></div>

              {/* Subtle grid lines */}
              <div className="absolute top-1/2 left-1 right-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-y-1/2"></div>
              <div className="absolute top-1 bottom-1 left-1/2 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent transform -translate-x-1/2"></div>

              {/* Scanning pulse effect */}
              <div
                className={`absolute -inset-0.5 border border-cyan-400/30 rounded-full transition-all duration-1000 ${
                  isScanning ? "opacity-100 scale-110" : "opacity-0 scale-100"
                }`}
                style={{ filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.3))" }}
              ></div>
            </div>

            {/* Compact Text */}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-mono tracking-wider">
                NERD
              </h1>
              <h2 className="text-sm font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent font-mono tracking-widest -mt-1">
                RADAR
              </h2>
            </div>
          </div>

          {/* Right side - Status indicators */}
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-300 shadow-lg shadow-blue-400/50"></div>
            <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-600 shadow-lg shadow-purple-400/50"></div>
          </div>
        </div>

        {/* Inner glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-400/5 pointer-events-none"></div>
        
        {/* Outer glow ring */}
        <div
          className={`absolute -inset-1 border border-cyan-400/20 rounded-3xl transition-all duration-1000 ${
            isScanning ? "opacity-100 scale-102" : "opacity-50 scale-100"
          }`}
          style={{ filter: "drop-shadow(0 0 16px rgba(34, 211, 238, 0.2))" }}
        ></div>
      </div>

      {/* Floating shadow base */}
      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 rounded-3xl blur-xl opacity-60"></div>
    </div>
  )
} 