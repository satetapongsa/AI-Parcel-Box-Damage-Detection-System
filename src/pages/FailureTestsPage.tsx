import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Play, 
  CheckCircle2
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { FAILURE_TEST_SCENARIOS } from '../data/mockData';

export const FailureTestsPage: React.FC = () => {
  const { runFailureTest } = useSimulation();

  const [activeRunningId, setActiveRunningId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; details: string }>>({});

  const handleExecuteTest = async (testId: string) => {
    setActiveRunningId(testId);
    const res = await runFailureTest(testId);
    setTestResults((prev) => ({ ...prev, [testId]: res }));
    setActiveRunningId(null);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
            <AlertOctagon className="w-6 h-6 text-amber-400" />
            <span>Failure Case Simulation Lab</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1">
            Simulate system failure scenarios & edge boundary conditions for engineering validation
          </p>
        </div>

        <div className="text-xs font-mono bg-sky-500/10 border border-sky-500/30 text-sky-400 px-3.5 py-2 rounded-lg font-bold">
          Capstone Engineering Validation Suite
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FAILURE_TEST_SCENARIOS.map((scenario) => {
          const isRunning = activeRunningId === scenario.id;
          const result = testResults[scenario.id];

          return (
            <div
              key={scenario.id}
              className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-4 font-mono text-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#26344A] pb-2">
                  <h3 className="font-bold text-white text-sm">{scenario.title}</h3>
                  <span className="text-[10px] text-sky-400 px-2 py-0.5 rounded bg-[#172235] border border-[#26344A]">
                    {scenario.simulatedDamage}
                  </span>
                </div>

                <p className="text-[#94A3B8] text-xs leading-relaxed font-sans">
                  {scenario.description}
                </p>

                <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A] space-y-1">
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">
                    Expected Validation Criterion:
                  </span>
                  <p className="text-emerald-400 font-semibold text-xs">
                    {scenario.expectedResult}
                  </p>
                </div>

                {/* Test execution steps */}
                <div className="space-y-1 text-[11px] text-slate-300">
                  <span className="text-[#94A3B8] text-[10px] uppercase font-bold block">Execution Sequence:</span>
                  {scenario.testSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-sky-400 font-bold">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action & Result Box */}
              <div className="pt-4 border-t border-[#26344A] space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    disabled={isRunning}
                    onClick={() => handleExecuteTest(scenario.id)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center space-x-2 shadow-lg"
                  >
                    {isRunning ? (
                      <>
                        <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        <span>TEST RUNNING...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>RUN TEST</span>
                      </>
                    )}
                  </button>

                  {result && (
                    <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-xs flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>VALIDATION PASSED</span>
                    </span>
                  )}
                </div>

                {result && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-sans leading-relaxed animate-in fade-in">
                    <strong className="block font-mono text-emerald-400 mb-1 uppercase">
                      Test Output & Response Log:
                    </strong>
                    {result.details}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
