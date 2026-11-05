export const SPDI_TOPICS = {
  inspection: (stationId: string = 'SORT-01') => `spdi/${stationId}/inspection`,
  alerts: (stationId: string = 'SORT-01') => `spdi/${stationId}/alerts`,
  sensors: (stationId: string = 'SORT-01') => `spdi/${stationId}/sensors`,
  actuator: (stationId: string = 'SORT-01') => `spdi/${stationId}/actuator`,
  system: (stationId: string = 'SORT-01') => `spdi/${stationId}/system`,
};
