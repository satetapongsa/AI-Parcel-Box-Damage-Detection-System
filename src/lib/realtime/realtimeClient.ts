import { useSimulation } from '../../context/SimulationContext';

export function useRealtimeEvents() {
  const { 
    latestParcel, 
    timelineEvents, 
    anomalies, 
    dataSourceMode, 
    setDataSourceMode, 
    connectionHealth,
    generateParcel 
  } = useSimulation();

  return {
    latestParcel,
    timelineEvents,
    anomalies,
    dataSourceMode,
    setDataSourceMode,
    connectionHealth,
    triggerScan: generateParcel
  };
}
