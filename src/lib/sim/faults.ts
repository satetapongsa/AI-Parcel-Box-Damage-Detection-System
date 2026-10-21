export interface FaultState {
  wanDisconnected: boolean;
  visionFaultDark: boolean;
  beltJam: boolean;
  dropSideCamera: boolean;
  actuatorFault: boolean;
  barcodeScanFail: boolean;
  cloudResponseFault: 'NONE' | 'AUTH_401' | 'MALFORMED_422' | 'SERVER_500' | 'RATE_LIMIT_429';
  weakAiModel: boolean;
}

export const INITIAL_FAULTS: FaultState = {
  wanDisconnected: false,
  visionFaultDark: false,
  beltJam: false,
  dropSideCamera: false,
  actuatorFault: false,
  barcodeScanFail: false,
  cloudResponseFault: 'NONE',
  weakAiModel: false
};
