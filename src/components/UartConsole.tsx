import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Terminal, Send } from 'lucide-react';

export const UartConsole: React.FC = () => {
  const { uartLogs, sendUartCmd } = useSimulation();
  const [selectedCmd, setSelectedCmd] = useState<'1' | '2' | '3'>('1');

  const handleSend = () => {
    sendUartCmd(selectedCmd);
  };

  return (
    <div className="bg-[#0B1528] border border-cyan-950/70 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
            ESP32 UART Console
          </h2>
        </div>
        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-mono px-2 py-0.5 rounded">
          ESP32 UART / 115200 BAUD
        </span>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 bg-black/80 border border-slate-800 rounded-lg p-3 font-mono text-[11px] overflow-y-auto max-h-[170px] space-y-1">
        {uartLogs.map((log) => (
          <div key={log.id} className="flex space-x-2">
            <span className="text-slate-600 select-none">[{log.time}]</span>
            <span className={log.direction === 'TX' ? 'text-cyan-400 font-bold' : 'text-emerald-400'}>
              {log.direction === 'TX' ? '>>' : '<<'} {log.message}
            </span>
          </div>
        ))}
      </div>

      {/* Command Dispatcher (1=PASS, 2=WAIT, 3=FAIL) */}
      <div className="mt-3 flex items-center space-x-2">
        <select
          value={selectedCmd}
          onChange={(e) => setSelectedCmd(e.target.value as '1' | '2' | '3')}
          className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="1">1 : PASS (Green LED)</option>
          <option value="2">2 : WAIT (Yellow LED)</option>
          <option value="3">3 : FAIL / REJECT (Red LED + Solenoid)</option>
        </select>

        <button
          onClick={handleSend}
          className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium px-3 py-1.5 rounded transition shadow"
        >
          <Send className="w-3 h-3" />
          <span>TX Send</span>
        </button>
      </div>
    </div>
  );
};
