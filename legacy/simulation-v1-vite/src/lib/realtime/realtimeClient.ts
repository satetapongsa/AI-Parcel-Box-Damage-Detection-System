import { useSimulation } from '../../context/SimulationContext';

export function useRealtimeEvents() {
  const { 
    latestParcel, 
    timelineEvents, 
    anomalies, 
    generateParcel 
  } = useSimulation();

  return {
    latestParcel,
    timelineEvents,
    anomalies,
    dataSourceMode: 'MOCK' as const,
    setDataSourceMode: () => {},
    connectionHealth: {
      ciraCore: 'CONNECTED' as const,
      mqttBroker: 'CONNECTED' as const,
      edgeBridge: 'CONNECTED' as const,
      database: 'CONNECTED' as const,
      webClient: 'CONNECTED' as const
    },
    triggerScan: generateParcel
  };
}
