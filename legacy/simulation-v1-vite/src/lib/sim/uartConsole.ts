export interface UartLogEntry {
  id: string;
  time: string;
  direction: 'TX' | 'RX';
  message: string;
}

export const INITIAL_UART_LOGS: UartLogEntry[] = [
  { id: '1', time: '08:00:00', direction: 'RX', message: 'ESP32 Parcel Sorting System Ready (UART @ 115200 baud)' },
  { id: '2', time: '08:00:01', direction: 'RX', message: 'Enter 1=PASS, 2=WAIT, 3=FAIL' },
  { id: '3', time: '08:00:02', direction: 'RX', message: 'Ready for digital I/O triggers.' }
];
